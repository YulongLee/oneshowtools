import Stripe from "stripe";

export class StripeBillingProvider {
  constructor(config) {
    this.config = config;
    this.client = new Stripe(config.stripe.secretKey, {
      apiVersion: "2026-06-30.basil",
      httpClient: Stripe.createFetchHttpClient(),
    });
  }

  async createCheckout({ user, offer, locale }) {
    const mode = offer.kind === "subscription" ? "subscription" : "payment";
    return this.client.checkout.sessions.create({
      mode,
      customer_email: user.email,
      client_reference_id: user.id,
      locale: locale === "zh-CN" ? "zh" : "en",
      line_items: [{ price: offer.provider_price_id, quantity: 1 }],
      metadata: { userId: user.id, offerId: offer.id, offerKind: offer.kind },
      success_url: `${this.config.appUrl}/?billing=success&locale=${encodeURIComponent(locale)}`,
      cancel_url: `${this.config.appUrl}/?billing=cancelled&locale=${encodeURIComponent(locale)}`,
    });
  }

  async createPortal({ customerId, locale }) {
    return this.client.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.config.appUrl}/?view=workspace&locale=${encodeURIComponent(locale)}`,
      ...(this.config.stripe.portalConfigurationId
        ? { configuration: this.config.stripe.portalConfigurationId }
        : {}),
    });
  }

  verifyEvent(rawBody, signature) {
    return this.client.webhooks.constructEventAsync(
      rawBody,
      signature,
      this.config.stripe.webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  }
}
