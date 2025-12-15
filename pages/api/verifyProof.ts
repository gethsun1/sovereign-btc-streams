import type { NextApiRequest, NextApiResponse } from "next";
import { verifyRequestSchema } from "@/lib/types";
import { verifyVestingProof, VestingProof } from "@/lib/zkbtc";
import { getStream } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = verifyRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.format() });
  }

  const { streamId, proof, claimedAmountSats, timestamp } = parsed.data;
  const stream = await getStream(streamId);
  if (!stream) {
    return res.status(404).json({ error: "Stream not found" });
  }

  try {
    const verification = await verifyVestingProof(
      proof as VestingProof,
      streamId,
      claimedAmountSats,
      timestamp,
    );
    return res.status(200).json({ verification, stream });
  } catch (err) {
    console.error("verifyProof failed", err);
    return res.status(500).json({ error: "Failed to verify proof" });
  }
}
