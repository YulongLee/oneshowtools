import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const user = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  status: text("status", { enum: ["active", "suspended", "deleted"] }).notNull().default("active"),
  locale: text("locale", { enum: ["zh-CN", "en"] }).notNull().default("zh-CN"),
  ...timestamps,
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const session = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
}, (table) => [
  uniqueIndex("sessions_token_unique").on(table.token),
  index("sessions_user_idx").on(table.userId),
]);

export const account = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
}, (table) => [
  uniqueIndex("accounts_provider_account_unique").on(table.providerId, table.accountId),
  index("accounts_user_idx").on(table.userId),
]);

export const verification = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
}, (table) => [index("verifications_identifier_idx").on(table.identifier)]);

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  locale: text("locale", { enum: ["zh-CN", "en"] }).notNull().default("zh-CN"),
  ...timestamps,
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  interval: text("interval", { enum: ["month", "year"] }).notNull(),
  recurringCredits: integer("recurring_credits").notNull().default(0),
  featuresJson: text("features_json").notNull().default("{}"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const offers = sqliteTable("offers", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["subscription", "top_up"] }).notNull(),
  planId: text("plan_id").references(() => plans.id),
  code: text("code").notNull().unique(),
  currency: text("currency").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  credits: integer("credits").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const providerMappings = sqliteTable("provider_mappings", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  objectType: text("object_type").notNull(),
  objectId: text("object_id").notNull(),
  ownerType: text("owner_type").notNull(),
  ownerId: text("owner_id").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("provider_object_unique").on(table.provider, table.objectType, table.objectId),
]);

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  planId: text("plan_id").notNull().references(() => plans.id),
  provider: text("provider").notNull(),
  providerSubscriptionId: text("provider_subscription_id").notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (table) => [
  uniqueIndex("subscriptions_provider_id_unique").on(table.provider, table.providerSubscriptionId),
  index("subscriptions_user_idx").on(table.userId),
]);

export const webhookReceipts = sqliteTable("webhook_receipts", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  eventType: text("event_type").notNull(),
  status: text("status").notNull(),
  payloadHash: text("payload_hash").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp_ms" }),
  errorCode: text("error_code"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("webhook_provider_event_unique").on(table.provider, table.providerEventId),
]);

export const ledgerEntries = sqliteTable("ledger_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: text("reference_id").notNull(),
  toolId: text("tool_id"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("ledger_reference_unique").on(table.type, table.referenceType, table.referenceId),
  index("ledger_user_created_idx").on(table.userId, table.createdAt),
]);

export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(),
  toolId: text("tool_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  usageKey: text("usage_key").notNull(),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["reserved", "committed", "released", "expired"] }).notNull(),
  requestHash: text("request_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  settledAt: integer("settled_at", { mode: "timestamp_ms" }),
  ...timestamps,
}, (table) => [
  uniqueIndex("reservations_tool_usage_unique").on(table.toolId, table.usageKey),
  index("reservations_expiry_idx").on(table.status, table.expiresAt),
]);

export const tools = sqliteTable("tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  credentialHash: text("credential_hash").notNull(),
  allowedOperationsJson: text("allowed_operations_json").notNull().default("[]"),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  correlationId: text("correlation_id").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("audit_correlation_idx").on(table.correlationId),
  index("audit_created_idx").on(table.createdAt),
]);
