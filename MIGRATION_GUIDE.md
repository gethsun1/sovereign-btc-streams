# Migration Guide: Mock Data → Real Testnet4 Implementation

This guide walks you through migrating from mock data to real Bitcoin testnet4 implementation using Charms.

## Overview

**Current State**: Mock implementation with fallback logic  
**Target State**: Real testnet4 with Charms, Scrolls, and Bitcoin RPC  
**Estimated Time**: 2-4 hours (depending on API access)

**Wallet Note**: The app uses `NEXT_PUBLIC_NETWORK` to set the `@sats-connect/core` `BitcoinNetworkType`. If `NEXT_PUBLIC_NETWORK=testnet4`, your Xverse wallet must also be set to **testnet4**, otherwise Xverse will reject requests with a network mismatch error.

## Prerequisites Checklist

- [ ] Rust toolchain installed
- [ ] Charms CLI v0.10.0 installed
- [ ] Access to Bitcoin testnet4 node (RPC)
- [ ] Testnet4 BTC for testing (from faucet)
- [ ] PostgreSQL database running

**Note**: Charms is fully permissionless - no API keys needed! The prover API at https://v8.charms.dev is public and automatically detects your network from inputs.

### Troubleshooting: Xverse "active network mismatch"

If you see:

```
Invalid request
There's a mismatch between your active network and the network you're logged in with on the app.
```

Check:

- **Wallet**: Xverse is set to **testnet4**.
- **App env**: `NEXT_PUBLIC_NETWORK=testnet4` is present in `.env` (and you restarted `npm run dev`).

## Step-by-Step Migration

### Phase 1: Build Charms App (30 minutes)

#### 1.1 Run Setup Script

```bash
./scripts/setup-testnet4.sh
```

This will:
- Check Rust installation
- Install Charms CLI if needed
- Build the Charms app contract
- Generate verification key
- Create `.env.testnet4` configuration

#### 1.2 Verify Build

```bash
cd charms-app
cargo test
```

All tests should pass. The contract enforces:
- Cliff timestamp validation
- Vesting calculation
- Claim amount bounds
- Commitment tracking

#### 1.3 Save Verification Key

```bash
cd charms-app
app_bin=$(charms app build)
export CHARMS_APP_VK=$(charms app vk "$app_bin")
echo "Your App VK: $CHARMS_APP_VK"
```

Save this verification key - you'll need it in `.env.testnet4`.

### Phase 2: Configure Environment (15 minutes)

#### 2.1 Edit `.env.testnet4`

```bash
cp .env.testnet4.example .env.testnet4
nano .env.testnet4
```

**Required Configuration**:

```bash
# Charms (Public API - No key needed!)
CHARMS_API_BASE=https://v8.charms.dev
CHARMS_APP_VK=your_verification_key_from_step_1.3
CHARMS_APP_BINARY_PATH=/full/path/to/charms-app/target/release/libbtc_stream_charm.so
CHARMS_ALLOW_FALLBACK=false  # Force real implementation

# Scrolls
SCROLLS_API_BASE=https://scrolls.charms.dev
SCROLLS_NETWORK=testnet4

# Bitcoin RPC
BITCOIN_RPC_URL=http://localhost:48332  # Your testnet4 node
BITCOIN_RPC_USER=your_rpc_username
BITCOIN_RPC_PASS=your_rpc_password
```

#### 2.2 Setup Bitcoin Testnet4 Node (Optional)

If you don't have a testnet4 node, you can:

**Option A**: Run your own node
```bash
bitcoind -testnet4 -rpcuser=user -rpcpassword=pass -rpcport=48332
```

**Option B**: Use a public testnet4 RPC service
```bash
BITCOIN_RPC_URL=https://testnet4.bitcoin.example.com/rpc
```

#### 2.3 Get Testnet4 BTC

Visit: https://mempool.space/testnet4/faucet

Request testnet4 BTC to your wallet address. You'll need:
- ~0.001 BTC for transaction fees
- Additional BTC for stream funding

### Phase 3: Install Dependencies (5 minutes)

```bash
npm install @bitcoinerlab/secp256k1 @types/bitcoinjs-lib
```

### Phase 4: Update API Endpoints (30 minutes)

#### 4.1 Update Create Stream API

Edit `pages/api/createStream.ts`:

