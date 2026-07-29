import { db } from "./database.mjs";

const prompts = {
  "copy-polish": {
    zh: "请润色下面的中文或英文文案。保留原意，提升清晰度、自然度和专业度。只输出润色后的内容。",
    en: "Polish the following copy while preserving its meaning. Improve clarity, flow, and professionalism. Return only the revised copy.",
  },
  "pdf-summary": {
    zh: "请把下面的文档内容整理为结构清晰的摘要，包含核心结论和要点。",
    en: "Summarize the following document with a clear structure, key conclusions, and bullet points.",
  },
  "speech-to-text": {
    zh: "将提供的语音内容转写为文本。",
    en: "Transcribe the supplied audio into text.",
  },
};

async function runOpenAiTask(task, tool, input) {
  if (!process.env.OPENAI_API_KEY) {
    return { status: "waiting_for_runtime", errorCode: "OPENAI_NOT_CONFIGURED" };
  }
  if (tool.slug === "speech-to-text") {
    return { status: "waiting_for_runtime", errorCode: "AUDIO_RUNTIME_NOT_CONFIGURED" };
  }
  const text = String(input.text || "").trim();
  if (!text) return { status: "failed", errorCode: "TEXT_REQUIRED" };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: `${prompts[tool.slug]?.[input.locale === "en" ? "en" : "zh"]}\n\n${text}`,
    }),
  });
  if (!response.ok) return { status: "failed", errorCode: `OPENAI_${response.status}` };
  const payload = await response.json();
  return { status: "completed", output: { text: payload.output_text || "" } };
}

async function runExternalTask(task, tool, input) {
  if (!tool.runtime_url) {
    return { status: "waiting_for_runtime", errorCode: "TOOL_RUNTIME_NOT_CONFIGURED" };
  }
  const response = await fetch(`${tool.runtime_url.replace(/\/$/, "")}/${tool.slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.TOOL_RUNTIME_TOKEN ? { authorization: `Bearer ${process.env.TOOL_RUNTIME_TOKEN}` } : {}),
    },
    body: JSON.stringify({ taskId: task.id, input }),
  });
  if (!response.ok) return { status: "failed", errorCode: `RUNTIME_${response.status}` };
  return { status: "completed", output: await response.json() };
}

export async function executeTask(taskId) {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task || task.status !== "queued") return;
  const tool = db.prepare("SELECT * FROM tools WHERE id = ?").get(task.tool_id);
  const input = JSON.parse(task.input_json || "{}");
  db.prepare("UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ?").run(Date.now(), taskId);
  let result;
  try {
    result = tool.runtime_kind === "openai"
      ? await runOpenAiTask(task, tool, input)
      : await runExternalTask(task, tool, input);
  } catch {
    result = { status: "failed", errorCode: "RUNTIME_REQUEST_FAILED" };
  }
  const completedAt = result.status === "completed" || result.status === "failed" ? Date.now() : null;
  db.prepare(`
    UPDATE tasks SET status = ?, output_json = ?, error_code = ?, updated_at = ?, completed_at = ? WHERE id = ?
  `).run(result.status, result.output ? JSON.stringify(result.output) : null, result.errorCode || null, Date.now(), completedAt, taskId);

  if (result.status !== "completed" && task.credit_cost > 0) {
    db.prepare(`
      INSERT OR IGNORE INTO credit_ledger
      (id, user_id, type, amount, description_zh, description_en, reference_type, reference_id, created_at)
      VALUES (?, ?, 'refund', ?, '任务未执行，积分已退回', 'Task did not run; credits refunded', 'task', ?, ?)
    `).run(crypto.randomUUID(), task.user_id, task.credit_cost, task.id, Date.now());
  }
}
