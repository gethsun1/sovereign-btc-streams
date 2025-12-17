// Jest setup file
// Add custom matchers or global test setup here

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_streams'
process.env.NODE_ENV = 'test'
process.env.REQUIRE_WALLET_SIG = 'false'
process.env.CHARMS_ALLOW_FALLBACK = 'true'
process.env.ZKBTC_ALLOW_FALLBACK = 'true'
process.env.GRAIL_ALLOW_FALLBACK = 'true'
