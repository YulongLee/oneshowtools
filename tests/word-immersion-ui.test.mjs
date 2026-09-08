import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

test("reader and review screens render saved progress and actionable empty states", async () => {
  const server = await createServer({ configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom" });
  try {
    const { Reader, Vocabulary } = await server.ssrLoadModule("/src/WordImmersionReader.jsx");
    const document = { id: "doc", title: "测试读物", readingChapter: 0, readingProgress: 0, immersionLevel: 20, vocabularyBook: { nameZh: "我的词库" }, chapters: [{ id: "c1", index: 0, title: "第一章", completed: false, sourceText: "保持学习动力", segments: [{ type: "normal", text: "保持" }, { type: "word", word: "momentum", text: "momentum（动力）" }] }] };
    const html = renderToStaticMarkup(React.createElement(Reader, { document, onBack() {}, onProgress: async () => ({ percentage: 0 }), onWord: async () => {} }));
    assert.match(html, /已读 0%/);
    assert.match(html, /标记本章读完/);
    assert.match(html, /查看原文/);
    assert.match(html, /momentum（动力）/);
    assert.match(html, /aria-label="章节目录"/);
    const empty = renderToStaticMarkup(React.createElement(Vocabulary, { vocabulary: { words: [], stats: { encountered: 0, known: 0 } }, onBack() {}, onAction: async () => {} }));
    assert.match(empty, /打开一篇沉浸读物后/);
    assert.match(empty, /disabled=""[^>]*>开始今日复习（0）/);
  } finally { await server.close(); }
});
