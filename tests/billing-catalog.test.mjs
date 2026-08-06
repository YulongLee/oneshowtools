import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const dataDirectory = await mkdtemp(join(tmpdir(), "oneshowtools-billing-"));
process.env.DATA_DIR = dataDirectory;
process.env.APP_URL = "http://localhost";
process.env.BILLING_ENABLED = "false";

const { handleApi } = await import(`../server/api.mjs?billing=${Date.now()}`);

test("commercial catalog exposes five top-ups and three monthly memberships", async () => {
  const response = await handleApi(new Request("http://localhost/api/plans"));
  assert.equal(response.status, 200);
  const { plans } = await response.json();
  assert.equal(plans.length, 8);
  assert.equal(plans.every((plan) => plan.currency === "CNY"), true);
  assert.deepEqual(plans.filter((plan) => plan.kind === "topup").map((plan) => plan.amountMinor), [1990, 4990, 9900, 19900, 49900]);
  assert.deepEqual(plans.filter((plan) => plan.kind === "membership").map((plan) => plan.recurringCredits), [300, 8000, 25000]);
  const business = plans.find((plan) => plan.code === "business-topup");
  assert.equal(business.bonusCredits, 20000);
  assert.equal(business.totalCredits, 90000);
  const max = plans.find((plan) => plan.code === "max-monthly");
  assert.equal(max.benefitsZh.includes("Agent 自动运行"), true);
});

test("checkout is never exposed to an unauthenticated visitor", async () => {
  const response = await handleApi(new Request("http://localhost/api/billing/checkout", { method: "POST" }));
  assert.equal(response.status, 401);
});

test.after(async () => rm(dataDirectory, { recursive: true, force: true }));
