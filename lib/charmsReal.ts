import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  attachCharmId,
  createStream,
  getStream,
  StreamRecord,
  StreamStatus,
  updateStreamedCommitment,
} from "./db";
import { broadcastTransaction, getRawTransaction, getUtxoValue, getTxId } from "./bitcoin";
import { getScrollsAddress } from "./scrolls";

const CHARMS_API_BASE = process.env.CHARMS_API_BASE || "https://v8.charms.dev";
const CHARMS_APP_VK = process.env.CHARMS_APP_VK;
const CHARMS_APP_BINARY_PATH = process.env.CHARMS_APP_BINARY_PATH;

export type SpellIn = {
  utxo_id: string;
  charms: Record<string, any>;
};

export type SpellOut = {
  address: string;
  value?: number;
  charms?: Record<string, any>;
};

export type Spell = {
  version: number;
  apps: Record<string, string>;
  ins: SpellIn[];
  outs: SpellOut[];
};

export type ProverRequest = {
  spell: Spell;
  binaries: Record<string, string>;
  prev_txs: string[];
  funding_utxo: string;
  funding_utxo_value: number;
  change_address: string;
  fee_rate: number;
  witness?: Record<string, any>;
};

export type ProverResponse = {
  commit_tx: string;
  spell_tx: string;
};

/**
 * Call Charms Prover API to generate transactions
 */
export async function proveSpell(req: ProverRequest): Promise<ProverResponse> {
  if (!CHARMS_API_BASE) {
    throw new Error("CHARMS_API_BASE not configured");
  }

  try {
    const res = await axios.post(`${CHARMS_API_BASE}/spells/prove`, req, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 second timeout for proof generation
    });

    // Response format: [commit_tx_hex, spell_tx_hex]
    const [commitTx, spellTx] = res.data;

    return {
      commit_tx: commitTx,
      spell_tx: spellTx,
    };
  } catch (err: any) {
    console.error("Charms Prover API failed:", err.response?.data || err.message);
    throw new Error(`Prover failed: ${err.response?.data?.error || err.message}`);
  }
}

/**
 * Load app binary as base64
 */
function loadAppBinary(): string {
  if (!CHARMS_APP_BINARY_PATH) {
    throw new Error("CHARMS_APP_BINARY_PATH not configured");
  }

  const binaryPath = path.resolve(CHARMS_APP_BINARY_PATH);
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`App binary not found at ${binaryPath}`);
  }

  return fs.readFileSync(binaryPath).toString("base64");
}

/**
 * Generate unique vault nonce
 */
export function generateVaultNonce(): bigint {
  // Use timestamp + random bytes for uniqueness
  const timestamp = BigInt(Date.now());
  const random = BigInt("0x" + crypto.randomBytes(8).toString("hex"));
  return timestamp * BigInt(1000000) + random;
}

export type MintStreamParams = {
  totalAmountSats: number;
  rateSatsPerSec: number;
  startUnix: number;
  cliffUnix: number;
  beneficiary: string;
  revocationPubkey: string;
  fundingUtxo: string;
  changeAddress: string;
  feeRate?: number;
};

export type MintStreamResult = {
  streamId: string;
  charmId: string;
  vaultId: string;
  vaultAddress: string;
  commitTxId: string;
  spellTxId: string;
};

/**
 * Mint a new stream charm on testnet4
 */
