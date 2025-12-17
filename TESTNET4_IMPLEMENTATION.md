# Testnet4 Implementation Guide for Sovereign BTC Streams

## Overview

This guide outlines the steps to transition from mock data to real Bitcoin testnet4 implementation using Charms, Scrolls, and zkBTC infrastructure.

## Architecture Components

### 1. **Charms** - Programmable Token Layer
- **Purpose**: Create NFT charms that represent stream metadata on Bitcoin UTXOs
- **What it does**: Mints stream charms, updates state, manages app logic
- **API**: Public, permissionless - NO API KEY REQUIRED
- **Network Detection**: Automatically detects mainnet/testnet4 from your inputs
- **Current Status**: Mock implementation with fallback logic

### 2. **Scrolls** - Covenant Signing Service
- **Purpose**: Deterministic Bitcoin address generation and transaction signing
- **What it does**: Generates vault addresses, signs transactions according to spell rules
- **Current Status**: Basic API integration ready

### 3. **zkBTC** - Zero-Knowledge Proof System
- **Purpose**: Generate and verify vesting proofs without revealing sensitive data
- **What it does**: Proves vested amounts are correct based on time elapsed
- **Current Status**: Mock proof generation with fallback

## Implementation Phases

### Phase 1: Charms App Development (REQUIRED FIRST)

#### 1.1 Install Charms CLI

```bash
# Set cargo target directory
export CARGO_TARGET_DIR=$(mktemp -d)/target

# Install Charms CLI v0.10.0
cargo install charms --version=0.10.0
```

#### 1.2 Create Stream Charm App

```bash
# Create new Charms app for BTC streams
charms app new btc-stream-charm

cd btc-stream-charm

# Clear cargo target
unset CARGO_TARGET_DIR
cargo update
```

#### 1.3 Implement Stream Contract Logic

Create `src/lib.rs` with the stream vesting logic:

```rust
use charms_data::*;

pub fn app_contract(
    app: &App,
    tx: &Transaction,
    x: &Data,
    w: &Data
) -> bool {
    // Stream charm data structure
    let stream_data = match x {
        Data::Map(m) => m,
        _ => return false,
    };
    
    // Extract stream parameters
    let total_amount = stream_data.get("total_amount_sats").and_then(|d| d.as_u64());
    let rate_per_sec = stream_data.get("rate_sats_per_sec").and_then(|d| d.as_u64());
    let start_unix = stream_data.get("start_unix").and_then(|d| d.as_u64());
    let cliff_unix = stream_data.get("cliff_unix").and_then(|d| d.as_u64());
    let streamed_commitment = stream_data.get("streamed_commitment_sats").and_then(|d| d.as_u64());
    let beneficiary = stream_data.get("beneficiary").and_then(|d| d.as_str());
    
    // Validate all required fields exist
    if total_amount.is_none() || rate_per_sec.is_none() || 
       start_unix.is_none() || cliff_unix.is_none() || 
       streamed_commitment.is_none() || beneficiary.is_none() {
        return false;
    }
    
    // Witness data contains claim information
    let witness_data = match w {
        Data::Map(m) => m,
        _ => return false,
    };
    
    let claimed_amount = witness_data.get("claimed_amount_sats").and_then(|d| d.as_u64());
    let claim_timestamp = witness_data.get("timestamp").and_then(|d| d.as_u64());
    
    // If this is a claim transaction
    if let (Some(claimed), Some(timestamp)) = (claimed_amount, claim_timestamp) {
        let total = total_amount.unwrap();
        let rate = rate_per_sec.unwrap();
        let start = start_unix.unwrap();
        let cliff = cliff_unix.unwrap();
        let committed = streamed_commitment.unwrap();
        
        // Validate claim is after cliff
        if timestamp < cliff {
            return false;
        }
        
        // Calculate vested amount
        let elapsed = timestamp.saturating_sub(start);
        let vested = std::cmp::min(elapsed * rate, total);
        
        // Validate claimed amount doesn't exceed vested - committed
        let claimable = vested.saturating_sub(committed);
        if claimed > claimable {
            return false;
        }
        
        // Validate beneficiary receives the claimed amount
        // Check transaction outputs for beneficiary address
        // (Implementation depends on Charms transaction structure)
        
        return true;
    }
    
    // For non-claim transactions (transfers, etc.)
    // Allow owner to manage the charm
    true
}
```

#### 1.4 Build and Get Verification Key

```bash
# Build the app
app_bin=$(charms app build)

# Get verification key (app_vk)
charms app vk "$app_bin"

# Save this verification key - you'll need it for API calls
export APP_VK=$(charms app vk "$app_bin")
```

#### 1.5 Create Spell Templates

Create `spells/mint-stream.yaml`:

