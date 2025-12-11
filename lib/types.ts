import { z } from "zod";

export const createStreamRequestSchema = z.object({
  totalAmountBtc: z.number().positive(),
  rateSatsPerSec: z.number().positive(),
  startUnix: z.number(),
  cliffUnix: z.number(),
  beneficiary: z.string().min(4),
  revocationPubkey: z.string().min(8),
  policy: z.string().default("standard"),
  walletAddress: z.string().optional(),
  walletSignature: z.string().optional(),
});

export type CreateStreamRequest = z.infer<typeof createStreamRequestSchema>;

export const claimRequestSchema = z.object({
  streamId: z.string(),
  claimedAmountSats: z.number().positive(),
  timestamp: z.number(),
  walletAddress: z.string().optional(),
  walletSignature: z.string().optional(),
});

export type ClaimRequest = z.infer<typeof claimRequestSchema>;

export const verifyRequestSchema = z.object({
  streamId: z.string(),
  proof: z.any(),
  claimedAmountSats: z.number().positive(),
  timestamp: z.number(),
});

export type VerifyRequest = z.infer<typeof verifyRequestSchema>;

export type StreamUIModel = {
  id: string;
  vaultId: string | null;
  charmId: string | null;
  beneficiary: string;
  totalAmountSats: number;
  rateSatsPerSec: number;
  startUnix: number;
  cliffUnix: number;
  streamedCommitmentSats: number;
  status: "active" | "revoked" | "completed";
  claims?: Array<{
    id: string;
    amount_sats: number;
    proof: string;
    verified: number;
    created_at: string;
  }>;
};
