import axios from "axios";
import crypto from "crypto";
import {
  attachCharmId,
  createStream,
  getStream,
  StreamRecord,
  StreamStatus,
  updateStreamedCommitment,
} from "./db";

const CHARMS_API_BASE = process.env.CHARMS_API_BASE;
const CHARMS_API_KEY = process.env.CHARMS_API_KEY;
const ALLOW_FALLBACK = process.env.CHARMS_ALLOW_FALLBACK !== "false";

export type MintStreamParams = {
  vaultId: string;
  totalAmountSats: number;
  rateSatsPerSec: number;
  startUnix: number;
  cliffUnix: number;
  beneficiary: string;
  revocationPubkey: string;
};

export type CharmMetadata = {
  stream_id: string;
  charm_id: string;
  revocation_pubkey: string;
  total_amount_sats: number;
  rate_sats_per_sec: number;
  start_unix: number;
  cliff_unix: number;
  streamed_commitment_sats: number;
  status: StreamStatus;
};

export async function mintStreamCharm(params: MintStreamParams): Promise<CharmMetadata> {
  const streamId = `stream_${crypto.randomUUID()}`;
  const nowIso = new Date().toISOString();

  const baseRecord: StreamRecord = {
    id: streamId,
    vault_id: params.vaultId,
    charm_id: null,
    beneficiary: params.beneficiary,
    total_amount_sats: params.totalAmountSats,
    rate_sats_per_sec: params.rateSatsPerSec,
    start_unix: params.startUnix,
    cliff_unix: params.cliffUnix,
    revocation_pubkey: params.revocationPubkey,
    streamed_commitment_sats: 0,
    status: "active",
    created_at: nowIso,
    updated_at: nowIso,
  };

  createStream(baseRecord);

  if (CHARMS_API_BASE) {
    try {
      const res = await axios.post(
        `${CHARMS_API_BASE}/stream-charm/mint`,
        {
          vault_id: params.vaultId,
          stream_id: streamId,
          total_amount_sats: params.totalAmountSats,
          rate_sats_per_sec: params.rateSatsPerSec,
          start_unix: params.startUnix,
          cliff_unix: params.cliffUnix,
          beneficiary: params.beneficiary,
          revocation_pubkey: params.revocationPubkey,
        },
        {
          headers: {
            Authorization: CHARMS_API_KEY ? `Bearer ${CHARMS_API_KEY}` : undefined,
            "Content-Type": "application/json",
          },
        },
      );

      const payload = res.data as CharmMetadata;
      if (payload.charm_id) {
        attachCharmId(streamId, payload.charm_id);
      }
      return payload;
    } catch (err) {
      if (!ALLOW_FALLBACK) {
        throw err;
      }
      console.warn("Charms API unavailable, minting mock charm");
    }
  }

  const charm_id = `charm_${crypto.randomUUID()}`;
  attachCharmId(streamId, charm_id);
  return {
    stream_id: streamId,
    charm_id,
    revocation_pubkey: params.revocationPubkey,
    total_amount_sats: params.totalAmountSats,
    rate_sats_per_sec: params.rateSatsPerSec,
    start_unix: params.startUnix,
    cliff_unix: params.cliffUnix,
    streamed_commitment_sats: 0,
    status: "active",
  };
}

export async function updateStreamCharm(
  streamId: string,
  streamedCommitmentSats: number,
  status?: StreamStatus,
) {
  if (CHARMS_API_BASE) {
    try {
      await axios.post(
        `${CHARMS_API_BASE}/stream-charm/${streamId}/update`,
        { streamed_commitment_sats: streamedCommitmentSats },
        {
          headers: {
            Authorization: CHARMS_API_KEY ? `Bearer ${CHARMS_API_KEY}` : undefined,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (err) {
      if (!ALLOW_FALLBACK) {
        throw err;
      }
      console.warn("Charms update failed, persisting locally");
    }
  }
  updateStreamedCommitment(streamId, streamedCommitmentSats, status);
}

export async function queryStreamCharm(streamId: string): Promise<CharmMetadata | null> {
  if (CHARMS_API_BASE) {
    try {
      const res = await axios.get(`${CHARMS_API_BASE}/stream-charm/${streamId}`, {
        headers: {
          Authorization: CHARMS_API_KEY ? `Bearer ${CHARMS_API_KEY}` : undefined,
        },
      });
      return res.data as CharmMetadata;
    } catch (err) {
      if (!ALLOW_FALLBACK) {
        throw err;
      }
      console.warn("Charms query failed, reading local state");
    }
  }
  const record = getStream(streamId);
  if (!record) return null;
  return {
    stream_id: record.id,
    charm_id: record.charm_id ?? "mock-charm",
    revocation_pubkey: record.revocation_pubkey,
    total_amount_sats: record.total_amount_sats,
    rate_sats_per_sec: record.rate_sats_per_sec,
    start_unix: record.start_unix,
    cliff_unix: record.cliff_unix,
    streamed_commitment_sats: record.streamed_commitment_sats,
    status: record.status,
  };
}
