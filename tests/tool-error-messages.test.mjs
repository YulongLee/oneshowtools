import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCode, slidingAncestorErrorMessage } from "../src/toolErrorMessages.js";

test("API error parsing supports the server's nested commercial error envelope", () => {
  assert.equal(apiErrorCode({ error: { code: "USER_FILE_LIMIT_REACHED" } }), "USER_FILE_LIMIT_REACHED");
  assert.equal(apiErrorCode({ error: "IMAGE_PROVIDER_TIMEOUT" }), "IMAGE_PROVIDER_TIMEOUT");
  assert.equal(apiErrorCode({}), "REQUEST_FAILED");
});

test("sliding generator errors explain both cause and recovery action", () => {
  const fileLimit = slidingAncestorErrorMessage("USER_FILE_LIMIT_REACHED", "zh-CN");
  assert.match(fileLimit, /10 张/);
  assert.match(fileLimit, /会员的文件额度/);
  assert.match(fileLimit, /文件中心/);
  assert.match(slidingAncestorErrorMessage("IMAGE_PROVIDER_RATE_LIMITED", "zh-CN"), /等待 1–2 分钟/);
  assert.match(slidingAncestorErrorMessage("IMAGE_PROVIDER_MODEL_UNAVAILABLE", "zh-CN"), /模型授权/);
  assert.match(slidingAncestorErrorMessage("SOMETHING_NEW", "zh-CN"), /错误码：SOMETHING_NEW/);
});
