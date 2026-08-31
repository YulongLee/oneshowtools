const musicPublicFields = new Set([
  "action", "mode", "title", "idea", "lyrics", "language", "genre", "mood",
  "instruments", "vocal", "durationSeconds", "variants", "locale",
]);

export function publicTaskInput(input, toolSlug) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  if (toolSlug !== "ai-music-studio") return input;
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => musicPublicFields.has(key)),
  );
}
