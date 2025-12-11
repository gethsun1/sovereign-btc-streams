const fs = require("node:fs");
const path = require("node:path");

const LOG_PATH = path.join(process.cwd(), ".cursor", "debug.log");

const appendLog = (payload) => {
  const entry = JSON.stringify({
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: payload.hypothesisId,
    location: payload.location,
    message: payload.message,
    data: payload.data || {},
    timestamp: Date.now(),
  });
  try {
    fs.appendFileSync(LOG_PATH, `${entry}\n`);
  } catch {
    // ignore
  }
  fetch("http://127.0.0.1:7242/ingest/e5612b3c-fd69-47d1-802a-1b9c9bfbb225", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: entry,
  }).catch(() => {});
};

appendLog({
  hypothesisId: "H-runner",
  location: "scripts/demo-runner.cjs:24",
  message: "runner start",
});

try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: { module: "CommonJS", moduleResolution: "node" },
  });
  appendLog({
    hypothesisId: "H-runner",
    location: "scripts/demo-runner.cjs:33",
    message: "ts-node register success",
  });
} catch (err) {
  appendLog({
    hypothesisId: "H-runner",
    location: "scripts/demo-runner.cjs:38",
    message: "ts-node register failed",
    data: { error: String(err), stack: err?.stack },
  });
  console.error(err);
  process.exit(1);
}

try {
  require("./demo-seed.ts");
  appendLog({
    hypothesisId: "H-runner",
    location: "scripts/demo-runner.cjs:48",
    message: "demo-seed required",
  });
} catch (err) {
  appendLog({
    hypothesisId: "H-runner",
    location: "scripts/demo-runner.cjs:53",
    message: "demo-seed require failed",
    data: { error: String(err), stack: err?.stack },
  });
  console.error(err);
  process.exit(1);
}
