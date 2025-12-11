# Sovereign BTC Streams

Sovereign BTC Streams is a Next.js DApp that demonstrates vault-backed BTC streaming with Charms and zkBTC proofing. The code supports real testnet endpoints when available and cleanly falls back to deterministic mocks for offline/demo use.

---

## Architecture (high level)

```mermaid
flowchart TD
    A[Next.js UI]
    B[/api/createStream/]
    C[/api/claimStream/]
    D[/api/verifyProof/]
    E[Grail Pro Vault (testnet/mocked)]
    F[Charms SDK (testnet/mocked)]
    G[zkBTC proof gen/verify (testnet/mocked)]

    A --> B
    A --> C
    A --> D
    B --> E
    B --> F
    C --> F
    C --> G
    D --> G
```

---

## Stack
- Next.js (pages router) + TypeScript
- Chakra UI
- Axios for HTTP
- SQLite (better-sqlite3) for local state
- Charms / Grail / zkBTC integrations with testnet-or-mock fallbacks
- snarkjs for mockable proof digesting
- Xverse (via `@sats-connect/core`) for Bitcoin testnet wallet connect & signing

---

## Quickstart
```bash
npm install
npm run dev
# open http://localhost:3000
```

Seed a demo stream (uses mocks if no env vars):
```bash
npm run demo
```

Connect a wallet (Xverse, Bitcoin testnet):
- Install Xverse browser extension and switch to Bitcoin testnet.
- Click “Connect Xverse” (top-right of each page). If not connected, the app falls back to a deterministic mock signer.

---

## Environment
Set any of the following to hit real testnet endpoints; leave unset to use mocks.

```bash
# Wallet signature enforcement
REQUIRE_WALLET_SIG=true          # require valid wallet signature on API routes

# Grail Pro
GRAIL_API_BASE=https://grail-pro-testnet.example.com
GRAIL_API_KEY=...
GRAIL_ALLOW_FALLBACK=true   # set to false to fail fast

# Charms
CHARMS_API_BASE=https://charms-testnet.example.com
CHARMS_API_KEY=...
CHARMS_ALLOW_FALLBACK=true

# zkBTC
ZKBTC_API_BASE=https://zkbtc-testnet.example.com
ZKBTC_API_KEY=...
ZKBTC_ALLOW_FALLBACK=true
```

SQLite lives at `data/streams.db` and is created automatically.

---

## Key flows
- **/pages/create.tsx** → POST `/api/createStream`: deposits into Grail, mints StreamCharm, persists stream.
- **/pages/claim.tsx** → POST `/api/claimStream`: generates zk proof, verifies, updates streamed commitment, simulates cross-chain release.
- **/pages/verify.tsx** → POST `/api/verifyProof`: auditor-style verification of provided proof.
- **/api/streams**: lightweight dashboard feed for all streams + claims.

---

## API reference (local dev)
- `POST /api/createStream`  
  `{ totalAmountBtc, rateSatsPerSec, startUnix, cliffUnix, beneficiary, revocationPubkey, policy }`
- `POST /api/claimStream`  
  `{ streamId, claimedAmountSats, timestamp }`
- `POST /api/verifyProof`  
  `{ streamId, proof, claimedAmountSats, timestamp }`
- `GET /api/streams` → `{ streams: [...] }`

All amounts are integers in sats except `totalAmountBtc` (BTC) on creation.

---

## Demo & testing checklist
- `npm run demo` seeds a stream with mock/testnet integrations.
- `npm run dev` and visit:
  - `/` dashboard (fetches `/api/streams`)
  - `/create` to mint a new stream
  - `/claim` to generate & verify zk proof, update commitments
  - `/verify` to audit any proof payload
- Toggle env vars above to switch between real testnet calls and deterministic mocks.

---

## Production hardening (next steps)
- Wire real Grail/Charms/zkBTC endpoints and secrets management.
- Add per-request auth + rate limiting.
- Persist to external DB (Postgres) and add background stream updaters.
- Integrate real cross-chain unlock flows (Cardano/Litecoin testnets).

## License
MIT