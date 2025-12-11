import bitcoinMessage from "bitcoinjs-message";

function toBuffer(sig: string): Buffer {
  // Try base64 first, then hex.
  try {
    return Buffer.from(sig, "base64");
  } catch {
    return Buffer.from(sig, "hex");
  }
}

export function verifyWalletSignature(params: {
  message: string;
  address: string;
  signature?: string;
  require?: boolean;
}) {
  const { message, address, signature, require } = params;
  if (!signature) {
    if (require) {
      throw new Error("Missing wallet signature");
    }
    return false;
  }
  try {
    const ok = bitcoinMessage.verify(message, address, toBuffer(signature), undefined, true);
    if (!ok && require) {
      throw new Error("Invalid wallet signature");
    }
    return ok;
  } catch (err) {
    if (require) {
      throw err;
    }
    return false;
  }
}

export function shouldRequireWalletSig(): boolean {
  return process.env.REQUIRE_WALLET_SIG === "true";
}
