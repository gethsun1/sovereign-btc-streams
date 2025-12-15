import type { NextApiRequest, NextApiResponse } from "next";
import { createStreamRequestSchema } from "@/lib/types";
import {
  btcToSats,
  nowUnix,
} from "@/lib/utils";
import { StreamRecord, createStream } from "@/lib/db";
import { mintStreamCharm } from "@/lib/charms";
import { getScrollsAddress } from "@/lib/scrolls";
import { shouldRequireWalletSig, verifyWalletSignature } from "@/lib/signature";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = createStreamRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.format() });
  }

  const body = parsed.data;
  const walletAddress =
    body.walletAddress || process.env.DEMO_WALLET_ADDRESS || "demo-fallback-address";
  const walletSignature = body.walletSignature;
  const startUnix = body.startUnix || nowUnix();
  const cliffUnix = body.cliffUnix || startUnix;

  try {
    const message = JSON.stringify({
      action: "createStream",
      walletAddress,
      payload: {
        totalAmountBtc: body.totalAmountBtc,
        rateSatsPerSec: body.rateSatsPerSec,
        startUnix,
        cliffUnix,
        beneficiary: body.beneficiary,
        revocationPubkey: body.revocationPubkey,
        policy: body.policy,
        walletAddress,
      },
    });
    verifyWalletSignature({
      message,
      address: walletAddress,
      signature: walletSignature,
      require: shouldRequireWalletSig(),
    });

    const totalAmountSats = btcToSats(body.totalAmountBtc);
    // 1. Generate unique nonce for Scrolls Vault
    // In production, you might want to track nonces in DB or use a hash of the stream parameters.
    // For now, we use the timestamp + random entropy to ensure uniqueness for the "Sovereign" vault.
    const nonce = BigInt(nowUnix()) + BigInt(Math.floor(Math.random() * 1000000));

    // 2. Derive Scrolls Address (The Programmable Vault)
    // We default to "testnet4" for this sovereign demo.
    let vaultAddress = "mock_scrolls_address";
    try {
      vaultAddress = await getScrollsAddress("testnet4", nonce);
    } catch (e) {
      console.warn("Scrolls address generation failed, falling back to mock");
    }

    // Extract variables for clarity in the new block
    const beneficiary = body.beneficiary;
    const revocationPubkey = body.revocationPubkey;
    const rateSatsPerSec = body.rateSatsPerSec;

    // 3. Persist Stream Record
    const streamId = `stream_${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    // We treat the derived Scrolls address as the "Vault ID" in our system,
    // because that's where the funds live.
    const baseRecord: StreamRecord = {
      id: streamId,
      vault_id: vaultAddress,
      charm_id: null,
      beneficiary,
      total_amount_sats: totalAmountSats,
      rate_sats_per_sec: rateSatsPerSec,
      start_unix: startUnix,
      cliff_unix: cliffUnix,
      revocation_pubkey: revocationPubkey,
      streamed_commitment_sats: 0,
      status: "active",
      created_at: nowIso,
      updated_at: nowIso,
    };

    await createStream(baseRecord);

    // 4. Mint Charm (Track stream state off-chain/on-chain via Charms)
    // We pass the Scrolls address as the vaultId so Charms knows where funds are locked.
    const charm = await mintStreamCharm({
      vaultId: vaultAddress,
      totalAmountSats: totalAmountSats,
      rateSatsPerSec,
      startUnix,
      cliffUnix,
      beneficiary,
      revocationPubkey,
    });

    return res.status(200).json({
      vaultId: vaultAddress,
      streamId: charm.stream_id,
      charmId: charm.charm_id,
      metadata: charm,
      walletAddress,
    });
  } catch (err) {
    console.error("createStream failed", err);
    return res.status(500).json({ error: "Failed to create stream" });
  }
}