```typescript
import { mintStreamCharmReal } from "@/lib/charmsReal";
import { getAddressUtxos } from "@/lib/bitcoin";

// Replace the mintStreamCharm call with:
const result = await mintStreamCharmReal({
  totalAmountSats: payload.totalAmountSats,
  rateSatsPerSec: payload.rateSatsPerSec,
  startUnix: payload.startUnix,
  cliffUnix: payload.cliffUnix,
  beneficiary: payload.beneficiary,
  revocationPubkey: payload.revocationPubkey,
  fundingUtxo: fundingUtxo, // Get from user wallet
  changeAddress: walletAddress,
  feeRate: 1,
});

return res.status(200).json({
  streamId: result.streamId,
  charmId: result.charmId,
  vaultId: result.vaultId,
  vaultAddress: result.vaultAddress,
  commitTxId: result.commitTxId,
  spellTxId: result.spellTxId,
});
```

#### 4.2 Update Claim Stream API

Edit `pages/api/claimStream.ts`:

```typescript
import { claimStreamReal } from "@/lib/charmsReal";
import { generateVestingProof } from "@/lib/zkbtc";

// Generate proof
const proof = await generateVestingProof(
  streamId,
  claimedAmountSats,
  timestamp
);

// Claim with real implementation
const result = await claimStreamReal({
  streamId,
  claimedAmountSats,
  timestamp,
  proof,
  fundingUtxo: vaultUtxo, // Get from vault
  feeRate: 1,
});

return res.status(200).json({
  txId: result.txId,
  claimedAmount: result.claimedAmount,
  newCommitment: result.newCommitment,
});
```

### Phase 5: Frontend Updates (20 minutes)

#### 5.1 Add UTXO Selection

Users need to provide a funding UTXO. Update `pages/create.tsx`:

```typescript
const [fundingUtxo, setFundingUtxo] = useState("");

// Add to form
<FormControl>
  <FormLabel>Funding UTXO</FormLabel>
  <Input
    placeholder="txid:vout"
    value={fundingUtxo}
    onChange={(e) => setFundingUtxo(e.target.value)}
  />
  <Text fontSize="sm" color="gray.400">
    Use a UTXO from your wallet to fund the stream creation
  </Text>
</FormControl>

// Include in API call
const payload = {
  ...existingPayload,
  fundingUtxo,
};
```

#### 5.2 Add Transaction Monitoring

Show transaction status to users:

```typescript
const [txStatus, setTxStatus] = useState<{
  commitTx?: string;
  spellTx?: string;
  confirmations?: number;
}>({});

// After stream creation
setTxStatus({
  commitTx: response.commitTxId,
  spellTx: response.spellTxId,
});

// Poll for confirmations
const interval = setInterval(async () => {
  const confs = await checkConfirmations(response.spellTxId);
  setTxStatus(prev => ({ ...prev, confirmations: confs }));
  if (confs >= 1) clearInterval(interval);
}, 10000);
```

### Phase 6: Testing (45 minutes)

#### 6.1 Local Spell Testing

Test your Charms app contract locally:

```bash
cd charms-app

# Create a test spell
cat > test-spell.yaml << EOF
version: 1
apps:
  stream: \${CHARMS_APP_VK}
ins: []
outs:
  - address: tb1qtest
    charms:
      stream:
        total_amount_sats: 100000
        rate_sats_per_sec: 100
        start_unix: 1700000000
        cliff_unix: 1700001000
        streamed_commitment_sats: 0
        beneficiary: "tb1qtest"
        status: "active"
EOF

# Check the spell
charms spell check --spell=test-spell.yaml --app-bins=$(charms app build)
```

#### 6.2 End-to-End Testnet4 Test

1. **Start the app**:
```bash
cp .env.testnet4 .env
npm run dev
```

2. **Connect wallet** (Xverse on testnet4)

3. **Create a test stream**:
   - Amount: 0.0001 BTC (10,000 sats)
   - Rate: 10 sats/sec
   - Start: Now
   - Cliff: 5 minutes from now
   - Beneficiary: Your testnet4 address

4. **Monitor transactions**:
   - Check commit tx on mempool.space/testnet4
   - Check spell tx on mempool.space/testnet4
   - Wait for 1 confirmation

5. **Claim after cliff or claim transaction**

#### 6.3 Verify on Explorer

Check all transactions on: https://mempool.space/testnet4

