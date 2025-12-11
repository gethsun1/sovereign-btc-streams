import axios from "axios";
import crypto from "crypto";
import { upsertVault, VaultRecord } from "./db";

const GRAIL_API_BASE = process.env.GRAIL_API_BASE;
const GRAIL_API_KEY = process.env.GRAIL_API_KEY;
const ALLOW_FALLBACK = process.env.GRAIL_ALLOW_FALLBACK !== "false";

type DepositResponse = {
  vault_id: string;
  policy: string;
  amount_sats: number;
  beneficiary: string;
};

export async function depositVault(
  amountSats: number,
  beneficiary: string,
  policy: string,
): Promise<DepositResponse> {
  if (GRAIL_API_BASE) {
    try {
      const res = await axios.post(
        `${GRAIL_API_BASE}/vaults/deposit`,
        { amount_sats: amountSats, beneficiary, policy },
        {
          headers: {
            Authorization: GRAIL_API_KEY ? `Bearer ${GRAIL_API_KEY}` : undefined,
            "Content-Type": "application/json",
          },
        },
      );
      const payload = res.data as DepositResponse;
      persistVault(payload);
      return payload;
    } catch (err) {
      if (!ALLOW_FALLBACK) {
        throw err;
      }
      console.warn("Grail API unavailable, using mock deposit");
    }
  }

  const vault_id = `vault_${crypto.randomUUID()}`;
  const mock: DepositResponse = {
    vault_id,
    policy,
    amount_sats: amountSats,
    beneficiary,
  };
  persistVault(mock);
  return mock;
}

function persistVault(vault: DepositResponse) {
  const record: VaultRecord = {
    id: vault.vault_id,
    amount_sats: vault.amount_sats,
    beneficiary: vault.beneficiary,
    policy: vault.policy,
    created_at: new Date().toISOString(),
  };
  upsertVault(record);
}

export async function simulateVaultRelease(vaultId: string, amountSats: number) {
  if (GRAIL_API_BASE) {
    try {
      await axios.post(
        `${GRAIL_API_BASE}/vaults/${vaultId}/simulate-release`,
        { amount_sats: amountSats },
        {
          headers: {
            Authorization: GRAIL_API_KEY ? `Bearer ${GRAIL_API_KEY}` : undefined,
            "Content-Type": "application/json",
          },
        },
      );
      return { released: true, via: "grail-testnet" as const };
    } catch (err) {
      if (!ALLOW_FALLBACK) {
        throw err;
      }
      console.warn("Grail release API unavailable, using mock");
    }
  }
  // Mock release event for demo purposes
  return { released: true, via: "mock" as const };
}
