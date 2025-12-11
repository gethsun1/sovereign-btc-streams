// #region agent log import-note
// Note: relying on node-style specifier resolution via ts-node/esm.
// #endregion
import fs from "node:fs";
import path from "node:path";
import { depositVault } from "../lib/grail";
import { mintStreamCharm } from "../lib/charms";
import { btcToSats, nowUnix } from "../lib/utils";

const LOG_PATH = path.join(process.cwd(), ".cursor", "debug.log");
const appendLog = (payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) => {
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

async function main() {
  appendLog({
    hypothesisId: "H1",
    location: "scripts/demo-seed.ts:33",
    message: "demo seed start",
  });

  const totalAmountBtc = 0.001;
  const totalAmountSats = btcToSats(totalAmountBtc);
  const start = nowUnix();
  const cliff = start;

  console.log("Seeding demo stream with mock/testnet integrations...");
  appendLog({
    hypothesisId: "H1",
    location: "scripts/demo-seed.ts:45",
    message: "before depositVault",
    data: { totalAmountSats, beneficiary: "bc1qdemoaddress" },
  });
  const vault = await depositVault(totalAmountSats, "bc1qdemoaddress", "standard");
  appendLog({
    hypothesisId: "H1",
    location: "scripts/demo-seed.ts:53",
    message: "after depositVault",
    data: { vaultId: vault.vault_id },
  });
  const charm = await mintStreamCharm({
    vaultId: vault.vault_id,
    totalAmountSats,
    rateSatsPerSec: 50,
    startUnix: start,
    cliffUnix: cliff,
    beneficiary: "bc1qdemoaddress",
    revocationPubkey: "revoker_pubkey_demo",
  });

  console.log("Vault ID:", vault.vault_id);
  console.log("Stream ID:", charm.stream_id);
  console.log("Charm ID:", charm.charm_id);
  console.log("Run `npm run dev` and visit /claim to test claims.");
}

main().catch((err) => {
  console.error("Demo seed failed", err);
  process.exit(1);
});
