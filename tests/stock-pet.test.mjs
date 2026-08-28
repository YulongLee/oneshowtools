import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  isAShareTradingSession,
  isMarketTradingSession,
  STOCK_PET_DOWNLOAD_TTL_SECONDS,
  stockMarketState,
} from "../server/stock-pet.mjs";
import {
  MarketDataService,
  TencentFinanceMarketDataProvider,
  normalizeMarketSymbol,
  parseTencentQuotes,
  parseTencentHistory,
  parseTencentSearch,
  toTencentSymbol,
} from "../server/market-data.mjs";
import { testStockMarketProviderConfiguration } from "../server/stock-market-provider.mjs";
import {
  signStockPetRelease,
  stockPetReleaseObject,
} from "../server/object-storage.mjs";

test("stock pet maps every market movement state", () => {
  assert.equal(stockMarketState(10, { limitStatus: "up" }), "LIMIT_UP");
  assert.equal(stockMarketState(4), "STRONG_UP");
  assert.equal(stockMarketState(1), "UP");
  assert.equal(stockMarketState(0), "FLAT");
  assert.equal(stockMarketState(-1), "DOWN");
  assert.equal(stockMarketState(-4), "STRONG_DOWN");
  assert.equal(stockMarketState(-10, { limitStatus: "down" }), "LIMIT_DOWN");
  assert.equal(stockMarketState(10), "STRONG_UP");
  assert.equal(stockMarketState(1, { alert: true }), "ALERT");
  assert.equal(stockMarketState(1, { loading: true }), "LOADING");
  assert.equal(stockMarketState(1, { offline: true }), "OFFLINE");
  assert.equal(stockMarketState(1, { closed: true }), "CLOSED");
});

test("A-share session calendar uses Asia/Shanghai market hours", () => {
  assert.equal(isAShareTradingSession(new Date("2026-08-26T02:00:00.000Z")), true);
  assert.equal(isAShareTradingSession(new Date("2026-08-26T04:00:00.000Z")), false);
  assert.equal(isAShareTradingSession(new Date("2026-08-29T02:00:00.000Z")), false);
  const previous = process.env.STOCK_MARKET_CLOSED_DATES;
  process.env.STOCK_MARKET_CLOSED_DATES = "2026-08-26";
  assert.equal(isAShareTradingSession(new Date("2026-08-26T02:00:00.000Z")), false);
  if (previous === undefined) delete process.env.STOCK_MARKET_CLOSED_DATES;
  else process.env.STOCK_MARKET_CLOSED_DATES = previous;
});

test("market sessions cover A shares, Hong Kong and US time zones", () => {
  assert.equal(isMarketTradingSession("HK", new Date("2026-08-26T02:00:00.000Z")), true);
  assert.equal(isMarketTradingSession("US", new Date("2026-08-25T15:00:00.000Z")), true);
  assert.equal(isMarketTradingSession("US", new Date("2026-08-29T15:00:00.000Z")), false);
});

test("Tencent symbols normalize across A-share, Hong Kong and US markets", () => {
  assert.equal(normalizeMarketSymbol("600519.SH"), "600519.SS");
  assert.equal(normalizeMarketSymbol("700.hk"), "00700.HK");
  assert.equal(normalizeMarketSymbol("aapl.us"), "AAPL.US");
  assert.equal(toTencentSymbol("600519.SS"), "sh600519");
  assert.equal(toTencentSymbol("00700.HK"), "hk00700");
  assert.equal(toTencentSymbol("AAPL.US"), "usAAPL");
});

test("Tencent quote and symbol search payloads are normalized", () => {
  const text = [
    'v_sh600519="1~贵州茅台~600519~1302.07~1304.00~1300.00~21266~~~~~~~~~~~~~~~~~~~~~~~~20260826145510~-1.93~-0.15~1314.45~1295.00~CNY";',
    'v_hk00700="100~腾讯控股~00700~447.200~442.000~445.000~10648266~~~~~~~~~~~~~~~~~~~~~~~~2026/08/26 14:40:03~5.200~1.18~450.000~443.200~HKD";',
  ].join("\n");
  const quotes = parseTencentQuotes(text, ["600519.SS", "00700.HK"]);
  assert.equal(quotes.length, 2);
  assert.deepEqual(quotes.map(({ symbol, market }) => ({ symbol, market })), [
    { symbol: "600519.SS", market: "A" },
    { symbol: "00700.HK", market: "HK" },
  ]);
  assert.deepEqual(parseTencentSearch('v_hint="sh~600519~\\u8d35\\u5dde\\u8305\\u53f0~gzmt~GP-A^us~AAPL~Apple Inc.~apple~GP"').map((item) => item.symbol), ["600519.SS", "AAPL.US"]);
});

