# BTC Stream Charm App

This is the Charms application contract for Sovereign BTC Streams. It enforces vesting schedules on Bitcoin using programmable charms.

## Building

### Prerequisites

1. Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. Install Charms CLI:
```bash
export CARGO_TARGET_DIR=$(mktemp -d)/target
cargo install charms --version=0.10.0
```

### Build the App

```bash
cd charms-app

# Build the app binary
cargo build --release

# Or use Charms CLI
charms app build
```

### Get Verification Key

```bash
# Get the app verification key (needed for API calls)
app_bin=$(charms app build)
charms app vk "$app_bin"

# Save to environment
export CHARMS_APP_VK=$(charms app vk "$app_bin")
```

## Testing

Run the contract tests:

```bash
cargo test
```

## Contract Logic

The stream charm contract validates:

1. **Cliff Enforcement**: Claims must occur after the cliff timestamp
2. **Vesting Calculation**: `vested = min(elapsed * rate, total)`
3. **Claimable Amount**: `claimable = vested - committed`
4. **Claim Bounds**: Claimed amount must be > 0 and <= claimable
5. **Transfer Permission**: Allows charm transfers without witness data

## Data Structure

### Charm Data (x)
```rust
{
    "total_amount_sats": u64,
    "rate_sats_per_sec": u64,
    "start_unix": u64,
    "cliff_unix": u64,
    "streamed_commitment_sats": u64,
    "beneficiary": String,
    "status": String,
}
```

### Witness Data (w)
```rust
{
    "claimed_amount_sats": u64,
    "timestamp": u64,
    "proof": {...}, // ZK proof (optional, validated off-chain)
}
```

## Integration

After building, set these environment variables in your Next.js app:

```bash
# Path to the compiled binary
CHARMS_APP_BINARY_PATH=/path/to/charms-app/target/release/libbtc_stream_charm.so

# Verification key from `charms app vk`
CHARMS_APP_VK=your_verification_key_here
```

## Deployment

1. Build the release binary
2. Test with local spells
3. Deploy to testnet4
4. Monitor charm creation and claims
