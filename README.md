# Sovereign BTC Streams

Sovereign BTC Streams is a Next.js DApp that demonstrates **vault-backed BTC streaming** using **Charms** (ZK Logic) and **Scrolls** (Programmable Vaults).

This architecture allows for **Sovereign** streams, where funds are held in a vault that enforces off-chain vesting logic via on-chain Zero-Knowledge Proofs, rather than relying on a trusted custodian.

---

## Architecture

```mermaid
flowchart TD
    A[Next.js App] --> B[/api/createStream]
    A --> C[/api/claimStream]
    
    subgraph "Sovereign Infrastructure"
        B -->|Derive Address| D[Scrolls API]
        B -->|Mint Charm| E[Charms Indexer]
        C -->|Prove Vesting| F[Charms Prover]
        C -->|Sign Tx| D
    end

    D -->|Bitcoin Network| G[BTC Testnet4]
```

### Core Components
- **Charms**: Provides the "Spell" logic (vesting schedules) and Prover API (`https://v8.charms.dev`).
- **Scrolls**: Acts as the Programmable Vault (`https://scrolls.charms.dev`). It derives deterministic addresses and only signs transactions that carry valid Spells/Proofs.
- **Prisma + PostgreSQL**: Persists stream metadata locally for specific application needs.

---

## Stack
- **Frontend**: Next.js 14, Chakra UI, React 18
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15
- **Bitcoin**: `@sats-connect/core` (Xverse Wallet), `bitcoinjs-lib`
- **Integrations**: Charms Prover API, Scrolls Bitcoin API

---

## Quickstart (Docker)

The easiest way to run the full stack (App + DB) is via Docker Compose.

```bash
# 1. Start the Database
docker compose up -d db

# 2. Run Migrations
npx prisma migrate deploy

# 3. Start the Application
docker compose up -d app
# App available at http://localhost:3000
```

## Quickstart (Local Dev)

If you prefer running the app locally against a Dockerized DB:

```bash
# 1. Start DB
docker compose up -d db

# 2. Install Dependencies
npm install

# 3. Configure Environment
cp .env.example .env
# Ensure DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streams

# 4. Run Migrations & Start
npx prisma migrate deploy
npm run dev
```

---

## Environment Variables

Configuration is strictly validated on startup (`lib/env.ts`).

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL Connection String | (Required) |
| `scROLLS_API_BASE` | Scrolls API Endpoint | `https://scrolls.charms.dev` |
| `CHARMS_API_BASE` | Charms Prover Endpoint | `https://v8.charms.dev` |
| `REQUIRE_WALLET_SIG` | Enforce wallet ownership | `true` |

---

## Key Flows

1.  **Create Stream**:
    - User submits stream details.
    - App calls **Scrolls** to derive a unique Vault Address.
    - App calls **Charms** to mint a "StreamCharm" tracking the state.
    - User funds the Vault Address (mocked in demo).

2.  **Claim Stream**:
    - App calculates claimable amount.
    - App constructs a **Spell** (ZK execution trace).
    - App calls **Charms Prover** to verify and generate a transaction (`spell_tx`).
    - App calls **Scrolls** to sign the `spell_tx`.
    - Signed transaction is returned to user/relayed.

---

## License
MIT