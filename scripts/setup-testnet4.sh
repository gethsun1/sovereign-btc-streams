#!/bin/bash

# Setup script for Testnet4 deployment
# This script helps you configure and test the Sovereign BTC Streams app on Bitcoin testnet4

set -e

echo "🚀 Sovereign BTC Streams - Testnet4 Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust is not installed${NC}"
    echo "Install Rust from: https://rustup.rs/"
    exit 1
fi
echo -e "${GREEN}✅ Rust is installed${NC}"

# Check if Charms CLI is installed
if ! command -v charms &> /dev/null; then
    echo -e "${YELLOW}⚠️  Charms CLI not found. Installing...${NC}"
    export CARGO_TARGET_DIR=$(mktemp -d)/target
    cargo install charms --version=0.10.0
    unset CARGO_TARGET_DIR
    echo -e "${GREEN}✅ Charms CLI installed${NC}"
else
    echo -e "${GREEN}✅ Charms CLI is installed${NC}"
fi

# Build Charms app
echo ""
echo "📦 Building Charms app..."
cd charms-app

if [ ! -f "Cargo.toml" ]; then
    echo -e "${RED}❌ Cargo.toml not found. Are you in the right directory?${NC}"
    exit 1
fi

cargo build --release

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Charms app built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Charms app${NC}"
    exit 1
fi

# Get verification key
echo ""
echo "🔑 Getting app verification key..."
APP_BIN=$(charms app build)
APP_VK=$(charms app vk "$APP_BIN")

echo -e "${GREEN}✅ App Verification Key: ${APP_VK}${NC}"

# Get binary path
BINARY_PATH=$(pwd)/target/release/libbtc_stream_charm.so
if [ ! -f "$BINARY_PATH" ]; then
    # Try .dylib for macOS
    BINARY_PATH=$(pwd)/target/release/libbtc_stream_charm.dylib
fi

if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${RED}❌ Binary not found at expected location${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Binary path: ${BINARY_PATH}${NC}"

# Go back to root
cd ..

# Create .env.testnet4 if it doesn't exist
if [ ! -f ".env.testnet4" ]; then
    echo ""
    echo "📝 Creating .env.testnet4..."
    cp .env.testnet4.example .env.testnet4
    
    # Update with actual values
    sed -i.bak "s|CHARMS_APP_VK=.*|CHARMS_APP_VK=${APP_VK}|" .env.testnet4
    sed -i.bak "s|CHARMS_APP_BINARY_PATH=.*|CHARMS_APP_BINARY_PATH=${BINARY_PATH}|" .env.testnet4
    rm .env.testnet4.bak
    
    echo -e "${GREEN}✅ Created .env.testnet4${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env.testnet4 and add your API keys${NC}"
else
    echo -e "${YELLOW}⚠️  .env.testnet4 already exists, skipping creation${NC}"
fi

# Run tests
echo ""
echo "🧪 Running Charms app tests..."
cd charms-app
cargo test

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

cd ..

# Check database
echo ""
echo "🗄️  Checking database..."
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set. Make sure to configure it in .env.testnet4${NC}"
else
    echo -e "${GREEN}✅ DATABASE_URL is configured${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "✨ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env.testnet4 and add your API keys:"
echo "   - CHARMS_API_KEY (from Charms team)"
echo "   - BITCOIN_RPC_URL (testnet4 node)"
echo "   - BITCOIN_RPC_USER and BITCOIN_RPC_PASS"
echo ""
echo "2. Start your database:"
echo "   docker-compose up -d db"
echo ""
echo "3. Run migrations:"
echo "   npm run db:migrate"
echo ""
echo "4. Start the dev server with testnet4 config:"
echo "   cp .env.testnet4 .env"
echo "   npm run dev"
echo ""
echo "5. Get testnet4 BTC from faucet:"
echo "   https://mempool.space/testnet4/faucet"
echo ""
echo "6. Test stream creation:"
echo "   Visit http://localhost:3000/create"
echo ""
echo "📚 Read TESTNET4_IMPLEMENTATION.md for detailed guide"
echo ""
