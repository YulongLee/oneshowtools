import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to index.html for an unknown app route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
            headers: url.pathname === "/index.html" ? { "content-type": "text/html" } : undefined,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-cache, no-store, must-revalidate");
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/index.html"]);
});

test("never leaves the directly served app shell on a stale deployment", async () => {
  const response = await worker.fetch(new Request("https://example.test/", {
    headers: { accept: "text/html" },
  }), {
    ASSETS: {
      fetch: async () => new Response("app", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" },
      }),
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-cache, no-store, must-revalidate");
  assert.equal(response.headers.get("pragma"), "no-cache");
});

test("static app shell disables stale browser and edge caching", async () => {
  const headersFile = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headersFile, /^\/\s*\n\s+Cache-Control: no-cache, no-store, must-revalidate/m);
  assert.match(headersFile, /^\/index\.html\s*\n\s+Cache-Control: no-cache, no-store, must-revalidate/m);
  assert.match(headersFile, /^\/assets\/\*\s*\n\s+Cache-Control: public, max-age=31536000, immutable/m);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const [request, expectedAssetCalls] of [
    [new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }), 0],
    [new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }), 1],
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, expectedAssetCalls);
  }
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});
