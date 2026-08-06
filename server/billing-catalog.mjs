export const billingPlanSeeds = [
  ["plan_free", "free", "免费版", "Free", 0, "CNY", "month", 300],
  ["plan_pro", "pro-monthly", "专业版", "Pro", 3990, "CNY", "month", 8000],
  ["plan_max", "max-monthly", "旗舰版", "Max", 9900, "CNY", "month", 25000],
  ["pack_starter", "starter-topup", "Starter", "Starter", 1990, "CNY", "one_time", 2000],
  ["pack_basic", "basic-topup", "Basic", "Basic", 4990, "CNY", "one_time", 5500],
  ["pack_pro", "pro-topup", "Pro", "Pro", 9900, "CNY", "one_time", 12000],
  ["pack_studio", "studio-topup", "Studio", "Studio", 19900, "CNY", "one_time", 26000],
  ["pack_business", "business-topup", "Business", "Business", 49900, "CNY", "one_time", 70000],
];

const details = {
  free: {
    kind: "membership", badgeZh: "免费使用", badgeEn: "Free forever", bonusCredits: 0,
    benefitsZh: ["每日签到", "基础工具"], benefitsEn: ["Daily check-in", "Essential tools"], sortOrder: 10,
  },
  "pro-monthly": {
    kind: "membership", badgeZh: "最受欢迎", badgeEn: "Most popular", bonusCredits: 0,
    benefitsZh: ["优先队列", "Beta 工具", "更多并发"], benefitsEn: ["Priority queue", "Beta tools", "More concurrency"], sortOrder: 20,
  },
  "max-monthly": {
    kind: "membership", badgeZh: "高级能力", badgeEn: "Advanced", bonusCredits: 0,
    benefitsZh: ["AI Runtime 高级功能", "Agent 自动运行", "团队协作（个人版高配）"],
    benefitsEn: ["Advanced AI Runtime", "Agent automation", "High-capacity collaboration"], sortOrder: 30,
  },
  "starter-topup": { kind: "topup", badgeZh: "新用户", badgeEn: "New users", bonusCredits: 0, benefitsZh: [], benefitsEn: [], sortOrder: 110 },
  "basic-topup": { kind: "topup", badgeZh: "最受欢迎", badgeEn: "Most popular", bonusCredits: 500, benefitsZh: [], benefitsEn: [], sortOrder: 120 },
  "pro-topup": { kind: "topup", badgeZh: "推荐", badgeEn: "Recommended", bonusCredits: 2000, benefitsZh: [], benefitsEn: [], sortOrder: 130 },
  "studio-topup": { kind: "topup", badgeZh: "创作者", badgeEn: "Creators", bonusCredits: 6000, benefitsZh: [], benefitsEn: [], sortOrder: 140 },
  "business-topup": { kind: "topup", badgeZh: "团队", badgeEn: "Teams", bonusCredits: 20000, benefitsZh: [], benefitsEn: [], sortOrder: 150 },
};

export function billingPlanPayload(row) {
  const detail = details[row.code] || { kind: row.interval === "one_time" ? "topup" : "membership", bonusCredits: 0, benefitsZh: [], benefitsEn: [], sortOrder: 999 };
  return {
    id: row.id,
    code: row.code,
    nameZh: row.name_zh,
    nameEn: row.name_en,
    amountMinor: row.amount_minor,
    currency: row.currency,
    interval: row.interval,
    recurringCredits: row.recurring_credits,
    totalCredits: row.recurring_credits + detail.bonusCredits,
    ...detail,
  };
}

export const planDetail = (code) => details[code] || null;
