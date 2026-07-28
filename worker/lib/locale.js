export const supportedLocales = ["zh-CN", "en"];

export function normalizeLocale(value) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "zh-cn" || normalized.startsWith("zh")) return "zh-CN";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return null;
}

export function resolveRequestLocale(request, profileLocale) {
  if (normalizeLocale(profileLocale)) return normalizeLocale(profileLocale);
  const cookie = request.headers.get("cookie") || "";
  const visitor = cookie.match(/(?:^|;\s*)ost_locale=([^;]+)/)?.[1];
  if (normalizeLocale(visitor)) return normalizeLocale(visitor);
  const accepted = request.headers.get("accept-language")?.split(",") || [];
  for (const entry of accepted) {
    const locale = normalizeLocale(entry.split(";")[0].trim());
    if (locale) return locale;
  }
  return "zh-CN";
}
