import assert from "node:assert/strict";
import test from "node:test";
import { catalogs, formatCurrency, formatDate, formatNumber, supportedLocales } from "../src/i18n.js";

const flatten = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof entry === "object" ? flatten(entry, path) : [[path, entry]];
  });

test("Chinese and English catalogs contain the same non-empty keys", () => {
  const [fallback, english] = supportedLocales.map((locale) => new Map(flatten(catalogs[locale])));
  assert.deepEqual([...english.keys()].sort(), [...fallback.keys()].sort());
  for (const [key, value] of fallback) {
    assert.equal(typeof value, "string", key);
    assert.ok(value.trim(), key);
    assert.ok(english.get(key)?.trim(), key);
    assert.doesNotMatch(value, /^[a-z]+\.[a-z.]+$/i);
    assert.doesNotMatch(english.get(key), /^[a-z]+\.[a-z.]+$/i);
  }
});

test("locale formatters preserve values while localizing presentation", () => {
  assert.match(formatCurrency(1200, "USD", "en"), /12\.00/);
  assert.equal(Number(formatNumber(1234567, "zh-CN").replaceAll(",", "")), 1234567);
  assert.notEqual(formatDate("2026-07-28T00:00:00Z", "zh-CN"), formatDate("2026-07-28T00:00:00Z", "en"));
});
