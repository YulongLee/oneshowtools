import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-support-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.ADMIN_MFA_ENFORCED = "false";
process.env.ONESHOW_MODEL_EXECUTION_ENABLED = "false";
process.env.ALLOW_DEV_EMAIL_DELIVERY = "true";

const { handleApi } = await import(`../server/api.mjs?support=${Date.now()}`);
const { db } = await import("../server/database.mjs");
const { createSessionToken, hashToken } = await import("../server/security.mjs");
const { saveToolManual } = await import("../server/tool-manuals.mjs");
const {
  adminSupportConversation, askCustomerSupport, replyToSupportConversation,
  submitSupportTicket, resolveSupportConversation,
} = await import("../server/customer-support.mjs");

function makeUser(email, name = "Support Customer") {
  const id = `user_${crypto.randomUUID()}`;
  const timestamp = Date.now();
  db.prepare(`INSERT INTO users (id,name,email,password_hash,locale,email_verified,status,created_at,updated_at) VALUES (?,?,?,'test','zh-CN',1,'active',?,?)`)
    .run(id, name, email, timestamp, timestamp);
  const token = createSessionToken();
  db.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at,user_agent,ip_hash) VALUES (?,?,?,?,?,?,?,?)")
    .run(crypto.randomUUID(), id, hashToken(token), timestamp + 86400000, timestamp, timestamp, "test", "test");
  return { id, email, name, locale: "zh-CN", cookie: `ost_session=${token}` };
}
const authenticated = (path, cookie, options = {}) => new Request(`http://localhost${path}`, {
  ...options, headers: { cookie, ...(options.headers || {}) },
});
const post = (path, cookie, body) => authenticated(path, cookie, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

test("support assistant keeps conversation history and learns only from published resolutions", async () => {
  const customer = makeUser(`support-customer-${Date.now()}@example.com`);
  const admin = makeUser(`support-admin-${Date.now()}@example.com`, "Support Admin");
  let prompt = "";
  const conversation = await askCustomerSupport({
    user: customer,
    message: "我生成的任务在哪里查看？",
    modelInvoker: async (payload) => { prompt = payload.text; return { text: "可以在任务中心查看状态，并从文件中心下载结果。" }; },
  });
  assert.equal(conversation.messages.length, 2);
  assert.equal(conversation.messages[0].senderType, "user");
  assert.equal(conversation.messages[1].senderType, "assistant");
  assert.match(prompt, /已审核客服知识/);

  const ticket = submitSupportTicket(customer.id, conversation.id, "请核对这个任务的积分流水");
  assert.equal(ticket.status, "awaiting_agent");
  assert.match(ticket.messages.at(-1).body, /工单已提交/);

  const replied = replyToSupportConversation({ conversationId: conversation.id, adminUserId: admin.id, body: "已核对，任务结果可以正常下载。", priority: "high" });
  assert.equal(replied.status, "in_progress");
  assert.equal(replied.priority, "high");

  const resolved = resolveSupportConversation({
    conversationId: conversation.id,
    adminUserId: admin.id,
    publishKnowledge: true,
    knowledge: { title: "任务结果下载", question: "任务结果在哪里下载？", answer: "在任务中心打开任务，并前往文件中心下载结果。", keywords: "任务 下载 文件中心", locale: "zh-CN" },
  });
  assert.equal(resolved.status, "resolved");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM support_knowledge_articles WHERE source_conversation_id = ?").get(conversation.id).count, 1);
  assert.equal(adminSupportConversation(conversation.id).messages.filter((item) => item.senderType === "admin").length, 1);
});

test("authenticated support and admin queue APIs are connected", async () => {
  const customer = makeUser(`support-api-${Date.now()}@example.com`);
  const admin = makeUser(`support-owner-${Date.now()}@example.com`, "Owner");
  process.env.ADMIN_EMAILS = admin.email;

  const answerResponse = await handleApi(post("/api/support/messages", customer.cookie, { message: "积分如何使用？", locale: "zh-CN" }));
  assert.equal(answerResponse.status, 201);
  const answered = await answerResponse.json();
  assert.equal(answered.conversation.messages.length, 2);
  assert.match(answered.conversation.messages[1].body, /积分/);

  const ticket = await handleApi(post(`/api/support/conversations/${answered.conversation.id}/ticket`, customer.cookie, { message: "请核对这个任务" }));
  assert.equal(ticket.status, 200);
  assert.equal((await ticket.json()).conversation.status, "awaiting_agent");

  assert.equal((await handleApi(authenticated("/api/admin/v1/session", admin.cookie))).status, 200);
  const queue = await handleApi(authenticated("/api/admin/v1/support", admin.cookie));
  assert.equal(queue.status, 200);
  const queueData = await queue.json();
  assert.ok(queueData.conversations.some((item) => item.id === answered.conversation.id));
  assert.ok(queueData.knowledge.length >= 6);
});

test("support assistant can return a published tool guide link", async () => {
  db.prepare("UPDATE tools SET active=1 WHERE id='tool_music_studio'").run();
  saveToolManual("tool_music_studio", {
    titleZh: "AI 音乐工作室使用手册", summaryZh: "查看音乐生成、试听和下载步骤。", contentZh: "填写灵感后点击生成。",
    status: "published", homepageVisible: false, supportEnabled: true,
  }, null);
  const customer = makeUser(`support-manual-${Date.now()}@example.com`);
  const conversation = await askCustomerSupport({
    user: customer, message: "AI音乐工作室怎么用？",
    modelInvoker: async () => { throw new Error("MODEL_OFFLINE"); },
  });
  assert.match(conversation.messages.at(-1).body, /https:\/\/oneshowtools\.com\/help\/ai-music-studio/);
});

test.after(async () => {
  await rm(dataDirectory, { recursive: true, force: true });
});
