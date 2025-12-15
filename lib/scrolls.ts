import axios from "axios";
import { z } from "zod";

const SCROLLS_API_BASE = process.env.SCROLLS_API_BASE || "https://scrolls.charms.dev";

// --- Types ---

export const ScrollsConfigSchema = z.object({
    fee_address: z.object({
        main: z.string(),
        testnet4: z.string(),
    }),
    fee_per_input: z.number(),
    fee_basis_points: z.number(),
    fixed_cost: z.number(),
});

export type ScrollsConfig = z.infer<typeof ScrollsConfigSchema>;

export type ScrollsNetwork = "main" | "testnet4";

export type SignInput = {
    index: number;
    nonce: number; // 64-bit unsigned integer, but JS number is safe up to 2^53. If nonce > 2^53, use BigInt/string.
};

export type SignRequest = {
    sign_inputs: SignInput[];
    prev_txs: string[]; // hex encoded
    tx_to_sign: string; // hex encoded
};

// --- API Client ---

/**
 * Fetches the current fee and address configuration from Scrolls.
 */
export async function getScrollsConfig(): Promise<ScrollsConfig> {
    const url = `${SCROLLS_API_BASE}/config`;
    try {
        const res = await axios.get(url);
        return ScrollsConfigSchema.parse(res.data);
    } catch (err: any) {
        console.error("Failed to fetch Scrolls config:", err.message);
        throw new Error("Scrolls API Unavailable");
    }
}

/**
 * Derives a deterministic address for a given nonce.
 * @param network "main" or "testnet4"
 * @param nonce 64-bit unsigned integer (unique Vault ID)
 */
export async function getScrollsAddress(network: ScrollsNetwork, nonce: number | bigint): Promise<string> {
    const url = `${SCROLLS_API_BASE}/${network}/address/${nonce.toString()}`;
    try {
        const res = await axios.get(url);
        // Response is a JSON string value, e.g. "tb1..."
        // axios usually parses JSON automatically, so res.data should be the string.
        return res.data;
    } catch (err: any) {
        console.error(`Failed to get Scrolls address for nonce ${nonce}:`, err.message);
        throw new Error("Scrolls Address Generation Failed");
    }
}

/**
 * Requests Scrolls to sign a spending transaction.
 * Scrolls will only sign if the transaction acts according to the rules of the Charm/Spell.
 */
export async function signWithScrolls(network: ScrollsNetwork, req: SignRequest): Promise<string> {
    const url = `${SCROLLS_API_BASE}/${network}/sign`;
    try {
        const res = await axios.post(url, req);
        // Response is the signed transaction as a hex string
        return res.data;
    } catch (err: any) {
        console.error("Scrolls signing failed:", err.response?.data || err.message);
        throw new Error("Scrolls Signing Failed");
    }
}

/**
 * Utility to calculate the fee required by Scrolls.
 */
export function calculateScrollsFee(
    config: ScrollsConfig,
    numberOfInputs: number,
    totalInputSats: number | bigint
): number {
    const fixed = config.fixed_cost;
    const inputFee = config.fee_per_input * numberOfInputs;
    const variableFee = (BigInt(totalInputSats) * BigInt(config.fee_basis_points)) / BigInt(10000);
    return fixed + inputFee + Number(variableFee);
}
