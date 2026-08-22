export const API_PATHS = Object.freeze({
  health: "/api/health",
  tools: "/api/tools",
  plans: "/api/plans",
  login: "/api/auth/login",
  register: "/api/auth/register",
  smsSend: "/api/auth/sms/send",
  smsVerify: "/api/auth/sms/verify",
  wechatLogin: "/api/auth/wechat-miniprogram",
  logout: "/api/auth/logout",
  session: "/api/auth/session",
  dashboard: "/api/dashboard",
  credits: "/api/credits",
  tasks: "/api/tasks",
  files: "/api/files",
});

export class PlatformError extends Error {
  constructor(code, status, payload) {
    super(code || "REQUEST_FAILED");
    this.name = "PlatformError";
    this.code = code || "REQUEST_FAILED";
    this.status = status;
    this.payload = payload;
  }
}

export function resolveApiUrl(baseUrl, path) {
  return `${String(baseUrl || "").replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createPlatformClient({ baseUrl, clientKind, fetchImpl = globalThis.fetch, tokenStore }) {
  if (!baseUrl) throw new Error("PLATFORM_BASE_URL_REQUIRED");
  if (!["mobile", "wechat-miniprogram"].includes(clientKind)) throw new Error("PLATFORM_CLIENT_KIND_INVALID");
  if (typeof fetchImpl !== "function") throw new Error("PLATFORM_FETCH_REQUIRED");
  let accessToken = null;

  const setToken = async (value) => {
    accessToken = value || null;
    if (tokenStore?.set) await tokenStore.set(accessToken);
  };
  const restore = async () => {
    accessToken = await tokenStore?.get?.() || null;
    return accessToken;
  };
  const request = async (path, options = {}) => {
    const headers = { "x-oneshow-client": clientKind, ...(options.headers || {}) };
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    let body = options.body;
    if (body != null && !(body instanceof FormData) && typeof body !== "string") {
      headers["content-type"] = "application/json";
      body = JSON.stringify(body);
    }
    const response = await fetchImpl(resolveApiUrl(baseUrl, path), { ...options, headers, body });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new PlatformError(payload?.error?.code, response.status, payload);
    return payload;
  };
  const acceptLogin = async (payload) => {
    if (!payload?.accessToken) throw new PlatformError("NATIVE_SESSION_MISSING", 500, payload);
    await setToken(payload.accessToken);
    return payload;
  };

  return {
    restore,
    setToken,
    hasSession: () => Boolean(accessToken),
    request,
    login: (email, password) => request(API_PATHS.login, { method: "POST", body: { email, password } }).then(acceptLogin),
    register: (data) => request(API_PATHS.register, { method: "POST", body: data }),
    sendSms: (phone) => request(API_PATHS.smsSend, { method: "POST", body: { phone } }),
    verifySms: (phone, code, name, locale = "zh-CN") => request(API_PATHS.smsVerify, { method: "POST", body: { phone, code, name, locale } }).then(acceptLogin),
    loginWithWechat: (code, name, locale = "zh-CN") => request(API_PATHS.wechatLogin, { method: "POST", body: { code, name, locale } }).then(acceptLogin),
    logout: async () => {
      try { await request(API_PATHS.logout, { method: "POST" }); }
      finally { await setToken(null); }
    },
    health: () => request(API_PATHS.health),
    tools: () => request(API_PATHS.tools),
    plans: () => request(API_PATHS.plans),
    session: () => request(API_PATHS.session),
    dashboard: () => request(API_PATHS.dashboard),
    credits: () => request(API_PATHS.credits),
    tasks: () => request(API_PATHS.tasks),
    files: () => request(API_PATHS.files),
    fileDownloadUrl: (id) => resolveApiUrl(baseUrl, `/api/files/${encodeURIComponent(id)}/download`),
  };
}
