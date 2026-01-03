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
    // Reconstruct the exact message that was signed in the frontend
    // The frontend signs: JSON.stringify({ action: "createStream", walletAddress: address, payload })
    // where payload is the CreateStreamRequest object (without walletSignature)
    const payloadForSigning = {
      totalAmountBtc: body.totalAmountBtc,
      rateSatsPerSec: body.rateSatsPerSec,
      startUnix: body.startUnix || startUnix,
      cliffUnix: body.cliffUnix || cliffUnix,
      beneficiary: body.beneficiary,
      revocationPubkey: body.revocationPubkey,
      policy: body.policy,
      walletAddress: body.walletAddress,
      // Note: walletSignature is NOT included in the signed payload
    };
    
    const signedMessage = JSON.stringify({
      action: "createStream",
      walletAddress: body.walletAddress || walletAddress,
      payload: payloadForSigning,
    });
    
    // Attempt signature verification, but don't fail if it's not required
    let sigVerified = false;
    const requireSig = shouldRequireWalletSig();
    try {
      sigVerified = verifyWalletSignature({
        message: signedMessage,
        address: walletAddress,
        signature: walletSignature,
        require: requireSig,
      });
    } catch (err: any) {
      // If signature verification throws an error and it's required, re-throw
      if (requireSig) {
        throw err;
      }
      // Otherwise, log warning and continue
      console.warn(
        "Wallet signature verification failed, but continuing because REQUIRE_WALLET_SIG is not set to 'true'. " +
        `Error: ${err?.message || "Unknown error"}. ` +
        "This may indicate a signature format incompatibility with @sats-connect/core."
      );
      sigVerified = false;
    }
    
    // Log warning if signature verification failed but is not required
    if (!sigVerified && !requireSig) {
      console.warn(
        "Wallet signature verification failed, but continuing because REQUIRE_WALLET_SIG is not set to 'true'. " +
        "This may indicate a signature format incompatibility with @sats-connect/core."
      );
    }

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
      streamId,
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
  } catch (err: any) {
    // Enhanced error logging
    console.error("createStream failed:", {
      error: err?.message || "Unknown error",
      stack: err?.stack,
      name: err?.name,
      code: err?.code,
      response: err?.response?.data,
    });

    // Return more informative error messages in development
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorMessage = isDevelopment
      ? err?.message || "Failed to create stream"
      : "Failed to create stream";

    // Handle specific error types
    if (err?.code === "P2002") {
      // Prisma unique constraint violation
      return res.status(409).json({
        error: "Stream already exists",
        details: isDevelopment ? err?.message : undefined,
      });
    }

    if (err?.response?.status) {
      // External API error (Charms, Scrolls, etc.)
      return res.status(502).json({
        error: "External service error",
        details: isDevelopment ? err?.response?.data || err?.message : undefined,
      });
    }

    return res.status(500).json({
      error: errorMessage,
      details: isDevelopment ? err?.stack : undefined,
    });
  }
}
