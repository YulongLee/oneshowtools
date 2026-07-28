import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../db/schema.ts";
import { createEmailSender } from "./email.js";

export function createAuth(env, config, executionCtx) {
  const db = drizzle(env.DB, { schema });
  const sendEmail = createEmailSender(config, executionCtx);

  return betterAuth({
    appName: "OneShowTools",
    baseURL: config.appUrl,
    basePath: "/api/auth",
    secret: config.authSecret,
    trustedOrigins: [config.appUrl],
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    socialProviders: config.google.enabled
      ? {
          google: {
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
            prompt: "select_account",
          },
        }
      : {},
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
        allowDifferentEmails: false,
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !config.registrationEnabled,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }, request) =>
        sendEmail({ to: user.email, url, kind: "reset", request }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: ({ user, url }, request) =>
        sendEmail({ to: user.email, url, kind: "verify", request }),
    },
    user: {
      additionalFields: {
        status: { type: "string", required: false, defaultValue: "active", input: false },
        locale: { type: "string", required: false, defaultValue: "zh-CN" },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: "ost",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.appUrl.startsWith("https://"),
        path: "/",
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 300, max: 5 },
        "/request-password-reset": { window: 300, max: 5 },
        "/send-verification-email": { window: 300, max: 5 },
      },
    },
  });
}

export async function requireSession(auth, request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return { error: "UNAUTHENTICATED" };
  if (session.user.status !== "active") return { error: "ACCOUNT_UNAVAILABLE" };
  if (!session.user.emailVerified) return { error: "EMAIL_UNVERIFIED" };
  return { session };
}
