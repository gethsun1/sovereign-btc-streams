import DatabaseConstructor, { Database } from "better-sqlite3";
import fs from "fs";
import path from "path";
import { z } from "zod";

const dbPath = path.join(process.cwd(), "data", "streams.db");

type GlobalWithDb = typeof globalThis & { __sbtc_db__?: Database };

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

const streamSchema = z.object({
  id: z.string(),
  vault_id: z.string().nullable(),
  charm_id: z.string().nullable(),
  beneficiary: z.string(),
  total_amount_sats: z.number(),
  rate_sats_per_sec: z.number(),
  start_unix: z.number(),
  cliff_unix: z.number(),
  revocation_pubkey: z.string(),
  streamed_commitment_sats: z.number(),
  status: z.union([z.literal("active"), z.literal("revoked"), z.literal("completed")]),
  created_at: z.string(),
  updated_at: z.string(),
});

const claimSchema = z.object({
  id: z.string(),
  stream_id: z.string(),
  amount_sats: z.number(),
  proof: z.string(),
  verified: z.number(),
  created_at: z.string(),
});

function ensureDb(): Database {
  const g = globalThis as GlobalWithDb;
  if (g.__sbtc_db__) {
    return g.__sbtc_db__;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseConstructor(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS streams (
      id TEXT PRIMARY KEY,
      vault_id TEXT,
      charm_id TEXT,
      beneficiary TEXT NOT NULL,
      total_amount_sats INTEGER NOT NULL,
      rate_sats_per_sec INTEGER NOT NULL,
      start_unix INTEGER NOT NULL,
      cliff_unix INTEGER NOT NULL,
      revocation_pubkey TEXT NOT NULL,
      streamed_commitment_sats INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      stream_id TEXT NOT NULL,
      amount_sats INTEGER NOT NULL,
      proof TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (stream_id) REFERENCES streams(id)
    );
    CREATE TABLE IF NOT EXISTS vaults (
      id TEXT PRIMARY KEY,
      amount_sats INTEGER NOT NULL,
      beneficiary TEXT NOT NULL,
      policy TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  g.__sbtc_db__ = db;
  return db;
}

export function upsertVault(vault: VaultRecord) {
  const db = ensureDb();
  const stmt = db.prepare(`
    INSERT INTO vaults (id, amount_sats, beneficiary, policy, created_at)
    VALUES (@id, @amount_sats, @beneficiary, @policy, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      amount_sats=excluded.amount_sats,
      beneficiary=excluded.beneficiary,
      policy=excluded.policy
  `);
  stmt.run(vault);
}

export function createStream(record: StreamRecord) {
  const db = ensureDb();
  const stmt = db.prepare(`
    INSERT INTO streams (
      id, vault_id, charm_id, beneficiary, total_amount_sats, rate_sats_per_sec,
      start_unix, cliff_unix, revocation_pubkey, streamed_commitment_sats,
      status, created_at, updated_at
    ) VALUES (
      @id, @vault_id, @charm_id, @beneficiary, @total_amount_sats, @rate_sats_per_sec,
      @start_unix, @cliff_unix, @revocation_pubkey, @streamed_commitment_sats,
      @status, @created_at, @updated_at
    )
  `);
  stmt.run(record);
}

export function updateStreamedCommitment(
  streamId: string,
  streamedCommitmentSats: number,
  status?: StreamStatus,
) {
  const db = ensureDb();
  const stmt = db.prepare(`
    UPDATE streams
    SET streamed_commitment_sats = @streamed_commitment_sats,
        status = COALESCE(@status, status),
        updated_at = @updated_at
    WHERE id = @id
  `);
  stmt.run({
    id: streamId,
    streamed_commitment_sats: streamedCommitmentSats,
    status,
    updated_at: new Date().toISOString(),
  });
}

export function attachCharmId(streamId: string, charmId: string) {
  const db = ensureDb();
  const stmt = db.prepare(`
    UPDATE streams
    SET charm_id = @charm_id,
        updated_at = @updated_at
    WHERE id = @id
  `);
  stmt.run({
    id: streamId,
    charm_id: charmId,
    updated_at: new Date().toISOString(),
  });
}

export function getStream(streamId: string): StreamRecord | null {
  const db = ensureDb();
  const row = db
    .prepare("SELECT * FROM streams WHERE id = ?")
    .get(streamId);
  if (!row) return null;
  return streamSchema.parse(row);
}

export function listStreams(): StreamRecord[] {
  const db = ensureDb();
  const rows = db.prepare("SELECT * FROM streams ORDER BY created_at DESC").all();
  return rows.map((row) => streamSchema.parse(row));
}

export function recordClaim(claim: ClaimRecord) {
  const db = ensureDb();
  const stmt = db.prepare(`
    INSERT INTO claims (id, stream_id, amount_sats, proof, verified, created_at)
    VALUES (@id, @stream_id, @amount_sats, @proof, @verified, @created_at)
  `);
  stmt.run(claim);
}

export function listClaims(streamId: string): ClaimRecord[] {
  const db = ensureDb();
  const rows = db
    .prepare("SELECT * FROM claims WHERE stream_id = ? ORDER BY created_at DESC")
    .all(streamId);
  return rows.map((row) => claimSchema.parse(row));
}
