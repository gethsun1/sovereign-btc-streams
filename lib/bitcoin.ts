import axios from "axios";
import * as bitcoin from "bitcoinjs-lib";

const BITCOIN_RPC_URL = process.env.BITCOIN_RPC_URL;
const BITCOIN_RPC_USER = process.env.BITCOIN_RPC_USER;
const BITCOIN_RPC_PASS = process.env.BITCOIN_RPC_PASS;

function isMempoolRestApi(url?: string): boolean {
  if (!url) return false;
  // Typical format: https://mempool.space/testnet4/api
  return url.includes("mempool.space") && url.endsWith("/api");
}

function mustGetBitcoinBaseUrl(): string {
  if (!BITCOIN_RPC_URL) {
    throw new Error("Bitcoin RPC not configured");
  }
  return BITCOIN_RPC_URL.replace(/\/+$/, "");
}

export type UTXO = {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string;
  address?: string;
};

/**
 * Call Bitcoin RPC method
 */
async function callRPC(method: string, params: any[] = []): Promise<any> {
  const baseUrl = mustGetBitcoinBaseUrl();

  try {
    const response = await axios.post(
      baseUrl,
      {
        jsonrpc: "1.0",
        id: "sovereign-btc-streams",
        method,
        params,
      },
      {
        auth: {
          username: BITCOIN_RPC_USER || "",
          password: BITCOIN_RPC_PASS || "",
        },
      }
    );

    if (response.data.error) {
      throw new Error(`RPC Error: ${response.data.error.message}`);
    }

    return response.data.result;
  } catch (err: any) {
    console.error(`Bitcoin RPC ${method} failed:`, err.message);
    throw err;
  }
}

/**
 * Get UTXOs for a specific address
 */
export async function getAddressUtxos(address: string): Promise<UTXO[]> {
  const baseUrl = BITCOIN_RPC_URL;
  if (isMempoolRestApi(baseUrl)) {
    try {
      const url = `${mustGetBitcoinBaseUrl()}/address/${address}/utxo`;
      const res = await axios.get(url);
      // Mempool UTXO shape: { txid, vout, value, status: { confirmed, block_height, ... } }
      return (res.data as any[]).map((u) => ({
        txid: u.txid,
        vout: u.vout,
        value: u.value,
        scriptPubKey: "",
        address,
      }));
    } catch (err: any) {
      console.error(`Failed to get UTXOs for ${address}:`, err.message);
      return [];
    }
  }

  try {
    // Using scantxoutset for testnet4
    const result = await callRPC("scantxoutset", [
      "start",
      [`addr(${address})`],
    ]);

    return result.unspents.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: Math.round(utxo.amount * 100000000), // BTC to sats
      scriptPubKey: utxo.scriptPubKey,
      address: address,
    }));
  } catch (err) {
    console.error(`Failed to get UTXOs for ${address}:`, err);
    return [];
  }
}

/**
 * Get raw transaction hex
 */
export async function getRawTransaction(txid: string): Promise<string> {
  const baseUrl = BITCOIN_RPC_URL;
  if (isMempoolRestApi(baseUrl)) {
    const url = `${mustGetBitcoinBaseUrl()}/tx/${txid}/hex`;
    const res = await axios.get(url);
    return res.data;
  }
  return await callRPC("getrawtransaction", [txid, false]);
}

/**
 * Get transaction details
 */
export async function getTransaction(txid: string): Promise<any> {
  const baseUrl = BITCOIN_RPC_URL;
  if (isMempoolRestApi(baseUrl)) {
    const url = `${mustGetBitcoinBaseUrl()}/tx/${txid}`;
    const res = await axios.get(url);
    return res.data;
  }
  return await callRPC("getrawtransaction", [txid, true]);
}

/**
 * Broadcast a transaction
 */
export async function broadcastTransaction(txHex: string): Promise<string> {
  const baseUrl = BITCOIN_RPC_URL;
  if (isMempoolRestApi(baseUrl)) {
    const url = `${mustGetBitcoinBaseUrl()}/tx`;
    const res = await axios.post(url, txHex, {
      headers: { "Content-Type": "text/plain" },
    });
    // Mempool returns txid as plain text
    return res.data;
  }
  return await callRPC("sendrawtransaction", [txHex]);
}

