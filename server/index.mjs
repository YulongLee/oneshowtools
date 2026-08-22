import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { Readable } from "node:stream";
import { handleApi } from "./api.mjs";
import { getServerConfig, validateServerConfig } from "./config.mjs";
import { startWorker, stopWorker } from "./jobs.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const clientRoot = resolve(projectRoot, "dist/client");
const port = Number(process.env.API_PORT || process.env.PORT || 8787);
const host = process.env.API_HOST || "0.0.0.0";
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const startupConfig = getServerConfig(process.env.APP_URL || `http://${host}:${port}`);
const startupConfigurationErrors = validateServerConfig(startupConfig);
if (startupConfigurationErrors.length) {
  console.error(`Commercial capabilities disabled: ${startupConfigurationErrors.join(", ")}`);
}

function toRequest(req) {
  const origin = process.env.APP_URL || `http://${req.headers.host || `localhost:${port}`}`;
  const init = {
    method: req.method,
    headers: req.headers,
  };
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }
  return new Request(new URL(req.url, origin), init);
}

async function sendResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) return res.end();
  for await (const chunk of Readable.fromWeb(response.body)) res.write(chunk);
  res.end();
}

function serveFile(res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const candidate = resolve(clientRoot, `.${requested}`);
  const safe = candidate.startsWith(clientRoot);
  const target = safe && existsSync(candidate) ? candidate : resolve(clientRoot, "index.html");
  if (!existsSync(target)) return false;
  res.statusCode = 200;
  res.setHeader("content-type", mimeTypes[extname(target)] || "application/octet-stream");
  res.setHeader("x-content-type-options", "nosniff");
  createReadStream(target).pipe(res);
  return true;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      return sendResponse(res, await handleApi(toRequest(req)));
    }
    if (!serveFile(res, url.pathname)) {
      res.statusCode = 404;
      res.end("Run npm run build before starting the production server.");
    }
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { code: "INTERNAL_ERROR" } }));
  }
});

server.listen(port, host, () => {
  startWorker();
  console.log(`OneShowTools API listening on http://${host}:${port}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => {
    stopWorker();
    server.close(() => process.exit(0));
  });
}
