import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LOG_PATH = path.join(process.cwd(), ".cursor", "debug.log");

const appendLog = (payload) => {
  const entry = JSON.stringify({
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId: payload.hypothesisId,
    location: payload.location,
    message: payload.message,
    data: payload.data ?? {},
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
  hypothesisId: "H-resolve",
  location: "scripts/demo-runner.mjs:21",
  message: "runner start",
});

const target = pathToFileURL(path.join(process.cwd(), "scripts", "demo-seed.ts")).href;

appendLog({
  hypothesisId: "H-resolve",
  location: "scripts/demo-runner.mjs:27",
  message: "before import",
  data: { target },
});

try {
  await import(target);
  appendLog({
    hypothesisId: "H-resolve",
    location: "scripts/demo-runner.mjs:35",
    message: "import succeeded",
    data: { target },
  });
} catch (err) {
  appendLog({
    hypothesisId: "H-resolve",
    location: "scripts/demo-runner.mjs:43",
    message: "import failed",
    data: { target, error: String(err), stack: err?.stack },
  });
  console.error(err);
  process.exit(1);
}
