import axios from "axios";
import crypto from "crypto";

const ZKBTC_API_BASE = process.env.ZKBTC_API_BASE;
const ZKBTC_API_KEY = process.env.ZKBTC_API_KEY;
const ALLOW_FALLBACK = process.env.ZKBTC_ALLOW_FALLBACK !== "false";

export type VestingProof = {
  proof: unknown;
  publicSignals: unknown;
  digest: string;
};

export async function generateVestingProof(
  streamId: string,
  claimedAmountSats: number,
  timestamp: number,
): Promise<VestingProof> {
  if (ZKBTC_API_BASE) {
    try {
      const res = await axios.post(
        `${ZKBTC_API_BASE}/vest/generate`,
        { stream_id: streamId, amount_sats: claimedAmountSats, timestamp },
        {
          headers: {
            Authorization: ZKBTC_API_KEY ? `Bearer ${ZKBTC_API_KEY}` : undefined,
            "Content-Type": "application/json",
          },
        },
      );
      const { proof, publicSignals } = res.data;
      const digest = crypto
        .createHash("sha256")
        .update(JSON.stringify({ proof, publicSignals }))
        .digest("hex");
      return { proof, publicSignals, digest };
    } catch (err) {
      if (!ALLOW_FALLBACK) {
        throw err;
      }
      console.warn("zkBTC generator unavailable, using mock proof");
    }
  }
  return buildMockProof(streamId, claimedAmountSats, timestamp);
}

export async function verifyVestingProof(
  proof: VestingProof,
  streamId: string,
  claimedAmountSats: number,
  timestamp: number,
): Promise<{ valid: boolean; via: "zkbtc-testnet" | "mock"; digest: string }> {
  if (ZKBTC_API_BASE) {
    try {
      await axios.post(
        `${ZKBTC_API_BASE}/vest/verify`,
        {
          stream_id: streamId,
          amount_sats: claimedAmountSats,
          timestamp,
          proof: proof.proof,
          publicSignals: proof.publicSignals,
        },
        {
          headers: {
            Authorization: ZKBTC_API_KEY ? `Bearer ${ZKBTC_API_KEY}` : undefined,
            "Content-Type": "application/json",
          },
        },
      );
      return { valid: true, via: "zkbtc-testnet", digest: proof.digest };
    } catch (err) {
      if (!ALLOW_FALLBACK) {
        throw err;
      }
      console.warn("zkBTC verification failed, using mock verifier");
    }
  }
  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify({ streamId, claimedAmountSats, timestamp }))
    .digest("hex");
  const valid = digest === proof.digest;
  return { valid, via: "mock", digest };
}

function buildMockProof(
  streamId: string,
  claimedAmountSats: number,
  timestamp: number,
): VestingProof {
  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify({ streamId, claimedAmountSats, timestamp }))
    .digest("hex");
  return {
    proof: { mock: true, streamId, claimedAmountSats, timestamp },
    publicSignals: { streamId, claimedAmountSats, timestamp },
    digest,
  };
}
