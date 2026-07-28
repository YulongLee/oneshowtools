import { correlationId, error, json, readJson } from "./http.js";
import { integrationRepository, ledgerRepository } from "./repositories.js";

const sha256 = async (value) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

async function authenticateTool(request, env, config) {
  const toolId = request.headers.get("x-tool-id");
  const credential = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!toolId || !credential) return null;
  const repo = integrationRepository(env.DB);
  const tool = await repo.findTool(toolId);
  if (!tool) return null;
  const candidate = await sha256(`${credential}:${config.toolCredentialPepper}`);
  if (candidate.length !== tool.credentialHash.length) return null;
  let difference = 0;
  for (let i = 0; i < candidate.length; i += 1) difference |= candidate.charCodeAt(i) ^ tool.credentialHash.charCodeAt(i);
  return difference === 0 ? { ...tool, operations: JSON.parse(tool.allowedOperations || "[]") } : null;
}

export async function handleToolContract(request, env, config, path) {
  if (!path.startsWith("/api/tools/v1/")) {
    return path.startsWith("/api/tools/") ? error("UNSUPPORTED_VERSION", 400) : null;
  }
  const tool = await authenticateTool(request, env, config);
  if (!tool) return error("INVALID_TOOL_IDENTITY", 401);
  const operation = path.slice("/api/tools/v1/".length);
  if (!tool.operations.includes(operation)) return error("OPERATION_NOT_ALLOWED", 403);
  const body = await readJson(request);
  const cid = correlationId(request);
  const integrations = integrationRepository(env.DB);
  const ledger = ledgerRepository(env.DB);

  if (operation === "access") {
    const user = await integrations.access(body.userId);
    const allowed = Boolean(user && user.status === "active" && user.emailVerified);
    await integrations.audit({ actorId: tool.id, action: "access", targetType: "user", targetId: body.userId, correlationId: cid, metadata: { allowed } });
    return json({ version: 1, allowed, reason: allowed ? null : "USER_NOT_ELIGIBLE", user: allowed ? { id: user.id, locale: user.locale } : null, policy: allowed ? { availableCredits: Number(user.balance) } : null, correlationId: cid });
  }

  if (operation === "reserve") {
    if (!request.headers.get("idempotency-key") || !body.userId || !Number.isInteger(body.amount) || body.amount <= 0) return error("INVALID_REQUEST", 400);
    const usageKey = request.headers.get("idempotency-key");
    const requestHash = await sha256(JSON.stringify({ userId: body.userId, amount: body.amount }));
    const result = await ledger.reserve({ toolId: tool.id, userId: body.userId, usageKey, amount: body.amount, requestHash, expiresAt: Date.now() + 15 * 60 * 1000 });
    await integrations.audit({ actorId: tool.id, action: "reserve", targetType: "user", targetId: body.userId, correlationId: cid, metadata: { usageKey, result: result.status || (result.conflict ? "conflict" : "insufficient") } });
    if (result.conflict) return error("IDEMPOTENCY_CONFLICT", 409);
    if (result.insufficient) return error("INSUFFICIENT_CREDITS", 402);
    return json({ version: 1, reservation: result, correlationId: cid }, result.replay ? 200 : 201);
  }

  if (operation === "commit" || operation === "release") {
    if (!body.reservationId) return error("INVALID_REQUEST", 400);
    const result = await ledger.settle({ toolId: tool.id, reservationId: body.reservationId, action: operation });
    await integrations.audit({ actorId: tool.id, action: operation, targetType: "reservation", targetId: body.reservationId, correlationId: cid });
    if (result.missing) return error("RESERVATION_NOT_FOUND", 404);
    if (result.conflict) return error("RESERVATION_STATE_CONFLICT", 409, { status: result.status });
    return json({ version: 1, reservation: result, correlationId: cid });
  }

  return error("UNKNOWN_OPERATION", 404);
}
