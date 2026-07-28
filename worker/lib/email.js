import { resolveRequestLocale } from "./locale.js";

const messages = {
  "zh-CN": {
    verifySubject: "验证你的 OneShowTools 邮箱",
    verifyTitle: "验证邮箱",
    verifyBody: "请点击下面的按钮完成邮箱验证。链接将在 1 小时后失效。",
    verifyAction: "验证邮箱",
    resetSubject: "重置你的 OneShowTools 密码",
    resetTitle: "重置密码",
    resetBody: "如果这是你发起的操作，请点击下面的按钮设置新密码。链接将在 1 小时后失效。",
    resetAction: "重置密码",
    ignore: "如果不是你发起的操作，可以忽略这封邮件。",
  },
  en: {
    verifySubject: "Verify your OneShowTools email",
    verifyTitle: "Verify your email",
    verifyBody: "Use the button below to verify your email. This link expires in one hour.",
    verifyAction: "Verify email",
    resetSubject: "Reset your OneShowTools password",
    resetTitle: "Reset your password",
    resetBody: "If you requested this change, use the button below to choose a new password. This link expires in one hour.",
    resetAction: "Reset password",
    ignore: "If you did not request this, you can safely ignore this email.",
  },
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function template(kind, locale, url) {
  const copy = messages[locale] || messages["zh-CN"];
  const prefix = kind === "verify" ? "verify" : "reset";
  const subject = copy[`${prefix}Subject`];
  const title = copy[`${prefix}Title`];
  const body = copy[`${prefix}Body`];
  const action = copy[`${prefix}Action`];
  const safeUrl = escapeHtml(url);
  return {
    subject,
    text: `${title}\n\n${body}\n\n${url}\n\n${copy.ignore}`,
    html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#111827"><h1>${title}</h1><p>${body}</p><p><a href="${safeUrl}" style="display:inline-block;background:#1769e8;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">${action}</a></p><p style="color:#64748b">${copy.ignore}</p></main>`,
  };
}

export function createEmailSender(config, executionCtx) {
  return async ({ to, url, kind, request }) => {
    const locale = resolveRequestLocale(request || new Request(config.appUrl));
    const content = template(kind, locale, url);
    const delivery = fetch(config.email.apiUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.email.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: config.email.from, to: [to], ...content }),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`EMAIL_DELIVERY_${response.status}`);
    });
    executionCtx?.waitUntil(delivery);
    if (!executionCtx) await delivery;
  };
}
