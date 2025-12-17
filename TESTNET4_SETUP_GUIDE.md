# Testnet4 Setup Guide - Quick Start

## ✅ Step 1: Verification Key Generated

Your Charms app verification key has been generated:

```
CHARMS_APP_VK=ee269166dec91c62b214159cecdf968601cde7833e2d17a79018f0f13564c2e3
```

This has been saved to `.env.testnet4`.

## 🔧 Step 2: Configure Bitcoin RPC

You have **three options** for Bitcoin testnet4 access:

### Option A: Local Bitcoin Testnet4 Node (Recommended)

**Install Bitcoin Core:**
```bash
# Ubuntu/Debian
sudo apt-get install bitcoind

# macOS
brew install bitcoin
```

**Start testnet4 node:**
```bash
bitcoind -testnet4 \
  -rpcuser=testnet4user \
  -rpcpassword=testnet4pass \
  -rpcport=48332 \
  -daemon
```

**Update `.env.testnet4`:**
```bash
BITCOIN_RPC_URL=http://localhost:48332
BITCOIN_RPC_USER=testnet4user
BITCOIN_RPC_PASS=testnet4pass
```

**Wait for sync:**
```bash
bitcoin-cli -testnet4 getblockchaininfo
# Wait until "blocks" matches "headers"
```

### Option B: Public Testnet4 RPC Services

**Mempool.space API:**
```bash
# In .env.testnet4
BITCOIN_RPC_URL=https://mempool.space/testnet4/api
```

**Note**: You'll need to adapt the RPC calls in `lib/bitcoin.ts` to use REST API instead of JSON-RPC.

### Option C: BlockCypher API

```bash
# In .env.testnet4
BITCOIN_RPC_URL=https://api.blockcypher.com/v1/btc/test4
```

**For now, I recommend Option A (local node) for full functionality.**

## 💰 Step 3: Get Testnet4 BTC

### Faucet Options:

1. **Mempool.space Faucet** (Recommended)
   - URL: https://mempool.space/testnet4/faucet
   - Amount: ~0.001 BTC per request
   - No registration required

2. **Coinfaucet.eu**
   - URL: https://coinfaucet.eu/en/btc-testnet4/
   - Amount: Variable
   - May require captcha

3. **Bitcoin Testnet Faucet**
   - URL: https://testnet-faucet.com/btc-testnet4/
   - Amount: ~0.0001 BTC

### Steps:

1. **Get your wallet address** (from Xverse or other testnet4 wallet)
   - Make sure it's a testnet4 address (starts with `tb1`)

2. **Visit faucet and request BTC**
   ```
   Example address: tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx
   ```

3. **Wait for confirmation** (usually 10-20 minutes)
   - Check on: https://mempool.space/testnet4/address/YOUR_ADDRESS

4. **Verify balance**
   ```bash
   # If using local node
   bitcoin-cli -testnet4 getbalance
   ```

## 🗄️ Step 4: Setup Database

```bash
# Start PostgreSQL
docker-compose up -d db

# Or if you have PostgreSQL installed locally
sudo systemctl start postgresql

# Update DATABASE_URL in .env.testnet4 if needed
# Default: postgresql://user:password@localhost:5432/sovereign_btc_streams_testnet

# Run migrations
npm run migrate:deploy
```

## 🚀 Step 5: Test Stream Creation

### Start the Application

