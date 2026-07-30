import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { db } from "./database.mjs";

const copy = {
  "zh-CN": {
    verify: ["验证你的 OneShowTools 邮箱", "请在 1 小时内完成邮箱验证："],
    reset: ["重置你的 OneShowTools 密码", "请在 1 小时内设置新密码："],
    emailChange: ["确认新的 OneShowTools 邮箱", "请在 1 小时内确认新邮箱："],
  },
  en: {
    verify: ["Verify your OneShowTools email", "Verify your email within one hour:"],
    reset: ["Reset your OneShowTools password", "Choose a new password within one hour:"],
    emailChange: ["Confirm your new OneShowTools email", "Confirm the new email within one hour:"],
  },
};

export async function sendAccountEmail({ to, locale = "zh-CN", kind, url, config }) {
  const [subject, intro] = (copy[locale] || copy["zh-CN"])[kind] || copy["zh-CN"].verify;
  const text = `${intro}\n\n${url}`;
  if (config.developmentEmail) {
    db.prepare(`
      INSERT INTO email_outbox (id, recipient, kind, subject, text, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), to, kind, subject, text, Date.now());
    return;
  }
  if (config.emailProvider === "smtp") {
    const host = process.env.EMAIL_SMTP_HOST;
    const port = Number(process.env.EMAIL_SMTP_PORT || 465);
    const secure = process.env.EMAIL_SMTP_SECURE !== "false";
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      tls: {
        minVersion: "TLSv1.2",
        servername: host,
      },
    });
    try {
      await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text,
      });
      return;
    } catch {
      throw Object.assign(new Error("EMAIL_DELIVERY_FAILED"), { status: 502 });
    } finally {
      transport.close();
    }
  }
  const response = await fetch(process.env.EMAIL_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
  });
  if (!response.ok) throw Object.assign(new Error("EMAIL_DELIVERY_FAILED"), { status: 502 });
}