test("Tencent provider uses fixed server-side endpoints and GET requests", async () => {
  const calls = [];
  const provider = new TencentFinanceMarketDataProvider({
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), method: options.method });
      return new Response('v_usAAPL="200~苹果~AAPL.OQ~309.90~310.34~310.79~25869807~~~~~~~~~~~~~~~~~~~~~~~~2026-08-25 16:00:01~-0.44~-0.14~313.59~308.21~USD";', { status: 200 });
    },
  });
  const quotes = await provider.getQuotes(["AAPL.US"]);
  assert.equal(quotes[0].symbol, "AAPL.US");
  assert.equal(calls[0].method, "GET");
  assert.match(calls[0].url, /qt\.gtimg\.cn\/q=usAAPL/);
});

test("Tencent history parser normalizes daily and intraday points", () => {
  assert.deepEqual(parseTencentHistory({ data: { sh600519: { qfqday: [["2026-08-25", "10", "11", "12", "9", "100"]] } } }, "sh600519", "day"), [
    { time: "2026-08-25", open: 10, close: 11, high: 12, low: 9, volume: 100 },
  ]);
  assert.deepEqual(parseTencentHistory({ data: { sh600519: { data: { data: ["0930 10.50 20 210.00"] } } } }, "sh600519", "minute"), [
    { time: "0930", open: 10.5, close: 10.5, high: 10.5, low: 10.5, volume: 20, amount: 210 },
  ]);
});

test("Tencent provider requests history ranges without exposing provider codes to clients", async () => {
  const calls = [];
  const provider = new TencentFinanceMarketDataProvider({
    fetchImpl: async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ data: { sh600519: { qfqday: [["2026-08-25", "10", "11", "12", "9", "100"]] } } }), { status: 200 });
    },
  });
  const items = await provider.getHistory("600519.SS", { range: "1m" });
  assert.equal(items[0].close, 11);
  assert.match(calls[0], /param=sh600519%2Cday/);
});

test("Tencent provider resolves US exchange suffixes while using the base code for intraday history", async () => {
  const calls = [];
  const provider = new TencentFinanceMarketDataProvider({
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).includes("smartbox.gtimg.cn")) return new Response('v_hint="us~AAPL~Apple Inc.~apple~GP"');
      return new Response(JSON.stringify({ data: { usAAPL: { data: { data: ["1109 313.35 7763269"] } } } }), { status: 200 });
    },
  });
  const items = await provider.getHistory("AAPL.US", { range: "1d" });
  assert.equal(items[0].close, 313.35);
  assert.match(calls[1], /UsMinute\/query/);
  assert.match(calls[1], /code=usAAPL(?:&|$)/);
  assert.doesNotMatch(calls[1], /AAPL\.OQ/);
});

test("market data service batches requests and reuses short-lived cache", async () => {
  let calls = 0;
  const service = new MarketDataService({
    async getQuotes(symbols) {
      calls += 1;
      return symbols.map((symbol) => ({ symbol, price: 10 }));
    },
  }, 60_000);
  assert.equal((await service.getQuotes(["600519.SS", "000001.SZ"])).length, 2);
  assert.equal((await service.getQuotes(["600519.SS"])).length, 1);
  assert.equal(calls, 1);
});

test("market data service delegates searchable A-share catalog", async () => {
  const service = new MarketDataService({
    async getQuotes() { return []; },
    async searchSymbols(query) {
      return [{ symbol: "600519.SS", code: "600519", name: query }];
    },
  });
  assert.deepEqual(await service.searchSymbols("贵州茅台"), [
    { symbol: "600519.SS", code: "600519", name: "贵州茅台" },
  ]);
});

