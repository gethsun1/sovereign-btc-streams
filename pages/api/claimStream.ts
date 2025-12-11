import type { NextApiRequest, NextApiResponse } from "next";
import { claimRequestSchema } from "@/lib/types";
import { computeVestedAmount, nowUnix } from "@/lib/utils";
import { getStream, recordClaim } from "@/lib/db";
import { generateVestingProof, verifyVestingProof } from "@/lib/zkbtc";
import { updateStreamCharm } from "@/lib/charms";
import { simulateVaultRelease } from "@/lib/grail";
import { shouldRequireWalletSig, verifyWalletSignature } from "@/lib/signature";
import crypto from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = claimRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.format() });
  }

  const { streamId, claimedAmountSats, timestamp, walletAddress, walletSignature } = parsed.data;
  const callerWallet =
    walletAddress || process.env.DEMO_WALLET_ADDRESS || "demo-fallback-address";
  const ts = timestamp || nowUnix();

  const stream = getStream(streamId);
  if (!stream) {
    return res.status(404).json({ error: "Stream not found" });
  }

  const vested = computeVestedAmount(
    stream.start_unix,
    stream.cliff_unix,
    stream.rate_sats_per_sec,
    stream.total_amount_sats,
    ts,
  );

  const maxClaimable = Math.max(vested - stream.streamed_commitment_sats, 0);
  const claimable = Math.min(claimedAmountSats, maxClaimable);

  if (claimable <= 0) {
    return res.status(400).json({ error: "Nothing vested to claim yet", vested, streamed: stream.streamed_commitment_sats });
  }

  try {
    const message = JSON.stringify({
      action: "claimStream",
      walletAddress: callerWallet,
      streamId,
      amountSats: claimedAmountSats,
      timestamp: ts,
    });
    verifyWalletSignature({
      message,
      address: callerWallet,
      signature: walletSignature,
      require: shouldRequireWalletSig(),
    });

    const proof = await generateVestingProof(streamId, claimable, ts);
    const verification = await verifyVestingProof(proof, streamId, claimable, ts);

    if (!verification.valid) {
      return res.status(400).json({ error: "Proof verification failed", digest: verification.digest });
    }

    const newCommitment = Math.min(
      stream.streamed_commitment_sats + claimable,
      stream.total_amount_sats,
    );
    const status = newCommitment >= stream.total_amount_sats ? "completed" : stream.status;
    await updateStreamCharm(streamId, newCommitment, status);

    await recordClaim({
      id: `claim_${crypto.randomUUID()}`,
      stream_id: streamId,
      amount_sats: claimable,
      proof: JSON.stringify(proof),
      verified: 1,
      created_at: new Date().toISOString(),
    });

    const release = await simulateVaultRelease(stream.vault_id ?? "mock", claimable);

    return res.status(200).json({
      streamId,
      claimedAmountSats: claimable,
      streamedCommitmentSats: newCommitment,
      vested,
      status,
      release,
      verification,
      walletAddress: callerWallet,
    });
  } catch (err) {
    console.error("claimStream failed", err);
    return res.status(500).json({ error: "Failed to process claim" });
  }
}
