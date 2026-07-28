const requiredWhenEnabled = (enabled, value, name) => {
  if (enabled && !value) throw new Error(`Missing required environment binding: ${name}`);
  return value || "";
};

export function getConfig(env, requestUrl) {
  const appUrl = env.APP_URL || new URL(requestUrl).origin;
  const registrationEnabled = env.REGISTRATION_ENABLED !== "false";
  const googleAuthEnabled = env.GOOGLE_AUTH_ENABLED === "true";
  const authEnabled = registrationEnabled || googleAuthEnabled;
  const billingEnabled = env.BILLING_ENABLED === "true";

  return Object.freeze({
    appUrl,
    authSecret: requiredWhenEnabled(authEnabled, env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET"),
    registrationEnabled,
    google: {
      enabled: googleAuthEnabled,
      clientId: requiredWhenEnabled(googleAuthEnabled, env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
      clientSecret: requiredWhenEnabled(
        googleAuthEnabled,
        env.GOOGLE_CLIENT_SECRET,
        "GOOGLE_CLIENT_SECRET",
      ),
    },
    billingEnabled,
    email: {
      apiUrl: env.EMAIL_API_URL || "https://api.resend.com/emails",
      apiKey: requiredWhenEnabled(registrationEnabled, env.EMAIL_API_KEY, "EMAIL_API_KEY"),
      from: requiredWhenEnabled(registrationEnabled, env.EMAIL_FROM, "EMAIL_FROM"),
    },
    stripe: {
      secretKey: requiredWhenEnabled(billingEnabled, env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"),
      webhookSecret: requiredWhenEnabled(billingEnabled, env.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET"),
      portalConfigurationId: env.STRIPE_PORTAL_CONFIGURATION_ID || "",
    },
    toolCredentialPepper: requiredWhenEnabled(
      true,
      env.TOOL_CREDENTIAL_PEPPER || env.BETTER_AUTH_SECRET,
      "TOOL_CREDENTIAL_PEPPER",
    ),
  });
}