/**
 * Get current block height
 */
export async function getBlockHeight(): Promise<number> {
  const baseUrl = BITCOIN_RPC_URL;
  if (isMempoolRestApi(baseUrl)) {
    const url = `${mustGetBitcoinBaseUrl()}/blocks/tip/height`;
    const res = await axios.get(url);
    return typeof res.data === "number" ? res.data : parseInt(res.data, 10);
  }
  return await callRPC("getblockcount", []);
}

/**
 * Get transaction confirmations
 */
export async function getConfirmations(txid: string): Promise<number> {
  try {
    const baseUrl = BITCOIN_RPC_URL;
    if (isMempoolRestApi(baseUrl)) {
      const tx = await getTransaction(txid);
      if (!tx?.status?.confirmed) {
        return 0;
      }
      const tip = await getBlockHeight();
      const height = tx.status.block_height;
      if (typeof tip === "number" && typeof height === "number") {
        return Math.max(0, tip - height + 1);
      }
      return 1;
    }
    const tx = await getTransaction(txid);
    return tx.confirmations || 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Wait for transaction to be confirmed
 */
export async function waitForConfirmation(
  txid: string,
  minConfirmations: number = 1,
  timeoutMs: number = 300000 // 5 minutes
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const confirmations = await getConfirmations(txid);
    if (confirmations >= minConfirmations) {
      return true;
    }
    // Wait 10 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  return false;
}

/**
 * Estimate fee for transaction
 */
export async function estimateFee(targetBlocks: number = 6): Promise<number> {
  const baseUrl = BITCOIN_RPC_URL;
  if (isMempoolRestApi(baseUrl)) {
    try {
      const url = `${mustGetBitcoinBaseUrl()}/v1/fees/recommended`;
      const res = await axios.get(url);
      // { fastestFee, halfHourFee, hourFee, economyFee, minimumFee }
      // Use hourFee as a reasonable default.
      const hourFee = res.data?.hourFee;
      if (typeof hourFee === "number") {
        return Math.max(1, Math.ceil(hourFee));
      }
    } catch (err) {
      console.warn("Fee estimation failed, using fallback");
    }
    return 1;
  }

  try {
    const result = await callRPC("estimatesmartfee", [targetBlocks]);
    if (result.feerate) {
      // Convert BTC/kB to sats/vbyte
      return Math.ceil((result.feerate * 100000000) / 1000);
    }
  } catch (err) {
    console.warn("Fee estimation failed, using fallback");
  }
  // Fallback to 1 sat/vbyte for testnet
  return 1;
}

/**
 * Get UTXO value
 */
export async function getUtxoValue(utxoId: string): Promise<number> {
  const [txid, voutStr] = utxoId.split(":");
  const vout = parseInt(voutStr);

  const baseUrl = BITCOIN_RPC_URL;
  if (isMempoolRestApi(baseUrl)) {
    const tx = await getTransaction(txid);
    const out = tx?.vout?.[vout];
    if (!out || typeof out.value !== "number") {
      throw new Error(`Unable to read vout ${vout} value from mempool tx ${txid}`);
    }
    // mempool API uses sats in `value`
    return out.value;
  }

  const tx = await getTransaction(txid);
  return Math.round(tx.vout[vout].value * 100000000);
}

/**
 * Build UTXO identifier
 */
export function buildUtxoId(txid: string, vout: number): string {
  return `${txid}:${vout}`;
}

/**
 * Parse UTXO identifier
 */
export function parseUtxoId(utxoId: string): { txid: string; vout: number } {
  const [txid, voutStr] = utxoId.split(":");
  return { txid, vout: parseInt(voutStr) };
}

/**
 * Get transaction ID from hex
 */
export function getTxId(txHex: string): string {
  const tx = bitcoin.Transaction.fromHex(txHex);
  return tx.getId();
}

/**
 * Validate Bitcoin address
 */
export function isValidAddress(address: string, network: "testnet" | "mainnet" = "testnet"): boolean {
  try {
    const btcNetwork = network === "testnet" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    bitcoin.address.toOutputScript(address, btcNetwork);
    return true;
  } catch (err) {
    return false;
  }
}