test("admin market provider validation checks quotes and search without exposing the key", async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    const searching = String(url).includes("search");
    return new Response(JSON.stringify(searching
      ? { items: [{ symbol: "600519.SH", code: "600519", name: "贵州茅台", market: "A" }] }
      : { quotes: [{ symbol: "600519.SH", name: "贵州茅台", price: 1680.5, change: 12.3, changePercent: 0.74, updatedAt: Date.now(), marketOpen: true }] }), { status: 200 });
  };
  const result = await testStockMarketProviderConfiguration({
    quoteUrl: "https://quotes.example.com/v1/quotes",
    searchUrl: "https://quotes.example.com/v1/search",
    apiKey: "secret-test-token",
  }, fakeFetch);
  assert.equal(result.status, "healthy");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].headers.authorization, "Bearer secret-test-token");
  assert.deepEqual(requests[0].body, { symbols: ["600519.SH"] });
});

test("stock pet release packages use an isolated versioned OSS path", () => {
  const env = {
    OSS_ACCESS_KEY_ID: "test-id",
    OSS_ACCESS_KEY_SECRET: "test-secret",
    OSS_BUCKET: "example-bucket",
    OSS_ENDPOINT: "https://oss-cn-shanghai.aliyuncs.com",
    OSS_REGION: "cn-shanghai",
    OSS_KEY_PREFIX: "oneshowtools",
  };
  assert.deepEqual(stockPetReleaseObject("windows", "0.1.0", env), {
    platform: "windows",
    version: "0.1.0",
    fileName: "niu-lai-le-0.1.0-windows-setup.exe",
    mimeType: "application/vnd.microsoft.portable-executable",
    objectKey: "oneshowtools/releases/stock-pet/0.1.0/niu-lai-le-0.1.0-windows-setup.exe",
  });
  assert.throws(() => stockPetReleaseObject("linux", "0.1.0", env), /DOWNLOAD_PLATFORM_INVALID/);
});

test("stock pet downloads are signed only after confirming the OSS object exists", async () => {
  const calls = [];
  const env = {
    OSS_ACCESS_KEY_ID: "test-id",
    OSS_ACCESS_KEY_SECRET: "test-secret",
    OSS_BUCKET: "example-bucket",
    OSS_ENDPOINT: "https://oss-cn-shanghai.aliyuncs.com",
    OSS_REGION: "cn-shanghai",
    OSS_KEY_PREFIX: "oneshowtools",
  };
  const result = await signStockPetRelease("macos", { version: "0.1.0", expires: 90, env }, () => ({
    async head(key) { calls.push(["head", key]); },
    async signatureUrlV4(method, expires, request, key) {
      calls.push(["sign", method, expires, request, key]);
      return "https://example-bucket.oss-cn-shanghai.aliyuncs.com/signed.dmg";
    },
  }));
  assert.equal(result.platform, "macos");
  assert.equal(result.url, "https://example-bucket.oss-cn-shanghai.aliyuncs.com/signed.dmg");
  assert.equal(calls[0][0], "head");
  assert.equal(calls[1][0], "sign");
  assert.equal(calls[1][2], 90);
});

test("stock pet commercial downloads use a short-lived private link", () => {
  assert.equal(STOCK_PET_DOWNLOAD_TTL_SECONDS, 60);
});

test("stock pet ships optimized transparent one-shot GIFs for every default action", async () => {
  const assetNames = [
    "alert.gif", "closed.gif", "confused.gif", "down.gif", "flat.gif",
    "limit-up.gif", "slight-loss.gif", "strong-up.gif", "up.gif",
  ];
  for (const assetName of assetNames) {
    const assetPath = new URL(`../apps/stock-pet/public/default-actions/${assetName}`, import.meta.url);
    const [buffer, details] = await Promise.all([readFile(assetPath), stat(assetPath)]);
    assert.equal(buffer.subarray(0, 6).toString("ascii"), "GIF89a", assetName);
    assert.equal(buffer.readUInt16LE(6), 480, `${assetName} width`);
    assert.equal(buffer.readUInt16LE(8), 480, `${assetName} height`);
    assert.ok(details.size > 500_000 && details.size < 7_000_000, `${assetName} optimized size`);
    assert.equal(buffer.includes(Buffer.from("NETSCAPE2.0")), false, `${assetName} must not jump-loop`);
    let hasTransparency = false;
    for (let index = 0; index < buffer.length - 4; index += 1) {
      if (buffer[index] === 0x21 && buffer[index + 1] === 0xf9 && buffer[index + 2] === 0x04) {
        hasTransparency ||= Boolean(buffer[index + 3] & 0x01);
      }
    }
    assert.equal(hasTransparency, true, `${assetName} transparent background`);
  }
});
