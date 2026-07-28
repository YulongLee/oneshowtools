export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });

export const error = (code, status = 400, details) =>
  json({ error: { code, ...(details ? { details } : {}) } }, status);

export async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw Object.assign(new Error("JSON_REQUIRED"), { status: 415 });
  }
  return request.json();
}

export const correlationId = (request) =>
  request.headers.get("x-correlation-id") || crypto.randomUUID();
