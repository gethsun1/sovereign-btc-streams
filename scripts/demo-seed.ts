// #region agent log import-note
// Note: This script is run via demo-runner.cjs which registers ts-node with CommonJS
// #endregion
import fs from "node:fs";
import path from "node:path";
import crypto from "crypto";
import { mintStreamCharm } from "../lib/charms";
import { createStream, StreamRecord } from "../lib/db";
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
  }).catch(() => { });
};

async function main() {
  appendLog({
    hypothesisId: "H1",
    location: "scripts/demo-seed.ts:33",
    message: "demo seed start",
  });

  console.log("🌱 Seeding demo streams for hackathon demo...");
  console.log("Creating 3 demo streams with different vesting schedules...\n");

  const now = nowUnix();
  const oneHourAgo = now - 3600; // 1 hour ago
  const oneDayAgo = now - 86400; // 1 day ago
  const oneWeekAgo = now - 604800; // 1 week ago

  // Stream 1: Fast vesting (started 1 hour ago, high rate) - ready to claim
  const stream1 = {
    totalAmountBtc: 0.01,
    totalAmountSats: btcToSats(0.01),
    startUnix: oneHourAgo,
    cliffUnix: oneHourAgo,
    rateSatsPerSec: 100, // 100 sats/sec = 0.36 BTC/hour
    beneficiary: "tb1p8p827ee4efsct5euhpsgwxvccmdsc99uxuyq7zayvefml3jayswq9vrn8x",
    vaultId: "mock_scrolls_vault_demo1",
    description: "Fast vesting stream (started 1h ago)",
  };

  // Stream 2: Medium vesting (started 1 day ago, medium rate) - some vested
  const stream2 = {
    totalAmountBtc: 0.05,
    totalAmountSats: btcToSats(0.05),
    startUnix: oneDayAgo,
    cliffUnix: oneDayAgo,
    rateSatsPerSec: 10, // 10 sats/sec = 0.864 BTC/day
    beneficiary: "tb1p8p827ee4efsct5euhpsgwxvccmdsc99uxuyq7zayvefml3jayswq9vrn8x",
    vaultId: "mock_scrolls_vault_demo2",
    description: "Medium vesting stream (started 1 day ago)",
  };

  // Stream 3: Slow vesting (started 1 week ago, low rate) - mostly vested
  const stream3 = {
    totalAmountBtc: 0.1,
    totalAmountSats: btcToSats(0.1),
    startUnix: oneWeekAgo,
    cliffUnix: oneWeekAgo,
    rateSatsPerSec: 1, // 1 sat/sec = 0.0864 BTC/day
    beneficiary: "tb1p8p827ee4efsct5euhpsgwxvccmdsc99uxuyq7zayvefml3jayswq9vrn8x",
    vaultId: "mock_scrolls_vault_demo3",
    description: "Slow vesting stream (started 1 week ago)",
  };

  const streams = [stream1, stream2, stream3];

  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i];
    const streamId = `stream_demo_${i + 1}_${crypto.randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    console.log(`Creating ${stream.description}...`);

    const baseRecord: StreamRecord = {
      id: streamId,
      vault_id: stream.vaultId,
      charm_id: null,
      beneficiary: stream.beneficiary,
      total_amount_sats: stream.totalAmountSats,
      rate_sats_per_sec: stream.rateSatsPerSec,
      start_unix: stream.startUnix,
      cliff_unix: stream.cliffUnix,
      revocation_pubkey: `revoker_pubkey_demo_${i + 1}`,
      streamed_commitment_sats: 0,
      status: "active",
      created_at: nowIso,
      updated_at: nowIso,
    };

    await createStream(baseRecord);

    const charm = await mintStreamCharm({
      streamId,
      vaultId: stream.vaultId,
      totalAmountSats: stream.totalAmountSats,
      rateSatsPerSec: stream.rateSatsPerSec,
      startUnix: stream.startUnix,
      cliffUnix: stream.cliffUnix,
      beneficiary: stream.beneficiary,
      revocationPubkey: `revoker_pubkey_demo_${i + 1}`,
    });

    console.log(`  ✓ Stream ID: ${streamId}`);
    console.log(`  ✓ Vault ID: ${stream.vaultId}`);
    console.log(`  ✓ Charm ID: ${charm.charm_id}`);
    console.log(`  ✓ Total: ${stream.totalAmountBtc} BTC @ ${stream.rateSatsPerSec} sats/sec\n`);
  }

  console.log("✅ Demo streams created successfully!");
  console.log("\n📋 Next steps:");
  console.log("  1. Run `npm run dev`");
  console.log("  2. Visit http://localhost:3000");
  console.log("  3. Connect your wallet (or use demo mode)");
  console.log("  4. View streams on the dashboard");
  console.log("  5. Claim vested amounts from /claim");
  console.log("  6. Verify proofs on /verify");
}

main().catch((err) => {
  console.error("Demo seed failed", err);
  process.exit(1);
});