export async function mintStreamCharmReal(params: MintStreamParams): Promise<MintStreamResult> {
  if (!CHARMS_APP_VK) {
    throw new Error("CHARMS_APP_VK not configured - build your Charms app first");
  }

  // 1. Generate vault nonce and get address
  const vaultNonce = generateVaultNonce();
  const vaultAddress = await getScrollsAddress("testnet4", vaultNonce);

  console.log(`Minting stream charm to vault ${vaultNonce} at ${vaultAddress}`);

  // 2. Create stream record
  const streamId = `stream_${crypto.randomUUID()}`;
  const nowIso = new Date().toISOString();

  const streamRecord: StreamRecord = {
    id: streamId,
    vault_id: vaultNonce.toString(),
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

  await createStream(streamRecord);

  // 3. Build spell for minting
  const spell: Spell = {
    version: 1,
    apps: {
      stream: CHARMS_APP_VK,
    },
    ins: [],
    outs: [
      {
        address: vaultAddress,
        charms: {
          stream: {
            stream_id: streamId,
            total_amount_sats: params.totalAmountSats,
            rate_sats_per_sec: params.rateSatsPerSec,
            start_unix: params.startUnix,
            cliff_unix: params.cliffUnix,
            streamed_commitment_sats: 0,
            beneficiary: params.beneficiary,
            revocation_pubkey: params.revocationPubkey,
            status: "active",
          },
        },
      },
    ],
  };

  // 4. Get funding UTXO value and previous tx
  const fundingValue = await getUtxoValue(params.fundingUtxo);
  const prevTx = await getRawTransaction(params.fundingUtxo.split(":")[0]);

  // 5. Prepare prover request
  const proverRequest: ProverRequest = {
    spell,
    binaries: {
      stream: loadAppBinary(),
    },
    prev_txs: [prevTx],
    funding_utxo: params.fundingUtxo,
    funding_utxo_value: fundingValue,
    change_address: params.changeAddress,
    fee_rate: params.feeRate || 1,
  };

  // 6. Call prover
  console.log("Calling Charms Prover...");
  const { commit_tx, spell_tx } = await proveSpell(proverRequest);

  // 7. Broadcast transactions
  console.log("Broadcasting commit transaction...");
  const commitTxId = await broadcastTransaction(commit_tx);
  console.log(`Commit TX: ${commitTxId}`);

  console.log("Broadcasting spell transaction...");
  const spellTxId = await broadcastTransaction(spell_tx);
  console.log(`Spell TX: ${spellTxId}`);

  // 8. Extract charm ID from spell transaction
  // The charm ID is typically derived from the spell tx output
  const charmId = `${spellTxId}:0`; // First output contains the charm

  // 9. Update database with charm ID
  await attachCharmId(streamId, charmId);

  return {
    streamId,
    charmId,
    vaultId: vaultNonce.toString(),
    vaultAddress,
    commitTxId,
    spellTxId,
  };
}

export type ClaimStreamParams = {
  streamId: string;
  claimedAmountSats: number;
  timestamp: number;
  proof: any;
  fundingUtxo: string;
  feeRate?: number;
};

export type ClaimStreamResult = {
  txId: string;
  claimedAmount: number;
  newCommitment: number;
};

/**
 * Claim vested BTC from a stream
 */
export async function claimStreamReal(params: ClaimStreamParams): Promise<ClaimStreamResult> {
  if (!CHARMS_APP_VK) {
    throw new Error("CHARMS_APP_VK not configured");
  }

  // 1. Get stream data
  const stream = await getStream(params.streamId);
  if (!stream) {
    throw new Error("Stream not found");
  }

  if (!stream.charm_id) {
    throw new Error("Stream has no charm ID");
  }

  // 2. Calculate new commitment
  const newCommitment = stream.streamed_commitment_sats + params.claimedAmountSats;

  // 3. Get vault address
  const vaultAddress = await getScrollsAddress("testnet4", BigInt(stream.vault_id!));

  // 4. Build claim spell
  const spell: Spell = {
    version: 1,
    apps: {
      stream: CHARMS_APP_VK,
    },
    ins: [
      {
        utxo_id: stream.charm_id,
        charms: {
          stream: {
            stream_id: stream.id,
            total_amount_sats: stream.total_amount_sats,
            rate_sats_per_sec: stream.rate_sats_per_sec,
            start_unix: stream.start_unix,
            cliff_unix: stream.cliff_unix,
            streamed_commitment_sats: stream.streamed_commitment_sats,
            beneficiary: stream.beneficiary,
            revocation_pubkey: stream.revocation_pubkey,
            status: stream.status,
          },
        },
      },
    ],
    outs: [
      {
        // Updated charm back to vault
        address: vaultAddress,
        charms: {
          stream: {
            stream_id: stream.id,
            total_amount_sats: stream.total_amount_sats,
            rate_sats_per_sec: stream.rate_sats_per_sec,
            start_unix: stream.start_unix,
            cliff_unix: stream.cliff_unix,
            streamed_commitment_sats: newCommitment,
            beneficiary: stream.beneficiary,
            revocation_pubkey: stream.revocation_pubkey,
            status: stream.status,
          },
        },
      },
      {
        // Payment to beneficiary
        address: stream.beneficiary,
        value: params.claimedAmountSats,
      },
    ],
  };

  // 5. Get previous transactions
  const charmPrevTx = await getRawTransaction(stream.charm_id.split(":")[0]);
  const fundingPrevTx = await getRawTransaction(params.fundingUtxo.split(":")[0]);
  const fundingValue = await getUtxoValue(params.fundingUtxo);

  // 6. Prepare prover request with witness
  const proverRequest: ProverRequest = {
    spell,
    binaries: {
      stream: loadAppBinary(),
    },
    prev_txs: [charmPrevTx, fundingPrevTx],
    funding_utxo: params.fundingUtxo,
    funding_utxo_value: fundingValue,
    change_address: vaultAddress,
    fee_rate: params.feeRate || 1,
    witness: {
      claimed_amount_sats: params.claimedAmountSats,
      timestamp: params.timestamp,
      proof: params.proof,
    },
  };

  // 7. Call prover
  console.log("Generating claim proof...");
  const { commit_tx, spell_tx } = await proveSpell(proverRequest);

  // 8. Broadcast transactions
  console.log("Broadcasting claim transactions...");
  const commitTxId = await broadcastTransaction(commit_tx);
  const spellTxId = await broadcastTransaction(spell_tx);

  console.log(`Claim TX: ${spellTxId}`);

  // 9. Update database
  await updateStreamedCommitment(params.streamId, newCommitment);

  return {
    txId: spellTxId,
    claimedAmount: params.claimedAmountSats,
    newCommitment,
  };
}
