import { spawn } from "node:child_process";

const forwarded = process.argv.slice(2);
const viteArgs = ["vite", ...(forwarded.length ? forwarded : ["--host", "0.0.0.0", "--port", "5173"])];
const developmentEnv = { ...process.env, APP_URL: process.env.APP_URL || "http://localhost:5173" };
const api = spawn(process.execPath, ["server/index.mjs"], { stdio: "inherit", env: developmentEnv });
const web = spawn(process.platform === "win32" ? "npx.cmd" : "npx", viteArgs, { stdio: "inherit", env: process.env });

let closing = false;
const close = (code = 0) => {
  if (closing) return;
  closing = true;
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  setTimeout(() => process.exit(code), 100);
};

api.on("exit", (code) => {
  if (!closing) close(code || 1);
});
web.on("exit", (code) => {
  if (!closing) close(code || 0);
});
process.on("SIGINT", () => close(0));
process.on("SIGTERM", () => close(0));
