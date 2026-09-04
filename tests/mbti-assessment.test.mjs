import assert from "node:assert/strict";
import test from "node:test";
import { buildMbtiReport, mbtiQuestions, scoreMbtiAnswers } from "../shared/mbti-assessment.mjs";

test("MBTI self-test has a balanced original 64-question bank", () => {
  assert.equal(mbtiQuestions.length, 64);
  assert.equal(new Set(mbtiQuestions.map((item) => item.id)).size, 64);
  for (const axis of ["EI", "SN", "TF", "JP"]) {
    const questions = mbtiQuestions.filter((item) => item.axis === axis);
    assert.equal(questions.length, 16);
    assert.equal(questions.filter((item) => item.reversed).length, 8);
  }
  assert.deepEqual(mbtiQuestions.slice(0, 8).map((item) => item.axis), ["EI", "SN", "TF", "JP", "EI", "SN", "TF", "JP"]);
});

test("MBTI scoring returns a deterministic four-letter report", () => {
  const desired = { EI: "E", SN: "S", TF: "T", JP: "J" };
  const answers = Object.fromEntries(mbtiQuestions.map((item) => [item.id, item.leftCode === desired[item.axis] ? 1 : 5]));
  const scored = scoreMbtiAnswers(answers);
  assert.equal(scored.type, "ESTJ");
  const report = buildMbtiReport(answers, "zh", { durationSeconds: 480 });
  assert.equal(report.questionCount, 64);
  assert.equal(report.dimensions.length, 4);
  assert.equal(report.quality.status, "good");
  assert.match(report.disclaimer, /非 Myers-Briggs Company 官方/);
});

test("MBTI neutral and patterned submissions are not forced into ESTJ", () => {
  const neutral = Object.fromEntries(mbtiQuestions.map((item) => [item.id, 3]));
  const scored = scoreMbtiAnswers(neutral, { durationSeconds: 60 });
  assert.equal(scored.type, "XXXX");
  assert.equal(scored.ambiguousAxes.length, 4);
  assert.equal(scored.quality.status, "low");
  assert.ok(scored.quality.warnings.includes("NEUTRAL_RESPONSE_PATTERN"));
  assert.ok(scored.quality.warnings.includes("VERY_FAST_COMPLETION"));
  const report = buildMbtiReport(neutral, "zh", { durationSeconds: 60 });
  assert.match(report.workStyle, /保留调整方法/);
  assert.match(report.collaboration, /独立思考.*及时讨论/);
  assert.match(report.learning, /具体案例.*整体框架/);
  assert.ok(report.strengths.every((item) => !/目标拆解|直接沟通/.test(item)));
});

test("near-midpoint answers are reported as boundary preferences, not a definitive type", () => {
  const desired = { EI: "I", SN: "N", TF: "F", JP: "P" };
  const answers = Object.fromEntries(mbtiQuestions.map((item) => [item.id, 3]));
  for (const axis of Object.keys(desired)) {
    const item = mbtiQuestions.find((question) => question.axis === axis);
    answers[item.id] = item.leftCode === desired[axis] ? 1 : 5;
  }
  const scored = scoreMbtiAnswers(answers, { durationSeconds: 480 });
  assert.equal(scored.type, "XXXX");
  assert.equal(scored.resolvedType, "INFP");
  assert.equal(scored.ambiguousAxes.length, 4);
  assert.equal(scored.alternativeTypes.length, 16);
  assert.ok(scored.dimensions.every((item) => item.closeness === "balanced"));
  assert.ok(scored.stability < 30);
});

test("always choosing the same visual side does not create a personality type", () => {
  const answers = Object.fromEntries(mbtiQuestions.map((item) => [item.id, 1]));
  const scored = scoreMbtiAnswers(answers, { durationSeconds: 480 });
  assert.equal(scored.type, "XXXX");
  assert.equal(scored.ambiguousAxes.length, 4);
  assert.ok(scored.quality.warnings.includes("STRAIGHT_LINE_PATTERN"));
});

test("MBTI scoring rejects incomplete submissions", () => {
  assert.throws(() => scoreMbtiAnswers({}), /MBTI_ANSWERS_INCOMPLETE/);
});
