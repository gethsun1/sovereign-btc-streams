import { PrismaClient, Stream, Claim, Vault } from "@prisma/client";
import { z } from "zod";

// Maintain global Prisma instance to prevent connection exhaustion in dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type StreamStatus = "active" | "revoked" | "completed";

export type StreamRecord = {
  id: string;
  vault_id: string | null;
  charm_id: string | null;
  beneficiary: string;
  total_amount_sats: number;
  rate_sats_per_sec: number;
  start_unix: number;
  cliff_unix: number;
  revocation_pubkey: string;
  streamed_commitment_sats: number;
  status: StreamStatus;
  created_at: string;
  updated_at: string;
};

export type ClaimRecord = {
  id: string;
  stream_id: string;
  amount_sats: number;
  proof: string;
  verified: number;
  created_at: string;
};

export type VaultRecord = {
  id: string;
  amount_sats: number;
  beneficiary: string;
  policy: string;
  created_at: string;
};

// Utilities for BigInt/Date conversion
const toStreamRecord = (s: Stream): StreamRecord => ({
  ...s,
  total_amount_sats: Number(s.total_amount_sats),
  rate_sats_per_sec: Number(s.rate_sats_per_sec),
  start_unix: Number(s.start_unix),
  cliff_unix: Number(s.cliff_unix),
  streamed_commitment_sats: Number(s.streamed_commitment_sats),
  status: s.status as StreamStatus,
  created_at: s.created_at.toISOString(),
  updated_at: s.updated_at.toISOString(),
});

const toClaimRecord = (c: Claim): ClaimRecord => ({
  ...c,
  amount_sats: Number(c.amount_sats),
  verified: c.verified,
  created_at: c.created_at.toISOString(),
});

const toVaultRecord = (v: Vault): VaultRecord => ({
  ...v,
  amount_sats: Number(v.amount_sats),
  created_at: v.created_at.toISOString(),
});

export async function upsertVault(vault: VaultRecord) {
  await prisma.vault.upsert({
    where: { id: vault.id },
    create: {
      id: vault.id,
      amount_sats: BigInt(vault.amount_sats),
      beneficiary: vault.beneficiary,
      policy: vault.policy,
      created_at: new Date(vault.created_at),
    },
    update: {
      amount_sats: BigInt(vault.amount_sats),
      beneficiary: vault.beneficiary,
      policy: vault.policy,
    },
  });
}

export async function createStream(record: StreamRecord) {
  await prisma.stream.create({
    data: {
      id: record.id,
      vault_id: record.vault_id,
      charm_id: record.charm_id,
      beneficiary: record.beneficiary,
      total_amount_sats: BigInt(record.total_amount_sats),
      rate_sats_per_sec: BigInt(record.rate_sats_per_sec),
      start_unix: BigInt(record.start_unix),
      cliff_unix: BigInt(record.cliff_unix),
      revocation_pubkey: record.revocation_pubkey,
      streamed_commitment_sats: BigInt(record.streamed_commitment_sats),
      status: record.status,
      created_at: new Date(record.created_at),
      updated_at: new Date(record.updated_at),
    },
  });
}

export async function updateStreamedCommitment(
  streamId: string,
  streamedCommitmentSats: number,
  status?: StreamStatus,
) {
  await prisma.stream.update({
    where: { id: streamId },
    data: {
      streamed_commitment_sats: BigInt(streamedCommitmentSats),
      status: status || undefined,
    },
  });
}

export async function attachCharmId(streamId: string, charmId: string) {
  await prisma.stream.update({
    where: { id: streamId },
    data: { charm_id: charmId },
  });
}

export async function getStream(streamId: string): Promise<StreamRecord | null> {
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream) return null;
  return toStreamRecord(stream);
}

export async function listStreams(): Promise<StreamRecord[]> {
  const streams = await prisma.stream.findMany({
    orderBy: { created_at: "desc" },
    // include: { claims: true }, // Optimization: fetch claims if needed, though original listStreams didn't specify. 
                               // Actually original listStreams didn't fetch claims. 
                               // But 'StreamRecord' doesn't have claims.
                               // Wait, pages/index.tsx uses 'streams.claims?.length'. 
                               // Original 'StreamRecord' in db.ts did NOT have 'claims'.
                               // But 'StreamUIModel' in types.ts MIGHT.
                               // Let's check types.ts usage.
                               // 'listStreams' in db.ts just selects * from streams.
                               // The frontend merges them or fetches separately?
                               // Looking at index.tsx: `setStreams(res.data.streams)`
                               // api/streams.ts likely does the join.
  });
  return streams.map(toStreamRecord);
}

export async function recordClaim(claim: ClaimRecord) {
  await prisma.claim.create({
    data: {
      id: claim.id,
      stream_id: claim.stream_id,
      amount_sats: BigInt(claim.amount_sats),
      proof: claim.proof,
      verified: claim.verified,
      created_at: new Date(claim.created_at),
    },
  });
}

export async function listClaims(streamId: string): Promise<ClaimRecord[]> {
  const claims = await prisma.claim.findMany({
    where: { stream_id: streamId },
    orderBy: { created_at: "desc" },
  });
  return claims.map(toClaimRecord);
}
