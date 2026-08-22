import assert from "node:assert/strict";
import test from "node:test";
import { createPlatformClient, PlatformError } from "../packages/platform-client/index.js";

test("shared native client persists bearer sessions and sends the platform contract", async () => {
  const calls = [];
  let stored = null;
  const client = createPlatformClient({
    baseUrl: "https://api.example.com/",
    clientKind: "mobile",
    tokenStore: { get: async () => stored, set: async (value) => { stored = value; } },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/api/auth/login")) return Response.json({ user: { id: "u1" }, accessToken: "a".repeat(43) });
      return Response.json({ metrics: { credits: 200 } });
    },
  });
  await client.login("owner@example.com", "password");
  assert.equal(stored, "a".repeat(43));
  await client.dashboard();
  assert.equal(calls[0].url, "https://api.example.com/api/auth/login");
  assert.equal(calls[0].options.headers["x-oneshow-client"], "mobile");
  assert.equal(calls[1].options.headers.authorization, `Bearer ${"a".repeat(43)}`);
});

test("shared native client exposes stable provider error codes", async () => {
  const client = createPlatformClient({
    baseUrl: "https://api.example.com",
    clientKind: "wechat-miniprogram",
    fetchImpl: async () => Response.json({ error: { code: "INSUFFICIENT_CREDITS" } }, { status: 402 }),
  });
  await assert.rejects(client.dashboard(), (error) => error instanceof PlatformError
    && error.code === "INSUFFICIENT_CREDITS" && error.status === 402);
});