```yaml
version: 1
apps:
  stream: ${app_vk}

ins: []

outs:
  - address: ${vault_address}
    charms:
      stream:
        total_amount_sats: ${total_amount_sats}
        rate_sats_per_sec: ${rate_sats_per_sec}
        start_unix: ${start_unix}
        cliff_unix: ${cliff_unix}
        streamed_commitment_sats: 0
        beneficiary: "${beneficiary}"
        revocation_pubkey: "${revocation_pubkey}"
        status: "active"
```

Create `spells/claim-stream.yaml`:

```yaml
version: 1
apps:
  stream: ${app_vk}

ins:
  - utxo_id: ${stream_utxo}
    charms:
      stream: ${stream_charm_data}

outs:
  - address: ${vault_address}
    charms:
      stream: ${updated_stream_data}
  - address: ${beneficiary}
    value: ${claimed_amount_sats}

witness:
  claimed_amount_sats: ${claimed_amount_sats}
  timestamp: ${claim_timestamp}
  proof: ${zk_proof}
```

### Phase 2: Backend Integration

#### 2.1 Update Environment Variables

Add to `.env`:

```bash
# Charms Configuration
CHARMS_API_BASE=https://v8.charms.dev
CHARMS_API_KEY=your_api_key_here
CHARMS_ALLOW_FALLBACK=false
CHARMS_APP_VK=your_app_verification_key_here
CHARMS_APP_BINARY_PATH=/path/to/btc-stream-charm/target/release/app

# Scrolls Configuration
SCROLLS_API_BASE=https://scrolls.charms.dev
SCROLLS_NETWORK=testnet4

# zkBTC Configuration (if available)
ZKBTC_API_BASE=https://zkbtc.example.com
ZKBTC_API_KEY=your_zkbtc_key_here
ZKBTC_ALLOW_FALLBACK=true

# Bitcoin Testnet4 RPC (for broadcasting)
BITCOIN_RPC_URL=https://testnet4.bitcoin.example.com
BITCOIN_RPC_USER=your_rpc_user
BITCOIN_RPC_PASS=your_rpc_password
```

#### 2.2 Create Charms Prover Integration

The Charms Prover API workflow:

1. **Prepare Spell** - Define inputs, outputs, and app logic
2. **Call Prover** - POST to `/spells/prove` with spell + binaries
3. **Receive Transactions** - Get commit tx and spell tx
4. **Broadcast** - Send transactions to Bitcoin network

#### 2.3 Implement Real UTXO Management

You'll need to:
- Track actual Bitcoin UTXOs for vaults
- Query Bitcoin node for UTXO data
- Build proper transaction inputs/outputs
- Handle fee calculation

### Phase 3: Critical Implementation Steps

#### 3.1 Stream Creation Flow

```typescript
// Real implementation (no mocks)
async function createStreamReal(params: CreateStreamParams) {
  // 1. Generate vault nonce (unique ID)
  const vaultNonce = generateVaultNonce();
  
  // 2. Get deterministic vault address from Scrolls
  const vaultAddress = await getScrollsAddress('testnet4', vaultNonce);
  
  // 3. Prepare spell for minting stream charm
  const spell: Spell = {
    version: 1,
    apps: {
      stream: process.env.CHARMS_APP_VK!
    },
    ins: [],
    outs: [{
      address: vaultAddress,
      charms: {
        stream: {
          total_amount_sats: params.totalAmountSats,
          rate_sats_per_sec: params.rateSatsPerSec,
          start_unix: params.startUnix,
          cliff_unix: params.cliffUnix,
          streamed_commitment_sats: 0,
          beneficiary: params.beneficiary,
          revocation_pubkey: params.revocationPubkey,
          status: 'active'
        }
      }
    }]
  };
  
  // 4. Get funding UTXO (user provides or from wallet)
  const fundingUtxo = await getFundingUtxo();
  
  // 5. Call Charms Prover
  const proverRequest: ProverRequest = {
    spell,
    binaries: {
      stream: fs.readFileSync(process.env.CHARMS_APP_BINARY_PATH!).toString('base64')
    },
    prev_txs: [await getPrevTx(fundingUtxo)],
    funding_utxo: fundingUtxo,
    funding_utxo_value: await getUtxoValue(fundingUtxo),
    change_address: params.changeAddress,
    fee_rate: 1 // sats/vbyte
  };
  
  const { commitTx, spellTx } = await proveSpell(proverRequest);
  
  // 6. Broadcast transactions
  await broadcastTx(commitTx);
  await broadcastTx(spellTx);
  
  // 7. Wait for confirmation and extract charm ID
  const charmId = await waitForCharmCreation(spellTx);
  
  return {
    streamId: generateStreamId(charmId),
    charmId,
    vaultId: vaultNonce.toString(),
    vaultAddress,
    commitTxId: getTxId(commitTx),
    spellTxId: getTxId(spellTx)
  };
}
```

