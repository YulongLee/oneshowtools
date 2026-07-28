INSERT OR IGNORE INTO plans (id, code, name_zh, name_en, interval, recurring_credits, features_json, active, created_at, updated_at) VALUES
('plan_free', 'free', '免费版', 'Free', 'month', 50, '{"tools":"basic"}', 1, unixepoch() * 1000, unixepoch() * 1000),
('plan_pro_monthly', 'pro-monthly', '专业版', 'Pro', 'month', 2000, '{"tools":"all","priority":true}', 1, unixepoch() * 1000, unixepoch() * 1000);
INSERT OR IGNORE INTO offers (id, kind, plan_id, code, currency, amount_minor, credits, active, created_at, updated_at) VALUES
('offer_pro_usd_monthly', 'subscription', 'plan_pro_monthly', 'pro-usd-monthly', 'USD', 1200, 2000, 1, unixepoch() * 1000, unixepoch() * 1000),
('offer_credits_1000', 'top_up', NULL, 'credits-1000-usd', 'USD', 800, 1000, 1, unixepoch() * 1000, unixepoch() * 1000),
('offer_credits_5000', 'top_up', NULL, 'credits-5000-usd', 'USD', 3000, 5000, 1, unixepoch() * 1000, unixepoch() * 1000);
