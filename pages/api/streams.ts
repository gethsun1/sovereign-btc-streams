import type { NextApiRequest, NextApiResponse } from "next";
import { listStreams, listClaims } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dbStreams = await listStreams();
  const streams = await Promise.all(
    dbStreams.map(async (s) => ({
      id: s.id,
      vaultId: s.vault_id,
      charmId: s.charm_id,
      beneficiary: s.beneficiary,
      totalAmountSats: s.total_amount_sats,
      rateSatsPerSec: s.rate_sats_per_sec,
      startUnix: s.start_unix,
      cliffUnix: s.cliff_unix,
      streamedCommitmentSats: s.streamed_commitment_sats,
      status: s.status,
      claims: await listClaims(s.id),
    }))
  );

  return res.status(200).json({ streams });
}
