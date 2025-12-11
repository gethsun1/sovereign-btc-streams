import fs from "node:fs";
import path from "node:path";

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
  } catch {}
  fetch("http://127.0.0.1:7242/ingest/e5612b3c-fd69-47d1-802a-1b9c9bfbb225", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: entry,
  }).catch(() => {});
};

appendLog({
  hypothesisId: "H-runner-js",
  location: "scripts/demo-runner.js:18",
  message: "runner start",
});

import "ts-node/register/transpile-only";

appendLog({
  hypothesisId: "H-runner-js",
  location: "scripts/demo-runner.js:25",
  message: "ts-node register done",
});

try {
  await import("./demo-seed.ts");
  appendLog({
    hypothesisId: "H-runner-js",
    location: "scripts/demo-runner.js:32",
    message: "demo-seed imported",
  });
} catch (err) {
  appendLog({
    hypothesisId: "H-runner-js",
    location: "scripts/demo-runner.js:38",
    message: "demo-seed import failed",
    data: { error: String(err), stack: err?.stack },
  });
  console.error(err);
  process.exit(1);
}
