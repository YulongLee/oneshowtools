// The model proposes replacements; it never owns the unmodified source text.
export function buildImmersionSegments(raw, source, words, learned = []) {
  const invalid = () => Object.assign(new Error("IMMERSION_INVALID_MODEL_OUTPUT"), { code: "IMMERSION_INVALID_MODEL_OUTPUT", status: 502, retryable: true });
  let payload;
  try { payload = JSON.parse(String(raw).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); } catch { throw invalid(); }
  const proposals = payload?.replacements;
  if (!Array.isArray(proposals) || proposals.length > 800) throw invalid();
  const vocabulary = new Map(words.map(w => [w.word.toLowerCase(), w]));
  const memory = new Map(learned.map(w => [w.word.toLowerCase(), w]));
  const spans = [];
  for (const proposal of proposals) {
    const word = typeof proposal?.word === "string" ? proposal.word.toLowerCase().trim() : "";
    const entry = vocabulary.get(word);
    const original = proposal?.original;
    const english = proposal?.english || word;
    const occurrence = proposal?.occurrence ?? 1;
    if (!entry || typeof original !== "string" || !original.length || original.length > 80 || /\d/.test(original)
      || typeof english !== "string" || english.length > 100 || !/^[a-zA-Z][a-zA-Z '-]*$/.test(english)
      || !Number.isInteger(occurrence) || occurrence < 1 || occurrence > 500) throw invalid();
    let start = -1;
    for (let n = 0; n < occurrence; n++) { start = source.indexOf(original, start + 1); if (start < 0) throw invalid(); }
    const end = start + original.length;
    if (spans.some(s => start < s.end && end > s.start)) throw invalid();
    const known = memory.get(word);
    spans.push({ start, end, segment: { type: "word", word, english, original,
      text: known?.knownStatus === "known" ? english : `${english}（${original}）`,
      translation: entry.translation, phonetic: entry.phonetic || "", exposureLevel: known?.knownStatus === "known" ? 4 : 1 } });
  }
  spans.sort((a,b) => a.start - b.start);
  const segments = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) segments.push({ type: "normal", text: source.slice(cursor, span.start) });
    segments.push(span.segment); cursor = span.end;
  }
  if (cursor < source.length) segments.push({ type: "normal", text: source.slice(cursor) });
  return segments;
}
