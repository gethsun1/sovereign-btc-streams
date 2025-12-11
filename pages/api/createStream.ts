import type { NextApiRequest, NextApiResponse } from "next";
import { createStreamRequestSchema } from "@/lib/types";
import { btcToSats, nowUnix } from "@/lib/utils";
import { depositVault } from "@/lib/grail";
import { mintStreamCharm } from "@/lib/charms";
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
    const deposit = await depositVault(totalAmountSats, body.beneficiary, body.policy);

    const charm = await mintStreamCharm({
      vaultId: deposit.vault_id,
      totalAmountSats,
      rateSatsPerSec: body.rateSatsPerSec,
      startUnix,
      cliffUnix,
      beneficiary: body.beneficiary,
      revocationPubkey: body.revocationPubkey,
    });

    return res.status(200).json({
      vaultId: deposit.vault_id,
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
