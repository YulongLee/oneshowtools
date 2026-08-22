import Taro from "@tarojs/taro";

export const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || "https://www.gameforcast.top";
const tokenKey = "ost_access_token";

export class ApiError extends Error {
  constructor(code, status) { super(code || "REQUEST_FAILED"); this.code = code || "REQUEST_FAILED"; this.status = status; }
}

export async function request(path, { method = "GET", data, form = false } = {}) {
  const token = Taro.getStorageSync(tokenKey);
  const result = await Taro.request({
    url: `${API_BASE_URL}${path}`,
    method,
    data,
    header: {
      "x-oneshow-client": "wechat-miniprogram",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(form ? {} : { "content-type": "application/json" }),
    },
  });
  if (result.statusCode < 200 || result.statusCode >= 300) throw new ApiError(result.data?.error?.code, result.statusCode);
  return result.data;
}

export function saveSession(payload) {
  if (!payload?.accessToken) throw new ApiError("NATIVE_SESSION_MISSING", 500);
  Taro.setStorageSync(tokenKey, payload.accessToken);
  return payload;
}
export const hasSession = () => Boolean(Taro.getStorageSync(tokenKey));
export const clearSession = () => Taro.removeStorageSync(tokenKey);
export const api = {
  health: () => request("/api/health"), tools: () => request("/api/tools"), dashboard: () => request("/api/dashboard"),
  tasks: () => request("/api/tasks"), files: () => request("/api/files"), session: () => request("/api/auth/session"),
  login: (email, password) => request("/api/auth/login", { method: "POST", data: { email, password } }).then(saveSession),
  register: (data) => request("/api/auth/register", { method: "POST", data }),
  sendSms: (phone) => request("/api/auth/sms/send", { method: "POST", data: { phone } }),
  verifySms: (phone, code) => request("/api/auth/sms/verify", { method: "POST", data: { phone, code, name: "微信用户", locale: "zh-CN" } }).then(saveSession),
  wechatLogin: (code) => request("/api/auth/wechat-miniprogram", { method: "POST", data: { code, name: "微信用户", locale: "zh-CN" } }).then(saveSession),
  createMusic: (data) => request("/api/music/generations", { method: "POST", data }),
  logout: async () => { try { await request("/api/auth/logout", { method: "POST" }); } finally { clearSession(); } },
};

export async function uploadTool(slug, filePath, formData = {}) {
  const token = Taro.getStorageSync(tokenKey);
  const result = await Taro.uploadFile({
    url: `${API_BASE_URL}/api/tool-actions/${encodeURIComponent(slug)}`,
    filePath,
    name: "file",
    formData,
    header: { "x-oneshow-client": "wechat-miniprogram", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  let payload = {};
  try { payload = JSON.parse(result.data || "{}"); } catch {}
  if (result.statusCode < 200 || result.statusCode >= 300) throw new ApiError(payload?.error?.code, result.statusCode);
  return payload;
}

export function requireLogin() {
  if (hasSession()) return true;
  Taro.navigateTo({ url: "/pages/login/index" });
  return false;
}

export const errorText = (error) => ({
  INVALID_CREDENTIALS: "邮箱或密码不正确", EMAIL_UNVERIFIED: "请先前往邮箱完成验证",
  SMS_CODE_INVALID: "短信验证码不正确", SMS_CODE_EXPIRED: "验证码已过期",
  SMS_RATE_LIMITED: "操作频繁，请稍后再试", WECHAT_MINIPROGRAM_UNAVAILABLE: "微信快捷登录尚未配置",
  WECHAT_LOGIN_FAILED: "微信登录失败，请重试", UNAUTHENTICATED: "登录已过期，请重新登录",
}[error?.code] || `请求失败（${error?.code || "NETWORK_ERROR"}）`);
