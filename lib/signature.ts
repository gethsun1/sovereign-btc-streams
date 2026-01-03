import bitcoinMessage from "bitcoinjs-message";

function toBuffer(sig: string): Buffer {
  // Handle different signature formats from various wallet implementations
  // sats-connect and other wallets may return signatures in different formats
  
  // Remove any whitespace
  const cleaned = sig.trim();
  
  // Try base64 first (most common for wallet signatures)
  try {
    const buf = Buffer.from(cleaned, "base64");
    // Bitcoin message signatures can vary in length (DER format: ~70-72 bytes, compact: 65 bytes)
    // Accept a wider range to handle different formats
    if (buf.length >= 64 && buf.length <= 80) {
      return buf;
    }
    // If length is outside expected range but buffer was created, still try it
    // Some wallet implementations might use different encoding
    if (buf.length > 0) {
      return buf;
    }
  } catch {
    // Not base64, continue to hex
  }
  
  // Try hex encoding
  try {
    // Remove '0x' prefix if present
    const hexStr = cleaned.startsWith("0x") ? cleaned.slice(2) : cleaned;
    // Validate hex string (must be even length)
    if (hexStr.length % 2 !== 0) {
      throw new Error("Hex string must have even length");
    }
    const buf = Buffer.from(hexStr, "hex");
    // Accept a wider range for hex-encoded signatures
    if (buf.length >= 64 && buf.length <= 80) {
      return buf;
    }
    // If length is outside expected range but buffer was created, still try it
    if (buf.length > 0) {
      return buf;
    }
  } catch (err) {
    // Not valid hex
  }
  
  // If we get here, the signature format is unrecognized
  throw new Error(`Invalid signature format. Expected base64 or hex, got: ${cleaned.substring(0, 100)}... (length: ${cleaned.length})`);
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
  
  // Skip verification for mock signatures (used when wallet is not connected)
  if (signature.startsWith("mock-signature-")) {
    if (require) {
      throw new Error("Mock signatures are not allowed when signature verification is required");
    }
    return false;
  }
  
  try {
    let sigBuffer = toBuffer(signature);
    const originalBuffer = sigBuffer; // Keep reference to original buffer for signature extraction
    
    // bitcoinjs-message expects exactly 65 bytes (1 byte recovery ID + 64 bytes signature)
    // Some wallet implementations (like @sats-connect/core) return 66 bytes
    // The recovery ID should be in the range 27-34 (or 27-30 for compressed)
    if (sigBuffer.length === 66) {
      // Check if the first byte is a valid recovery ID (27-34)
      const firstByte = sigBuffer.readUInt8(0);
      const secondByte = sigBuffer.readUInt8(1);
      
      if (firstByte >= 27 && firstByte <= 34) {
        // First byte looks like a recovery ID, remove the last byte
        sigBuffer = sigBuffer.slice(0, 65);
        if (process.env.NODE_ENV === "development") {
          console.log("Converted 66-byte signature to 65 bytes by removing last byte");
        }
      } else if (secondByte >= 27 && secondByte <= 34) {
        // Second byte looks like a recovery ID, remove the first byte
        sigBuffer = sigBuffer.slice(1);
        if (process.env.NODE_ENV === "development") {
          console.log("Converted 66-byte signature to 65 bytes by removing first byte");
        }
      } else {
        // Neither byte is a valid recovery ID
        // @sats-connect/core might return: [format_byte(1)] + [64-byte raw signature] + [1 byte]
        // Or: [format_byte] + [65-byte signature with recovery ID]
        // Try different extraction strategies
        
        // Strategy 1: Remove first byte (format byte), keep next 65 bytes
        const withoutFirst = sigBuffer.slice(1);
        if (withoutFirst.length === 65 && withoutFirst.readUInt8(0) >= 27 && withoutFirst.readUInt8(0) <= 34) {
          sigBuffer = withoutFirst;
          if (process.env.NODE_ENV === "development") {
            console.log("Converted 66-byte signature by removing first format byte");
          }
        } else {
          // Strategy 2: Extract middle 64 bytes (skip first and last byte)
          const middle64 = sigBuffer.slice(1, 65);
          if (middle64.length === 64) {
            // We'll try different recovery IDs later in the verification step
            // For now, mark that we need to extract the raw signature
            sigBuffer = Buffer.concat([Buffer.from([27]), middle64]); // Temporary, will be adjusted
            if (process.env.NODE_ENV === "development") {
              console.log("Extracted 64-byte signature from middle of 66-byte buffer");
            }
          } else {
            // Fallback: try removing the last byte
            sigBuffer = sigBuffer.slice(0, 65);
            if (process.env.NODE_ENV === "development") {
              console.log("Converted 66-byte signature to 65 bytes by removing last byte (fallback)");
            }
          }
        }
      }
    } else if (sigBuffer.length === 64) {
      // Raw 64-byte signature without recovery ID
      // Try recovery ID 27 (uncompressed, non-segwit) as default
      const recoveryId = 27;
      sigBuffer = Buffer.concat([Buffer.from([recoveryId]), sigBuffer]);
      if (process.env.NODE_ENV === "development") {
        console.log("Added recovery ID 27 to 64-byte signature");
      }
    } else if (sigBuffer.length !== 65) {
      // If it's not 64, 65, or 66 bytes, we can't proceed
      throw new Error(`Signature buffer is ${sigBuffer.length} bytes, expected 64-66 bytes`);
    }
    
    // Debug logging in development mode
    if (process.env.NODE_ENV === "development") {
      console.log("Signature verification attempt:", {
        originalSignatureLength: signature.length,
        originalBufferLength: toBuffer(signature).length,
        finalBufferLength: sigBuffer.length,
        firstByte: sigBuffer.readUInt8(0),
        signaturePreview: signature.substring(0, 50),
        messageLength: message.length,
        address,
      });
    }
    
    // Check if the first byte is a valid recovery ID
    const firstByte = sigBuffer.readUInt8(0);
    if (firstByte < 27 || firstByte > 34) {
      // The signature doesn't have a valid recovery ID
      // This means @sats-connect/core returned a raw signature or a different format
      // We need to extract the 64-byte raw signature and try different recovery IDs
      if (process.env.NODE_ENV === "development") {
        console.log(`Signature doesn't have valid recovery ID (first byte: ${firstByte}), trying different recovery IDs...`);
      }
      
      // Extract the 64-byte raw signature
      // If first byte is not a recovery ID, the signature is likely bytes 1-64
      let rawSignature: Buffer;
      if (sigBuffer.length === 65) {
        // Try bytes 1-64 first (most likely for @sats-connect format)
        rawSignature = sigBuffer.slice(1, 65);
        if (rawSignature.length !== 64) {
          // Fallback: try bytes 0-63
          rawSignature = sigBuffer.slice(0, 64);
        }
      } else {
        throw new Error(`Cannot extract 64-byte signature from ${sigBuffer.length}-byte buffer`);
      }
      
      if (rawSignature.length !== 64) {
        throw new Error(`Failed to extract 64-byte signature from ${sigBuffer.length}-byte buffer`);
      }
      
      // Detect address type to determine which recovery IDs to try
      const isSegwit = address.startsWith("bc1") || address.startsWith("tb1");
      const isTaproot = address.startsWith("bc1p") || address.startsWith("tb1p");
      
      // Recovery ID format:
      // 27-30: non-segwit (27,28=uncompressed/compressed, 29,30=uncompressed/compressed)
      // 31-34: segwit (31,32=uncompressed/compressed, 33,34=uncompressed/compressed)
      // Even numbers (28,30,32,34) = compressed
      // Odd numbers (27,29,31,33) = uncompressed
      // For segwit addresses, we need compressed pubkeys (even recovery IDs)
      let recoveryIds: number[];
      if (isSegwit || isTaproot) {
        // For segwit/taproot addresses, only try compressed recovery IDs
        recoveryIds = [28, 30, 32, 34]; // Compressed: non-segwit and segwit
        if (process.env.NODE_ENV === "development") {
          console.log(`Address is segwit/taproot, trying compressed recovery IDs: ${recoveryIds.join(", ")}`);
        }
      } else {
        // For legacy addresses, try all recovery IDs
        recoveryIds = [27, 28, 29, 30, 31, 32, 33, 34];
        if (process.env.NODE_ENV === "development") {
          console.log(`Address is legacy, trying all recovery IDs: ${recoveryIds.join(", ")}`);
        }
      }
      
      let verified = false;
      let lastError: Error | null = null;
      
      for (const recoveryId of recoveryIds) {
        try {
          const testSig = Buffer.concat([Buffer.from([recoveryId]), rawSignature]);
          // For segwit addresses, checkSegwitAlways should be true
          // For legacy addresses, it can be false
          const checkSegwit = isSegwit || isTaproot;
          const ok = bitcoinMessage.verify(message, address, testSig, undefined, checkSegwit);
          if (ok) {
            verified = true;
            if (process.env.NODE_ENV === "development") {
              console.log(`Signature verified successfully with recovery ID ${recoveryId}`);
            }
            return true;
          }
        } catch (err: any) {
          lastError = err;
          // Try next recovery ID
          continue;
        }
      }
      
      if (!verified) {
        if (require) {
          throw new Error(
            `Invalid wallet signature: could not verify with any recovery ID (27-34). ` +
            `Last error: ${lastError?.message || "Unknown"}`
          );
        }
        if (process.env.NODE_ENV === "development") {
          console.warn("Signature verification failed with all recovery IDs");
        }
        return false;
      }
    }
    
    // Normal verification with the signature as-is
    // Detect address type to determine checkSegwitAlways parameter
    const isSegwit = address.startsWith("bc1") || address.startsWith("tb1");
    const isTaproot = address.startsWith("bc1p") || address.startsWith("tb1p");
    const checkSegwit = isSegwit || isTaproot;
    
    // Also check if the recovery ID indicates compressed (even numbers)
    // firstByte is already defined above, so we reuse it
    const isCompressed = firstByte % 2 === 0; // Even recovery IDs = compressed
    
    // For segwit addresses, we need compressed pubkeys
    // But if require is false, we can skip this check and just try verification
    if (checkSegwit && !isCompressed && require) {
      // The signature has uncompressed recovery ID but address is segwit
      // This won't work, so we need to try different recovery IDs
      if (process.env.NODE_ENV === "development") {
        console.log("Segwit address but signature has uncompressed recovery ID, trying compressed recovery IDs...");
      }
      
      // Extract 64-byte signature from the original buffer
      // Try different extraction strategies since @sats-connect format is unclear
      let rawSignature: Buffer | null = null;
      let verified = false;
      let lastError: Error | null = null;
      
      if (originalBuffer.length === 66) {
        // Strategy 1: Extract bytes 1-64 (skip first byte, take next 64)
        const candidate1 = originalBuffer.slice(1, 65);
        // Strategy 2: Extract bytes 2-65 (skip first 2 bytes)
        const candidate2 = originalBuffer.slice(2, 66);
        // Strategy 3: Extract bytes 0-63 (first 64 bytes)
        const candidate3 = originalBuffer.slice(0, 64);
        
        const candidates = [
          { sig: candidate1, desc: "bytes 1-64" },
          { sig: candidate2, desc: "bytes 2-65" },
          { sig: candidate3, desc: "bytes 0-63" },
        ];
        
        // Try all recovery IDs (both compressed and uncompressed) for each candidate
        // For segwit, we prefer compressed but will try all
        const allRecoveryIds = isSegwit || isTaproot 
          ? [28, 30, 32, 34, 27, 29, 31, 33] // Try compressed first, then uncompressed
          : [27, 28, 29, 30, 31, 32, 33, 34];
        
        for (const candidate of candidates) {
          if (candidate.sig.length !== 64) continue;
          
          for (const recoveryId of allRecoveryIds) {
            try {
              const testSig = Buffer.concat([Buffer.from([recoveryId]), candidate.sig]);
              const checkSegwit = isSegwit || isTaproot;
              const ok = bitcoinMessage.verify(message, address, testSig, undefined, checkSegwit);
              if (ok) {
                verified = true;
                if (process.env.NODE_ENV === "development") {
                  console.log(`Signature verified successfully with recovery ID ${recoveryId} using ${candidate.desc}`);
                }
                return true;
              }
            } catch (err: any) {
              lastError = err;
              continue;
            }
          }
        }
      } else {
        // For 65-byte buffer, extract bytes 1-64
        rawSignature = sigBuffer.slice(1, 65);
        if (rawSignature.length === 64) {
          const allRecoveryIds = isSegwit || isTaproot 
            ? [28, 30, 32, 34, 27, 29, 31, 33]
            : [27, 28, 29, 30, 31, 32, 33, 34];
          
          for (const recoveryId of allRecoveryIds) {
            try {
              const testSig = Buffer.concat([Buffer.from([recoveryId]), rawSignature]);
              const checkSegwit = isSegwit || isTaproot;
              const ok = bitcoinMessage.verify(message, address, testSig, undefined, checkSegwit);
              if (ok) {
                verified = true;
                if (process.env.NODE_ENV === "development") {
                  console.log(`Signature verified successfully with recovery ID ${recoveryId}`);
                }
                return true;
              }
            } catch (err: any) {
              lastError = err;
              continue;
            }
          }
        }
      }
      
      if (!verified) {
        // If signature verification fails but is not required, log warning and continue
        if (!require) {
          console.warn(
            `Signature verification failed for ${isSegwit || isTaproot ? "segwit/taproot" : "legacy"} address. ` +
            `Tried all recovery IDs (27-34) and extraction methods (bytes 1-64, 2-65, 0-63). ` +
            `Last error: ${lastError?.message || "Unknown"}. ` +
            `Continuing without signature verification.`
          );
          return false;
        }
        
        // If required, provide detailed error with suggestions
        const errorMsg = 
          `Invalid wallet signature: could not verify with any recovery ID or signature extraction method. ` +
          `Address type: ${isSegwit || isTaproot ? "segwit/taproot" : "legacy"}. ` +
          `Tried recovery IDs: 27-34. Tried extraction methods: bytes 1-64, 2-65, 0-63. ` +
          `Last error: ${lastError?.message || "Unknown"}. ` +
          `\n\nThis suggests @sats-connect/core signature format may be incompatible with bitcoinjs-message. ` +
          `For development, you can disable signature verification by setting REQUIRE_WALLET_SIG=false in your .env file.`;
        
        throw new Error(errorMsg);
      }
    }
    
    // If we reach here, the signature has a valid recovery ID or we're not requiring verification
    // Try normal verification
    const ok = bitcoinMessage.verify(message, address, sigBuffer, undefined, checkSegwit);
    if (!ok && require) {
      throw new Error("Invalid wallet signature: verification failed");
    }
    return ok;
  } catch (err: any) {
    // Provide more detailed error information
    const errorMessage = err?.message || "Unknown signature verification error";
    const isLengthError = errorMessage.toLowerCase().includes("length") || 
                         errorMessage.toLowerCase().includes("invalid signature");
    
    // Log detailed error information for debugging
    console.error("Signature verification error:", {
      error: errorMessage,
      signatureLength: signature?.length,
      signaturePreview: signature?.substring(0, 100),
      messageLength: message?.length,
      address,
      require,
      stack: err?.stack,
    });
    
    if (require) {
      // Provide more helpful error message for length errors
      if (isLengthError) {
        throw new Error(
          `Invalid signature length (${signature?.length} chars). ` +
          `The signature from your wallet may be in an unsupported format. ` +
          `Please ensure you're using a compatible Bitcoin wallet. ` +
          `Signature preview: ${signature?.substring(0, 50)}...`
        );
      }
      throw new Error(`Signature verification failed: ${errorMessage}`);
    }
    console.warn("Signature verification failed (non-required):", errorMessage);
    return false;
  }
}

export function shouldRequireWalletSig(): boolean {
  return process.env.REQUIRE_WALLET_SIG === "true";
}
