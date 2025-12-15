import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // Node Env
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // App Flags
    REQUIRE_WALLET_SIG: z.string().transform((s) => s === "true").optional(),

    // Grail
    GRAIL_API_BASE: z.string().url().optional(),
    GRAIL_API_KEY: z.string().optional(),
    GRAIL_ALLOW_FALLBACK: z.string().transform((s) => s !== "false").default(true),

    // Charms
    CHARMS_API_BASE: z.string().url().optional(),
    CHARMS_API_KEY: z.string().optional(),
    CHARMS_ALLOW_FALLBACK: z.string().transform((s) => s !== "false").default(true),

    // zkBTC
    ZKBTC_API_BASE: z.string().url().optional(),
    ZKBTC_API_KEY: z.string().optional(),
    ZKBTC_ALLOW_FALLBACK: z.string().transform((s) => s !== "false").default(true),

    // Scrolls
    SCROLLS_API_BASE: z.string().url().optional(),

    // Wallet Demo
    DEMO_WALLET_ADDRESS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