Look for:
- ✅ Commit transaction confirmed
- ✅ Spell transaction confirmed
- ✅ Charm created in UTXO
- ✅ Claim transaction confirmed
- ✅ Payment to beneficiary

### Phase 7: Monitoring & Debugging (Ongoing)

#### 7.1 Add Logging

```typescript
// In lib/charmsReal.ts
console.log("Prover request:", JSON.stringify(proverRequest, null, 2));
console.log("Prover response:", { commitTx, spellTx });
console.log("Broadcast result:", { commitTxId, spellTxId });
```

#### 7.2 Common Issues

**Issue**: "Prover API failed"
```bash
# Check API key
echo $CHARMS_API_KEY

# Verify app binary exists
ls -la $CHARMS_APP_BINARY_PATH

# Test spell format
charms spell check --spell=your-spell.yaml
```

**Issue**: "UTXO not found"
```bash
# Check Bitcoin RPC connection
bitcoin-cli -testnet4 getblockcount

# Verify UTXO exists
bitcoin-cli -testnet4 gettxout <txid> <vout>
```

**Issue**: "Scrolls signing failed"
```bash
# Verify spell satisfies contract
cd charms-app
cargo test

# Check Scrolls API
curl https://scrolls.charms.dev/config
```

#### 7.3 Rollback Plan

If you need to rollback to mock implementation:

```bash
# Switch back to mock mode
cp .env.example .env
sed -i 's/CHARMS_ALLOW_FALLBACK=false/CHARMS_ALLOW_FALLBACK=true/' .env

# Restart
npm run dev
```

## Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Document current mock behavior
- [ ] Test all features with mock data
- [ ] Save current `.env` as `.env.backup`

### During Migration
- [ ] Build Charms app successfully
- [ ] Get verification key
- [ ] Configure all environment variables
- [ ] Install new dependencies
- [ ] Update API endpoints
- [ ] Update frontend components
- [ ] Test locally with Charms CLI

### Post-Migration
- [ ] Create test stream on testnet4
- [ ] Verify transactions on explorer
- [ ] Test claim flow
- [ ] Test proof verification
- [ ] Monitor for errors
- [ ] Update documentation
- [ ] Train team on new flow

## Performance Considerations

**Mock Implementation**:
- Instant responses
- No blockchain interaction
- No fees

**Real Implementation**:
- Prover: ~5-30 seconds
- Transaction broadcast: ~1 second
- Confirmation: ~10 minutes (1 block)
- Fees: ~1000 sats per transaction

**UI Updates Needed**:
- Add loading states (30s+ for proofs)
- Show transaction status
- Display confirmation count
- Estimate fees before submission

## Security Checklist

- [ ] Never commit `.env.testnet4` to git
- [ ] Store API keys securely
- [ ] Validate all user inputs
- [ ] Verify wallet signatures
- [ ] Check UTXO ownership
- [ ] Validate vesting calculations
- [ ] Test revocation scenarios
- [ ] Implement rate limiting
- [ ] Add transaction monitoring
- [ ] Set up error alerting

## Next Steps After Migration

1. **Monitoring**: Set up transaction monitoring and alerts
2. **Documentation**: Update user guides for testnet4
3. **Testing**: Run comprehensive integration tests
4. **Optimization**: Optimize proof generation time
5. **Mainnet Prep**: Plan mainnet deployment strategy

## Support Resources

- **Charms Docs**: https://docs.charms.dev
- **Charms Discord**: (contact team for invite)
- **Testnet4 Explorer**: https://mempool.space/testnet4
- **Testnet4 Faucet**: https://mempool.space/testnet4/faucet
- **Bitcoin RPC Docs**: https://developer.bitcoin.org/reference/rpc/

## Estimated Costs (Testnet4)

- Stream creation: ~1000 sats (fees)
- Claim transaction: ~500 sats (fees)
- Total per stream lifecycle: ~1500 sats

**Note**: Testnet4 BTC has no value. Use faucets freely for testing.

## Success Criteria

✅ **Migration is successful when**:
1. Streams created on real Bitcoin testnet4
2. Charms visible on blockchain explorer
3. Claims execute with valid proofs
4. Scrolls signs transactions correctly
5. All transactions confirm on testnet4
6. No fallback to mock implementation
7. Error handling works properly
8. User experience is smooth

---

**Questions?** Check `TESTNET4_IMPLEMENTATION.md` for detailed technical guide.
