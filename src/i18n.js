export const catalogs = Object.freeze({
  "zh-CN": Object.freeze({
    nav: { market: "工具广场", workspace: "我的空间", pricing: "定价", login: "登录", logout: "退出登录", account: "账户" },
    hero: { eyebrow: "OneShow AI Lab 旗下 AI 工具平台", title: "一个网站，解决每天的小需求", subtitle: "发现简单、好用的 AI 小工具，让重复工作更轻松。", placeholder: "输入你想要的功能，例如：去除图片背景、总结 PDF、语音转文字...", search: "搜索", popular: "热门搜索：" },
    discovery: { library: "工具库", results: "搜索结果", all: "查看全部", empty: "暂时没有匹配的工具", emptyHint: "换一个更简单的关键词试试。", ready: "工具已准备好，即将进入使用页面。", recent: "最近使用" },
    visitor: { title: "登录后同步你的空间", body: "登录后可查看真实使用记录、订阅状态和积分余额。", action: "登录或注册" },
    auth: { title: "欢迎使用 OneShowTools", signIn: "登录", signUp: "注册", email: "邮箱", password: "密码", name: "昵称", forgot: "忘记密码？", resetTitle: "重置密码", resetAction: "发送重置邮件", newPassword: "新密码", savePassword: "保存新密码", pending: "请查收验证邮件", pendingBody: "为了保护账户安全，验证邮箱后才能登录。", genericRecovery: "如果该邮箱已注册，你将收到重置邮件。", genericRegister: "请查收邮箱中的验证链接。", invalid: "操作未完成，请检查信息后重试。", close: "关闭" },
    workspace: { title: "我的空间", profile: "账户资料", subscription: "订阅状态", credits: "可用积分", history: "积分记录", free: "免费版", noHistory: "暂无积分记录", signInTitle: "登录后查看你的空间" },
    pricing: { title: "选择适合你的使用方式", subtitle: "订阅获得每月积分，也可以按需单次充值。所有价格均以美元结算。", monthly: "每月", oneTime: "一次性", credits: "积分", subscribe: "开始订阅", topup: "充值积分", disabled: "支付功能即将开放", limitations: "实际扣款、续费及退款以结账页展示为准。" },
    status: { loading: "加载中…", error: "暂时无法加载", verified: "邮箱验证成功，现在可以登录。", cancelled: "本次支付已取消，未产生扣款。", billingSuccess: "支付结果正在确认，到账以支付通知为准。" },
  }),
  en: Object.freeze({
    nav: { market: "Tool Market", workspace: "My Space", pricing: "Pricing", login: "Sign in", logout: "Sign out", account: "Account" },
    hero: { eyebrow: "An AI tools platform by OneShow AI Lab", title: "One place for everyday tasks", subtitle: "Discover focused AI tools that make repetitive work lighter.", placeholder: "Describe what you need, such as removing a background, summarizing a PDF, or transcribing audio...", search: "Search", popular: "Popular:" },
    discovery: { library: "Tool library", results: "Search results", all: "View all", empty: "No matching tools yet", emptyHint: "Try a shorter or more general search.", ready: "This tool is ready and will open on its product page.", recent: "Recent activity" },
    visitor: { title: "Sign in to sync your space", body: "See your real activity, subscription, and credit balance after signing in.", action: "Sign in or register" },
    auth: { title: "Welcome to OneShowTools", signIn: "Sign in", signUp: "Create account", email: "Email", password: "Password", name: "Display name", forgot: "Forgot password?", resetTitle: "Reset password", resetAction: "Send reset email", newPassword: "New password", savePassword: "Save new password", pending: "Check your inbox", pendingBody: "Verify your email before signing in to keep your account secure.", genericRecovery: "If that email is registered, a reset message is on its way.", genericRegister: "Check your inbox for the verification link.", invalid: "We could not complete that action. Check your details and try again.", close: "Close" },
    workspace: { title: "My Space", profile: "Profile", subscription: "Subscription", credits: "Available credits", history: "Credit history", free: "Free", noHistory: "No credit activity yet", signInTitle: "Sign in to view your space" },
    pricing: { title: "Choose how you want to use OneShowTools", subtitle: "Subscribe for monthly credits or top up whenever you need more. All prices are charged in USD.", monthly: "month", oneTime: "one-time", credits: "credits", subscribe: "Subscribe", topup: "Buy credits", disabled: "Payments are opening soon", limitations: "The checkout page is the source of truth for charges, renewal, and refund terms." },
    status: { loading: "Loading…", error: "Unable to load right now", verified: "Email verified. You can now sign in.", cancelled: "Checkout was cancelled and no charge was made.", billingSuccess: "Your payment is being confirmed. Access updates after provider confirmation." },
  }),
});

export const supportedLocales = Object.freeze(["zh-CN", "en"]);

export function resolveLocale() {
  const saved = localStorage.getItem("ost_locale");
  if (supportedLocales.includes(saved)) return saved;
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "zh-CN";
}

export function formatCurrency(amountMinor, currency, locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 100);
}

export function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(value, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}