```bash
# Copy testnet4 config to .env
cp .env.testnet4 .env

# IMPORTANT: if you change NEXT_PUBLIC_NETWORK, restart the dev server

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

### Wallet Network Requirement (Xverse)

Your wallet network must match the app network:

- If `.env` has `NEXT_PUBLIC_NETWORK=testnet4`, set Xverse to **testnet4**.

If they don’t match, Xverse will error with:

```
Invalid request
There's a mismatch between your active network and the network you're logged in with on the app.
```

### Create Your First Stream

1. **Open browser**: http://localhost:3000

2. **Connect Wallet** (Xverse on testnet4)
   - Switch Xverse to testnet4 mode
   - Connect wallet

3. **Navigate to Create Stream**: http://localhost:3000/create

4. **Fill in stream details**:
   ```
   Total Amount: 10000 sats (0.0001 BTC)
   Rate: 10 sats/second
   Start Time: Now (current timestamp)
   Cliff Time: 5 minutes from now
   Beneficiary: Your testnet4 address
   Revocation Pubkey: Your public key (from wallet)
   Funding UTXO: txid:vout (from your wallet)
   Change Address: Your testnet4 address
   ```

5. **Submit and wait**:
   - Prover generates transactions (~30 seconds)
   - Transactions broadcast to testnet4
   - Wait for confirmations (~10 minutes)

6. **Monitor on explorer**:
   - https://mempool.space/testnet4/tx/YOUR_TX_ID

### Test Claim Flow

1. **Wait for cliff period** (5 minutes after stream start)

2. **Navigate to Claim**: http://localhost:3000/claim

3. **Select your stream**

4. **Claim vested amount**:
   - After 5 minutes: ~3000 sats vested
   - Claim any amount up to vested

5. **Verify claim transaction** on explorer

## 🔍 Verification Checklist

- [ ] Charms app built successfully
- [ ] Verification key generated
- [ ] `.env.testnet4` configured
- [ ] Bitcoin RPC accessible
- [ ] Testnet4 BTC received in wallet
- [ ] Database running and migrated
- [ ] Dev server started
- [ ] Wallet connected
- [ ] Stream created on testnet4
- [ ] Transactions confirmed
- [ ] Claim executed successfully

## 🐛 Troubleshooting

### Issue: "CHARMS_API_BASE not configured"
**Solution**: Make sure `.env.testnet4` is copied to `.env`

### Issue: "Bitcoin RPC failed"
**Solution**: 
- Check if Bitcoin node is running: `bitcoin-cli -testnet4 getblockchaininfo`
- Verify RPC credentials in `.env.testnet4`
- Check if node is synced

### Issue: "Prover API failed"
**Solution**:
- Check spell format
- Verify app binary exists at `CHARMS_APP_BINARY_PATH`
- Check Charms API status: `curl https://v8.charms.dev/health`

### Issue: "UTXO not found"
**Solution**:
- Verify UTXO exists: `bitcoin-cli -testnet4 gettxout <txid> <vout>`
- Wait for confirmation if transaction is recent
- Check UTXO format is `txid:vout`

### Issue: "Transaction broadcast failed"
**Solution**:
- Check transaction hex is valid
- Verify fee is sufficient (>= 1 sat/vbyte)
- Check if inputs are unspent

## 📊 Current Configuration Summary

```
✅ Charms App VK: ee269166dec91c62b214159cecdf968601cde7833e2d17a79018f0f13564c2e3
✅ Binary Path: /home/quantum/.../charms-app/target/wasm32-wasip1/release/btc_stream_charm.wasm
✅ Charms API: https://v8.charms.dev (public, no key)
✅ Scrolls API: https://scrolls.charms.dev (testnet4)
⏳ Bitcoin RPC: TODO - Configure in .env.testnet4
⏳ Testnet4 BTC: TODO - Get from faucet
⏳ Database: TODO - Start and migrate
```

## 🎯 Next Actions

1. **Choose Bitcoin RPC option** and configure in `.env.testnet4`
2. **Get testnet4 BTC** from faucet
3. **Start database** and run migrations
4. **Copy `.env.testnet4` to `.env`**
5. **Start dev server** with `npm run dev`
6. **Create test stream** and monitor on explorer

## 📚 Resources

- **Testnet4 Explorer**: https://mempool.space/testnet4
- **Testnet4 Faucet**: https://mempool.space/testnet4/faucet
- **Charms Docs**: https://docs.charms.dev
- **Bitcoin RPC Docs**: https://developer.bitcoin.org/reference/rpc/

---

**You're ready to test on real Bitcoin testnet4!** 🚀

Start with configuring Bitcoin RPC, then get some testnet BTC, and you'll be creating streams on the blockchain in no time.
