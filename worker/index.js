import { createAuth, requireSession } from "./lib/auth.js";
import { StripeBillingProvider } from "./lib/billing.js";
import { getConfig } from "./lib/config.js";
import { error, json, readJson } from "./lib/http.js";
import { normalizeLocale } from "./lib/locale.js";
import { billingRepository, identityRepository } from "./lib/repositories.js";
import { handleToolContract } from "./lib/tool-contract.js";

const securityHeaders = {
  "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

const isKnownApiPath = (pathname) =>
  pathname === "/api/health" ||
  pathname === "/api/offers" ||
  pathname === "/api/account" ||
  pathname === "/api/account/locale" ||
  pathname === "/api/billing/checkout" ||
  pathname === "/api/billing/portal" ||
  pathname === "/api/webhooks/stripe" ||
  pathname.startsWith("/api/auth/") ||
  pathname.startsWith("/api/tools/");

async function handleApi(request, env, executionCtx, config, url) {
  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      registrationEnabled: config.registrationEnabled,
      billingEnabled: config.billingEnabled,
    });
  }

  const toolResponse = await handleToolContract(request, env, config, url.pathname);
  if (toolResponse) return toolResponse;

  const auth = createAuth(env, config, executionCtx);
  if (url.pathname.startsWith("/api/auth/")) return auth.handler(request);

  if (url.pathname === "/api/offers" && request.method === "GET") {
    return json({ offers: await billingRepository(env.DB).activeOffers() });
  }

  const current = await requireSession(auth, request);
  if (current.error) return error(current.error, current.error === "UNAUTHENTICATED" ? 401 : 403);
  const userId = current.session.user.id;

  if (url.pathname === "/api/account" && request.method === "GET") {
    const [account, billing] = await Promise.all([
      identityRepository(env.DB).account(userId),
      billingRepository(env.DB).summary(userId),
    ]);
    return json({ account, billing });
  }

  if (url.pathname === "/api/account/locale" && request.method === "PUT") {
    const body = await readJson(request);
    const locale = normalizeLocale(body.locale);
    if (!locale) return error("UNSUPPORTED_LOCALE", 400);
    await identityRepository(env.DB).updateLocale(userId, locale);
    return json({ locale });
  }

  if (url.pathname === "/api/billing/checkout" && request.method === "POST") {
    if (!config.billingEnabled) return error("BILLING_DISABLED", 503);
    const body = await readJson(request);
    const repo = billingRepository(env.DB);
    const offer = await repo.offer(body.offerId);
    if (!offer) return error("OFFER_NOT_FOUND", 404);
    const providerMapping = await env.DB.prepare(`SELECT object_id AS provider_price_id FROM provider_mappings
      WHERE provider = 'stripe' AND object_type = 'price' AND owner_type = 'offer' AND owner_id = ?`).bind(offer.id).first();
    if (!providerMapping) return error("OFFER_NOT_CONFIGURED", 409);
    const provider = new StripeBillingProvider(config);
    const checkout = await provider.createCheckout({
      user: current.session.user,
      offer: { ...offer, ...providerMapping },
      locale: current.session.user.locale || "zh-CN",
    });
    return json({ url: checkout.url });
  }

  if (url.pathname === "/api/billing/portal" && request.method === "POST") {
    if (!config.billingEnabled) return error("BILLING_DISABLED", 503);
    const mapping = await env.DB.prepare(`SELECT object_id AS customerId FROM provider_mappings
      WHERE provider = 'stripe' AND object_type = 'customer' AND owner_type = 'user' AND owner_id = ?`).bind(userId).first();
    if (!mapping) return error("BILLING_PROFILE_NOT_FOUND", 404);
    const portal = await new StripeBillingProvider(config).createPortal({
      customerId: mapping.customerId,
      locale: current.session.user.locale || "zh-CN",
    });
    return json({ url: portal.url });
  }

  return error("NOT_FOUND", 404);
}

async function handleWebhook(request, env, config) {
  if (!config.billingEnabled) return error("BILLING_DISABLED", 503);
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return error("INVALID_WEBHOOK_SIGNATURE", 400);
  let event;
  try {
    event = await new StripeBillingProvider(config).verifyEvent(rawBody, signature);
  } catch {
    return error("INVALID_WEBHOOK_SIGNATURE", 400);
  }
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody));
  const payloadHash = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const receipt = await env.DB.prepare(`INSERT OR IGNORE INTO webhook_receipts
    (id, provider, provider_event_id, event_type, status, payload_hash, created_at)
    VALUES (?, 'stripe', ?, ?, 'received', ?, ?)`)
    .bind(crypto.randomUUID(), event.id, event.type, payloadHash, Date.now()).run();
  if (receipt.meta.changes === 0) return json({ received: true, duplicate: true });
  return json({ received: true });
}

export default {
  async fetch(request, env, executionCtx) {
    const url = new URL(request.url);
    let response;
    if (url.pathname.startsWith("/api/")) try {
      if (!isKnownApiPath(url.pathname)) {
        response = error("NOT_FOUND", 404);
      } else {
        const config = getConfig(env, request.url);
        if (url.pathname === "/api/webhooks/stripe" && request.method === "POST") {
          response = await handleWebhook(request, env, config);
        } else {
          response = await handleApi(request, env, executionCtx, config, url);
        }
      }
    } catch (caught) {
      const status = caught.status || 500;
      response = error(status === 500 ? "INTERNAL_ERROR" : caught.message, status);
    }
    if (response) {
      const secured = new Headers(response.headers);
      for (const [key, value] of Object.entries(securityHeaders)) secured.set(key, value);
      return new Response(response.body, { status: response.status, headers: secured });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (assetResponse.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return assetResponse;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    const fallback = await env.ASSETS.fetch(new Request(indexUrl, request));
    const headers = new Headers(fallback.headers);
    for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
    return new Response(fallback.body, { status: fallback.status, headers });
  },
};
