-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "vault_id" TEXT,
    "charm_id" TEXT,
    "beneficiary" TEXT NOT NULL,
    "total_amount_sats" BIGINT NOT NULL,
    "rate_sats_per_sec" BIGINT NOT NULL,
    "start_unix" BIGINT NOT NULL,
    "cliff_unix" BIGINT NOT NULL,
    "revocation_pubkey" TEXT NOT NULL,
    "streamed_commitment_sats" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "stream_id" TEXT NOT NULL,
    "amount_sats" BIGINT NOT NULL,
    "proof" TEXT NOT NULL,
    "verified" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaults" (
    "id" TEXT NOT NULL,
    "amount_sats" BIGINT NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "policy" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaults_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