#### 3.2 Claim Flow

```typescript
async function claimStreamReal(streamId: string, claimedAmountSats: number) {
  // 1. Get stream charm data
  const stream = await getStream(streamId);
  const charmUtxo = await findCharmUtxo(stream.charm_id);
  
  // 2. Generate ZK proof of vesting
  const timestamp = nowUnix();
  const proof = await generateVestingProof(streamId, claimedAmountSats, timestamp);
  
  // 3. Calculate new streamed commitment
  const newCommitment = stream.streamed_commitment_sats + claimedAmountSats;
  
  // 4. Build claim spell
  const spell: Spell = {
    version: 1,
    apps: { stream: process.env.CHARMS_APP_VK! },
    ins: [{
      utxo_id: charmUtxo,
      charms: {
        stream: stream.charm_data
      }
    }],
    outs: [
      {
        // Updated charm back to vault
        address: stream.vault_address,
        charms: {
          stream: {
            ...stream.charm_data,
            streamed_commitment_sats: newCommitment
          }
        }
      },
      {
        // Payment to beneficiary
        address: stream.beneficiary,
        value: claimedAmountSats
      }
    ]
  };
  
  // 5. Get vault UTXOs for funding
  const vaultUtxos = await getVaultUtxos(stream.vault_address);
  
  // 6. Call Charms Prover with witness data
  const proverRequest: ProverRequest = {
    spell,
    binaries: { stream: getAppBinary() },
    prev_txs: await getPrevTxs([charmUtxo, ...vaultUtxos]),
    funding_utxo: vaultUtxos[0],
    funding_utxo_value: await getUtxoValue(vaultUtxos[0]),
    change_address: stream.vault_address,
    fee_rate: 1,
    witness: {
      claimed_amount_sats: claimedAmountSats,
      timestamp,
      proof: proof.proof
    }
  };
  
  const { commitTx, spellTx } = await proveSpell(proverRequest);
  
  // 7. Request Scrolls to sign (covenant validation)
  const signedTx = await signWithScrolls('testnet4', {
    sign_inputs: [{ index: 0, nonce: stream.vault_nonce }],
    prev_txs: [commitTx],
    tx_to_sign: spellTx
  });
  
  // 8. Broadcast
  await broadcastTx(commitTx);
  await broadcastTx(signedTx);
  
  return {
    txId: getTxId(signedTx),
    claimedAmount: claimedAmountSats,
    newCommitment
  };
}
```

## Required Dependencies

### New npm packages:

```bash
npm install bitcoinjs-lib @bitcoinerlab/secp256k1
npm install --save-dev @types/bitcoinjs-lib
```

### System requirements:

- Rust toolchain (for building Charms apps)
- Bitcoin testnet4 node access (for broadcasting)
- Charms CLI v0.10.0

## Testing Strategy

### 1. Local Testing
- Use Charms CLI to test spells locally
- Validate app contract logic with test cases
- Mock Bitcoin node responses

### 2. Testnet4 Testing
- Start with small amounts (1000 sats)
- Test full create → claim → verify flow
- Monitor transactions on testnet4 explorer

### 3. Integration Testing
- Test wallet connection with Xverse
- Verify signature validation
- Test error handling and fallbacks

## Security Considerations

1. **Vault Security**: Scrolls controls vault keys, validates spells
2. **Proof Verification**: ZK proofs ensure correct vesting calculations
3. **Charm Validation**: App contract enforces business logic
4. **Revocation**: Implement emergency stop mechanism

## Next Steps

1. ✅ **Build Charms App** - Implement stream contract logic
2. ⏳ **Get API Access** - Obtain Charms/Scrolls API keys
3. ⏳ **Implement UTXO Tracking** - Build Bitcoin node integration
4. ⏳ **Update Backend APIs** - Replace mock functions with real calls
5. ⏳ **Test on Testnet4** - Deploy and test with real BTC
6. ⏳ **Add Monitoring** - Track transactions and charm states
7. ⏳ **Documentation** - Update user guides for testnet

## Resources

- **Charms Docs**: https://docs.charms.dev
- **Charms GitHub**: https://github.com/CharmsDev/charms
- **Testnet4 Faucet**: https://mempool.space/testnet4/faucet
- **Scrolls API**: https://scrolls.charms.dev (check for docs)

## Common Issues & Solutions

### Issue: "Prover API failed"
- **Solution**: Check API key, verify spell format, ensure binaries are correct

### Issue: "Scrolls signing failed"
- **Solution**: Verify spell satisfies app contract, check nonce matches vault

### Issue: "UTXO not found"
- **Solution**: Wait for confirmations, check Bitcoin node sync status

### Issue: "Invalid proof"
- **Solution**: Verify timestamp, check vesting calculation, validate proof format
