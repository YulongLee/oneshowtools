import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { db } from "../server/database.mjs";
import {
  bindPromotionUser, createPromotionCampaign, createPromotionChannel, createPromotionCost,
  createPromotionLink, handlePromotionRedirect, promotionOverview, recordPromotionEvent,
} from "../server/promotion-center.mjs";

test("promotion center persists a first-party visit, user attribution, download and cost", () => {
  const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
  const channel = createPromotionChannel({ name: "自测渠道", platform: `qa-${suffix}` }, null);
  const campaign = createPromotionCampaign({ name: "2026 秋招自测", objective: "注册转化" }, null);
  const link = createPromotionLink({
    name: "自测推广链接", destinationUrl: "https://oneshowtools.com/#tools",
    channelId: channel.id, campaignId: campaign.id, contentTitle: "自测内容",
  }, null);
  const redirect = handlePromotionRedirect(new Request(`http://localhost/r/${link.code}`, {
    headers: { "user-agent": "promotion-center-test" },
  }), link.code);
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "https://oneshowtools.com/#tools");
  const attributionCookie = redirect.headers.getSetCookie().find((value) => value.startsWith("ost_attr=")).split(";")[0];
  const userId = randomUUID();
  const timestamp = Date.now();
  db.prepare("INSERT INTO users (id,name,email,password_hash,locale,email_verified,status,created_at,updated_at) VALUES (?,?,?,?,?,1,'active',?,?)")
    .run(userId, "Promotion QA", `promotion-${suffix}@example.com`, "x", "zh-CN", timestamp, timestamp);
  assert.equal(bindPromotionUser(new Request("http://localhost/api/auth/session", { headers: { cookie: attributionCookie } }), userId), true);
  assert.equal(recordPromotionEvent(userId, "download", "qa_release", suffix), true);
  createPromotionCost({ campaignId: campaign.id, channelId: channel.id, amount: 88.5, occurredOn: new Date().toISOString().slice(0, 10), note: "QA" }, null);

  const overview = promotionOverview(new Request("http://localhost/api/admin/v1/promotion/overview?days=30"));
  const result = overview.links.find((item) => item.id === link.id);
  const channelResult = overview.channels.find((item) => item.id === channel.id);
  assert.equal(result.visitors, 1);
  assert.equal(result.registrations, 1);
  assert.equal(channelResult.downloads, 1);
  assert.equal(overview.campaigns.find((item) => item.id === campaign.id).costMinor, 8850);
  assert.match(overview.shortLinkBase, /\/r\/$/);

  db.prepare("DELETE FROM promotion_costs WHERE campaign_id=?").run(campaign.id);
  db.prepare("DELETE FROM promotion_events WHERE user_id=?").run(userId);
  db.prepare("DELETE FROM promotion_user_attributions WHERE user_id=?").run(userId);
  db.prepare("DELETE FROM promotion_touchpoints WHERE link_id=?").run(link.id);
  db.prepare("DELETE FROM users WHERE id=?").run(userId);
  db.prepare("DELETE FROM promotion_links WHERE id=?").run(link.id);
  db.prepare("DELETE FROM promotion_campaigns WHERE id=?").run(campaign.id);
  db.prepare("DELETE FROM promotion_channels WHERE id=?").run(channel.id);
});

