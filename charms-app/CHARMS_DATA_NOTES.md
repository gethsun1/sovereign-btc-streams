# Charms Data Type Structure - Implementation Notes

## Current Status

The Charms app contract (`src/lib.rs`) currently uses a **permissive implementation** that allows all operations. This is because the exact structure of the `charms_data::Data` type needs to be determined.

## Why the Permissive Implementation?

The `charms-data` v0.10 crate uses a different API structure than initially assumed. The compilation errors showed that `Data` doesn't have variants like `Map`, `U64`, `Str` as enum variants.

## Next Steps to Implement Full Validation

### 1. Inspect the Data Type

Once you have the Charms app building successfully, you can inspect the actual `Data` type:

```bash
# In the charms-app directory
cargo doc --open

# Or check the charms-data source
cargo tree -i charms-data
```

### 2. Common Patterns in CBOR-based Systems

The `Data` type is likely CBOR-based (Concise Binary Object Representation). Common patterns:

```rust
// Pattern 1: Direct CBOR access
use ciborium::Value;
let value: Value = /* parse from Data */;

// Pattern 2: Serialization/Deserialization
#[derive(Deserialize)]
struct StreamData {
    total_amount_sats: u64,
    rate_sats_per_sec: u64,
    // ...
}
let stream: StreamData = /* deserialize from Data */;

// Pattern 3: Custom accessor methods
let total = x.get_u64("total_amount_sats")?;
```

### 3. Reference Implementation

Check the Charms examples for how to work with Data:

```bash
# Clone Charms repo
git clone https://github.com/CharmsDev/charms
cd charms/examples

# Look at example apps
ls -la
```

### 4. Implement Validation Logic

Once you understand the Data structure, implement:

```rust
pub fn app_contract(
    _app: &App,
    _tx: &Transaction,
    x: &Data,
    w: &Data,
) -> bool {
    // 1. Extract stream parameters from x
    let total_amount = extract_u64(x, "total_amount_sats")?;
    let rate_per_sec = extract_u64(x, "rate_sats_per_sec")?;
    let start_unix = extract_u64(x, "start_unix")?;
    let cliff_unix = extract_u64(x, "cliff_unix")?;
    let streamed_commitment = extract_u64(x, "streamed_commitment_sats")?;
    
    // 2. Extract claim info from witness
    let claimed_amount = extract_u64(w, "claimed_amount_sats")?;
    let claim_timestamp = extract_u64(w, "timestamp")?;
    
    // 3. Validate cliff
    if claim_timestamp < cliff_unix {
        return false;
    }
    
    // 4. Calculate vested amount
    let elapsed = claim_timestamp.saturating_sub(start_unix);
    let vested = u64::min(elapsed.saturating_mul(rate_per_sec), total_amount);
    
    // 5. Validate claim amount
    let claimable = vested.saturating_sub(streamed_commitment);
    if claimed_amount > claimable || claimed_amount == 0 {
        return false;
    }
    
    true
}
```

## Testing Strategy

### Phase 1: Infrastructure Testing (Current)
- ✅ App compiles
- ✅ Verification key generated
- ✅ Can call Charms Prover API
- ✅ Transactions broadcast to testnet4

### Phase 2: Contract Logic Testing (After Data type is understood)
- Implement full validation
- Add comprehensive tests
- Test with real spells on testnet4

## Security Considerations

**Current Permissive Implementation**:
- ⚠️ Allows ANY operation
- ⚠️ No vesting validation
- ⚠️ No claim bounds checking
- ✅ Good for infrastructure testing
- ❌ NOT production ready

**Full Implementation Required For**:
- Production deployment
- Mainnet usage
- Real value protection

## Resources

- **Charms GitHub**: https://github.com/CharmsDev/charms
- **Charms Docs**: https://docs.charms.dev
- **CBOR Spec**: https://cbor.io
- **Ciborium Crate**: https://docs.rs/ciborium

## Timeline

1. **Now**: Use permissive contract for infrastructure testing
2. **After first successful testnet4 transaction**: Inspect Data structure
3. **Before mainnet**: Implement full validation logic
4. **Before production**: Comprehensive security audit

---

**Remember**: The permissive implementation is a stepping stone. It allows you to:
- Test the Charms integration
- Verify transaction broadcasting
- Understand the full flow
- Build confidence with the infrastructure

Once you're comfortable with the infrastructure, implementing the full contract logic will be straightforward.
