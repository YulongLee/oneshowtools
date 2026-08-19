export const envValue = (...names) => {
  for (const name of names) {
    const value = process.env[name];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
};

const enabled = (name, fallback = false, ...aliases) => {
  const value = envValue(name, ...aliases);
  return value === "" ? fallback : value === "true";
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
  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY
    && process.env.STRIPE_WEBHOOK_SECRET,
  );
  const smsProviderMode = envValue("OFFERSTEADY_AUTH_SMS_PROVIDER_MODE") || "aliyun-dysmsapi";
  const smsProviderSupported = smsProviderMode === "aliyun-dysmsapi";
  const smsConfigured = smsProviderSupported && Boolean(
    envValue("ALIYUN_SMS_ACCESS_KEY_ID", "OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_ID")
    && envValue("ALIYUN_SMS_ACCESS_KEY_SECRET", "OFFERSTEADY_AUTH_SMS_ALIYUN_ACCESS_KEY_SECRET")
    && envValue("ALIYUN_SMS_SIGN_NAME", "OFFERSTEADY_AUTH_SMS_ALIYUN_SIGN_NAME")
    && envValue("ALIYUN_SMS_TEMPLATE_CODE", "OFFERSTEADY_AUTH_SMS_ALIYUN_TEMPLATE_CODE"),
  );

  return Object.freeze({
    appUrl,
    production,
    emailProvider,
    emailProviderSupported,
    emailConfigured,
    developmentEmail,
    registrationEnabled: enabled("REGISTRATION_ENABLED", false) && (emailConfigured || developmentEmail),
    smsProviderMode,
    smsProviderSupported,
    smsConfigured,
    smsAuthEnabled: enabled("SMS_AUTH_ENABLED", false, "OFFERSTEADY_AUTH_SMS_ENABLED") && smsConfigured,
    billingEnabled: enabled("BILLING_ENABLED", false) && stripeConfigured,
    accountDeletionEnabled: enabled("ACCOUNT_DELETION_ENABLED", false),
    adminRbacEnabled: enabled("ADMIN_RBAC_ENABLED", true),
    adminMfaEnforced: enabled("ADMIN_MFA_ENFORCED", false),
    adminCustomerOperationsEnabled: enabled("ADMIN_CUSTOMER_OPERATIONS_ENABLED", true),
    adminCommercialOperationsEnabled: enabled("ADMIN_COMMERCIAL_OPERATIONS_ENABLED", true),
    adminToolGovernanceEnabled: enabled("ADMIN_TOOL_GOVERNANCE_ENABLED", true),
    adminPrivacyOperationsEnabled: enabled("ADMIN_PRIVACY_OPERATIONS_ENABLED", true),
    adminObservabilityEnabled: enabled("ADMIN_OBSERVABILITY_ENABLED", true),
    oneShowModelConfigured: Boolean(
      process.env.ONESHOW_MODEL_API_KEY
      && process.env.ONESHOW_MODEL_BASE_URL
      && process.env.ONESHOW_MODEL_ID,
    ),
    oneShowModelExecutionEnabled: enabled("ONESHOW_MODEL_EXECUTION_ENABLED", false),
    modelConnectionsEnabled: enabled("MODEL_CONNECTIONS_ENABLED", false),
    durableWorkerEnabled: enabled("DURABLE_WORKER_ENABLED", true),
  });
}

export function validateServerConfig(config) {
  const errors = [];
  if (config.production && !config.appUrl.startsWith("https://")) errors.push("APP_URL_HTTPS_REQUIRED");
  if (!config.emailProviderSupported) errors.push("EMAIL_PROVIDER_UNSUPPORTED");
  if (process.env.REGISTRATION_ENABLED === "true" && !config.registrationEnabled) errors.push("EMAIL_PROVIDER_REQUIRED");
  if (process.env.BILLING_ENABLED === "true" && !config.billingEnabled) errors.push("STRIPE_CONFIGURATION_REQUIRED");
  const smsRequested = enabled("SMS_AUTH_ENABLED", false, "OFFERSTEADY_AUTH_SMS_ENABLED");
  if (smsRequested && !config.smsProviderSupported) errors.push("SMS_PROVIDER_UNSUPPORTED");
  if (smsRequested && !config.smsConfigured) errors.push("ALIYUN_SMS_CONFIGURATION_REQUIRED");
  if (config.production && config.smsAuthEnabled && !envValue("SMS_PHONE_HASH_KEY", "OFFERSTEADY_AUTH_SMS_CODE_PEPPER") && !process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY) errors.push("SMS_PHONE_HASH_KEY_REQUIRED");
  if (config.adminMfaEnforced && !process.env.ADMIN_MFA_ENCRYPTION_KEY) errors.push("ADMIN_MFA_ENCRYPTION_KEY_REQUIRED");
  if (config.oneShowModelExecutionEnabled && !config.oneShowModelConfigured) errors.push("ONESHOW_MODEL_CONFIGURATION_REQUIRED");
  if (config.modelConnectionsEnabled && !process.env.MODEL_CREDENTIAL_ENCRYPTION_KEY) errors.push("MODEL_CREDENTIAL_ENCRYPTION_KEY_REQUIRED");
  return errors;
}
