const enabled = (name, fallback = false) => {
  const value = process.env[name];
  return value == null ? fallback : value === "true";
};

export function getServerConfig(requestUrl = process.env.APP_URL || "http://localhost:5173") {
  const appUrl = (process.env.APP_URL || new URL(requestUrl).origin).replace(/\/$/, "");
  const production = appUrl.startsWith("https://");
  const emailProvider = String(
    process.env.EMAIL_PROVIDER || (process.env.EMAIL_SMTP_HOST ? "smtp" : "resend"),
  ).toLowerCase();
  const emailProviderSupported = ["resend", "smtp"].includes(emailProvider);
  const smtpPort = Number(process.env.EMAIL_SMTP_PORT || 465);
  const smtpConfigured = Boolean(
    process.env.EMAIL_SMTP_HOST
    && Number.isInteger(smtpPort)
    && smtpPort > 0
    && smtpPort <= 65535
    && process.env.EMAIL_SMTP_USER
    && process.env.EMAIL_SMTP_PASSWORD
    && process.env.EMAIL_FROM,
  );
  const resendConfigured = Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);
  const emailConfigured = emailProviderSupported && (
    emailProvider === "smtp" ? smtpConfigured : resendConfigured
  );
  const developmentEmail = !production && enabled("ALLOW_DEV_EMAIL_DELIVERY", false);
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY
    && process.env.STRIPE_WEBHOOK_SECRET
    && process.env.STRIPE_PRO_PRICE_ID,
  );

  return Object.freeze({
    appUrl,
    production,
    emailProvider,
    emailProviderSupported,
    emailConfigured,
    developmentEmail,
    registrationEnabled: enabled("REGISTRATION_ENABLED", false) && (emailConfigured || developmentEmail),
    googleEnabled: enabled("GOOGLE_AUTH_ENABLED", false) && googleConfigured,
    billingEnabled: enabled("BILLING_ENABLED", false) && stripeConfigured,
    accountDeletionEnabled: enabled("ACCOUNT_DELETION_ENABLED", false),
  });
}

export function validateServerConfig(config) {
  const errors = [];
  if (config.production && !config.appUrl.startsWith("https://")) errors.push("APP_URL_HTTPS_REQUIRED");
  if (!config.emailProviderSupported) errors.push("EMAIL_PROVIDER_UNSUPPORTED");
  if (process.env.REGISTRATION_ENABLED === "true" && !config.registrationEnabled) errors.push("EMAIL_PROVIDER_REQUIRED");
  if (process.env.GOOGLE_AUTH_ENABLED === "true" && !config.googleEnabled) errors.push("GOOGLE_CREDENTIALS_REQUIRED");
  if (process.env.BILLING_ENABLED === "true" && !config.billingEnabled) errors.push("STRIPE_CONFIGURATION_REQUIRED");
  return errors;
}
