import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "./database.mjs";
import { requestClient } from "./security.mjs";

const DAY = 86400000;
const ATTRIBUTION_WINDOW = 30 * DAY;
const text = (value, max = 200) => String(value || "").trim().slice(0, max);
const cookieValue = (request, name) => String(request.headers.get("cookie") || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
const safeCode = (value) => text(value, 48).toLowerCase().replace(/[^a-z0-9_-]/g, "");
const shortCode = () => randomBytes(5).toString("base64url").toLowerCase();
const isoDay = (timestamp = Date.now()) => new Date(timestamp).toISOString().slice(0, 10);
const originFor = (request) => process.env.APP_URL || new URL(request.url).origin;

function range(request) {
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") || 30)));
  const until = Date.now() + DAY;
  return { days, from: until - days * DAY, until };
}

function resolveTouchpoint(request) {
  const id = cookieValue(request, "ost_attr");
  if (!id) return null;
  return db.prepare("SELECT * FROM promotion_touchpoints WHERE id = ? AND clicked_at >= ?").get(id, Date.now() - ATTRIBUTION_WINDOW) || null;
}

export function bindPromotionUser(request, userId) {
  const touchpoint = resolveTouchpoint(request);
  if (!touchpoint || !userId) return false;
  const timestamp = Date.now();
  db.prepare("UPDATE promotion_touchpoints SET user_id = ?, bound_at = COALESCE(bound_at, ?) WHERE id = ?").run(userId, timestamp, touchpoint.id);
  const existing = db.prepare("SELECT * FROM promotion_user_attributions WHERE user_id = ?").get(userId);
  if (!existing) {
    db.prepare("INSERT INTO promotion_user_attributions (user_id, first_touchpoint_id, last_touchpoint_id, attributed_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(userId, touchpoint.id, touchpoint.id, timestamp, timestamp);
  } else {
    db.prepare("UPDATE promotion_user_attributions SET last_touchpoint_id = ?, updated_at = ? WHERE user_id = ?").run(touchpoint.id, timestamp, userId);
  }
  return true;
}

export function recordPromotionEvent(userId, eventType, referenceType = "", referenceId = "", metadata = {}) {
  const attribution = db.prepare("SELECT last_touchpoint_id AS touchpointId FROM promotion_user_attributions WHERE user_id=?").get(userId);
  if (!attribution) return false;
  db.prepare(`INSERT OR IGNORE INTO promotion_events
    (id,user_id,touchpoint_id,event_type,reference_type,reference_id,metadata_json,occurred_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(), userId, attribution.touchpointId, eventType, text(referenceType, 60), text(referenceId, 160), JSON.stringify(metadata || {}), Date.now());
  return true;
}

export function handlePromotionRedirect(request, code) {
  const link = db.prepare(`SELECT l.*, c.status AS channel_status, p.status AS campaign_status
    FROM promotion_links l JOIN promotion_channels c ON c.id=l.channel_id
    LEFT JOIN promotion_campaigns p ON p.id=l.campaign_id WHERE l.code=?`).get(safeCode(code));
  if (!link || link.status !== "active" || link.channel_status !== "active" || ["paused", "completed"].includes(link.campaign_status)) {
    return new Response("Promotion link is unavailable", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const timestamp = Date.now();
  const visitorId = cookieValue(request, "ost_vid") || randomUUID();
  const touchpointId = randomUUID();
  const client = requestClient(request);
  db.prepare(`INSERT INTO promotion_touchpoints
    (id, visitor_id, link_id, session_id, ip_hash, user_agent, referrer, clicked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(touchpointId, visitorId, link.id, randomUUID(), client.ipHash || "", text(client.userAgent, 500), text(request.headers.get("referer"), 500), timestamp);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const headers = new Headers({ location: new URL(link.destination_url, originFor(request)).toString(), "cache-control": "no-store" });
  headers.append("set-cookie", `ost_vid=${visitorId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
  headers.append("set-cookie", `ost_attr=${touchpointId}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`);
  return new Response(null, { status: 302, headers });
}

function listRows(from, until) {
  return db.prepare(`
    SELECT l.id, l.code, l.name, l.destination_url AS destinationUrl, l.content_title AS contentTitle, l.status,
      l.created_at AS createdAt, c.id AS channelId, c.name AS channelName, c.platform,
      p.id AS campaignId, p.name AS campaignName,
      COUNT(DISTINCT tp.id) AS clicks, COUNT(DISTINCT tp.visitor_id) AS visitors,
      COUNT(DISTINCT CASE WHEN u.created_at >= tp.clicked_at THEN tp.user_id END) AS registrations
    FROM promotion_links l JOIN promotion_channels c ON c.id=l.channel_id
    LEFT JOIN promotion_campaigns p ON p.id=l.campaign_id
    LEFT JOIN promotion_touchpoints tp ON tp.link_id=l.id AND tp.clicked_at>=? AND tp.clicked_at<?
    LEFT JOIN users u ON u.id=tp.user_id
    GROUP BY l.id ORDER BY clicks DESC, l.created_at DESC
  `).all(from, until);
}

export function promotionOverview(request) {
  const { days, from, until } = range(request);
  const links = listRows(from, until);
  const channelRows = db.prepare(`
    SELECT c.id,c.code,c.name,c.platform,c.status,c.created_at AS createdAt,
      COUNT(DISTINCT tp.id) AS clicks, COUNT(DISTINCT tp.visitor_id) AS visitors,
      COUNT(DISTINCT CASE WHEN u.created_at>=tp.clicked_at THEN tp.user_id END) AS registrations
    FROM promotion_channels c LEFT JOIN promotion_links l ON l.channel_id=c.id
    LEFT JOIN promotion_touchpoints tp ON tp.link_id=l.id AND tp.clicked_at>=? AND tp.clicked_at<?
    LEFT JOIN users u ON u.id=tp.user_id
    GROUP BY c.id ORDER BY visitors DESC, c.created_at DESC
  `).all(from, until);
  const activity = db.prepare(`SELECT
    COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM tasks t WHERE t.user_id=a.user_id AND t.deleted_at IS NULL AND t.created_at>=tp.clicked_at) THEN a.user_id END) AS users,
    COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM promotion_events pe WHERE pe.user_id=a.user_id AND pe.event_type='download' AND pe.occurred_at>=tp.clicked_at) THEN a.user_id END) AS downloads,
    COALESCE(SUM((SELECT COUNT(*) FROM commercial_orders o WHERE o.user_id=a.user_id AND o.created_at>=tp.clicked_at)),0) AS orders,
    COALESCE(SUM((SELECT COUNT(*) FROM commercial_orders o WHERE o.user_id=a.user_id AND o.status='paid' AND o.created_at>=tp.clicked_at)),0) AS paidOrders,
    COALESCE(SUM((SELECT SUM(o.amount_minor) FROM commercial_orders o WHERE o.user_id=a.user_id AND o.status='paid' AND o.created_at>=tp.clicked_at)),0) AS revenueMinor
    FROM promotion_user_attributions a JOIN promotion_touchpoints tp ON tp.id=a.last_touchpoint_id
    JOIN promotion_links l ON l.id=tp.link_id
    WHERE l.channel_id=? AND tp.clicked_at>=? AND tp.clicked_at<?`);
  const channels = channelRows.map((row) => ({ ...row, ...activity.get(row.id, from, until) }));
  const campaigns = db.prepare(`SELECT p.id,p.name,p.objective,p.status,p.starts_at AS startsAt,p.ends_at AS endsAt,p.created_at AS createdAt,
    COUNT(DISTINCT l.id) AS links, COUNT(DISTINCT tp.visitor_id) AS visitors,
    COUNT(DISTINCT CASE WHEN u.created_at>=tp.clicked_at THEN tp.user_id END) AS registrations,
    COALESCE((SELECT SUM(cost_minor) FROM promotion_costs pc WHERE pc.campaign_id=p.id AND pc.occurred_on>=? AND pc.occurred_on<=?),0) AS costMinor
    FROM promotion_campaigns p LEFT JOIN promotion_links l ON l.campaign_id=p.id
    LEFT JOIN promotion_touchpoints tp ON tp.link_id=l.id AND tp.clicked_at>=? AND tp.clicked_at<?
    LEFT JOIN users u ON u.id=tp.user_id GROUP BY p.id ORDER BY p.created_at DESC`).all(isoDay(from), isoDay(until), from, until);
  const totals = channels.reduce((acc, row) => ({
    visitors: acc.visitors + Number(row.visitors || 0), registrations: acc.registrations + Number(row.registrations || 0),
    downloads: acc.downloads + Number(row.downloads || 0), users: acc.users + Number(row.users || 0), orders: acc.orders + Number(row.orders || 0),
    paidOrders: acc.paidOrders + Number(row.paidOrders || 0), revenueMinor: acc.revenueMinor + Number(row.revenueMinor || 0),
  }), { visitors: 0, registrations: 0, downloads: 0, users: 0, orders: 0, paidOrders: 0, revenueMinor: 0 });
  totals.costMinor = campaigns.reduce((sum, row) => sum + Number(row.costMinor || 0), 0);
  const daily = db.prepare(`SELECT date(clicked_at/1000,'unixepoch','localtime') AS day,
    COUNT(DISTINCT visitor_id) AS visitors, COUNT(DISTINCT CASE WHEN u.created_at>=clicked_at THEN user_id END) AS registrations
    FROM promotion_touchpoints tp LEFT JOIN users u ON u.id=tp.user_id WHERE clicked_at>=? AND clicked_at<? GROUP BY day ORDER BY day`).all(from, until);
  return { windowDays: days, generatedAt: Date.now(), shortLinkBase: `${originFor(request)}/r/`, totals, daily, channels, campaigns, links };
}

export function createPromotionChannel(input, actorId) {
  const name = text(input.name, 80); const platform = text(input.platform, 60); const code = safeCode(input.code || platform);
  if (!name || !platform || !code) throw Object.assign(new Error("INVALID_PROMOTION_CHANNEL"), { code: "INVALID_PROMOTION_CHANNEL" });
  const id = randomUUID(); const timestamp = Date.now();
  db.prepare("INSERT INTO promotion_channels (id,code,name,platform,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run(id, code, name, platform, actorId, timestamp, timestamp);
  return db.prepare("SELECT * FROM promotion_channels WHERE id=?").get(id);
}

export function createPromotionCampaign(input, actorId) {
  const name = text(input.name, 100); if (!name) throw Object.assign(new Error("INVALID_PROMOTION_CAMPAIGN"), { code: "INVALID_PROMOTION_CAMPAIGN" });
  const id=randomUUID(), timestamp=Date.now();
  db.prepare("INSERT INTO promotion_campaigns (id,name,objective,status,starts_at,ends_at,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(id,name,text(input.objective,300),["draft","active","paused","completed"].includes(input.status)?input.status:"active",input.startsAt||null,input.endsAt||null,actorId,timestamp,timestamp);
  return db.prepare("SELECT * FROM promotion_campaigns WHERE id=?").get(id);
}

export function createPromotionLink(input, actorId) {
  const name=text(input.name,100), destination=text(input.destinationUrl,1000), code=safeCode(input.code)||shortCode();
  if (!name || !destination || !input.channelId) throw Object.assign(new Error("INVALID_PROMOTION_LINK"), { code:"INVALID_PROMOTION_LINK" });
  let parsed; try { parsed=new URL(destination, process.env.APP_URL || "https://oneshowtools.com"); } catch { throw Object.assign(new Error("INVALID_DESTINATION_URL"), { code:"INVALID_DESTINATION_URL" }); }
  if (!["http:","https:"].includes(parsed.protocol)) throw Object.assign(new Error("INVALID_DESTINATION_URL"), { code:"INVALID_DESTINATION_URL" });
  const id=randomUUID(), timestamp=Date.now();
  db.prepare("INSERT INTO promotion_links (id,code,name,destination_url,channel_id,campaign_id,content_title,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(id,code,name,parsed.toString(),input.channelId,input.campaignId||null,text(input.contentTitle,160),actorId,timestamp,timestamp);
  return db.prepare("SELECT * FROM promotion_links WHERE id=?").get(id);
}

export function createPromotionCost(input, actorId) {
  const amount=Number(input.amount); if (!Number.isFinite(amount) || amount<0 || (!input.channelId && !input.campaignId)) throw Object.assign(new Error("INVALID_PROMOTION_COST"), { code:"INVALID_PROMOTION_COST" });
  const id=randomUUID(), timestamp=Date.now();
  db.prepare("INSERT INTO promotion_costs (id,campaign_id,channel_id,cost_minor,currency,occurred_on,note,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(id,input.campaignId||null,input.channelId||null,Math.round(amount*100),text(input.currency||"CNY",8),text(input.occurredOn||isoDay(),10),text(input.note,300),actorId,timestamp);
  return db.prepare("SELECT * FROM promotion_costs WHERE id=?").get(id);
}

export function updatePromotionStatus(kind, id, status) {
  const definitions = {
    channels: { table: "promotion_channels", allowed: ["active", "inactive"] },
    links: { table: "promotion_links", allowed: ["active", "inactive"] },
    campaigns: { table: "promotion_campaigns", allowed: ["draft", "active", "paused", "completed"] },
  };
  const definition = definitions[kind];
  if (!definition || !definition.allowed.includes(status)) throw Object.assign(new Error("INVALID_PROMOTION_STATUS"), { code: "INVALID_PROMOTION_STATUS" });
  const result = db.prepare(`UPDATE ${definition.table} SET status=?,updated_at=? WHERE id=?`).run(status, Date.now(), id);
  if (!result.changes) throw Object.assign(new Error("PROMOTION_RECORD_NOT_FOUND"), { code: "PROMOTION_RECORD_NOT_FOUND" });
  return db.prepare(`SELECT * FROM ${definition.table} WHERE id=?`).get(id);
}
