#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 X402 Refund System - Local Setup${NC}\n"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Foundry not found. Install: curl -L https://foundry.paradigm.xyz | bash${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found. Install: npm install -g pnpm${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}\n"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

echo "📦 Installing Foundry dependencies..."
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit 2>/dev/null || true
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# Check for .env files
if [ ! -f "contracts/.env" ]; then
    echo -e "${YELLOW}⚠️  contracts/.env not found. Copying from .env.example${NC}"
    cp contracts/.env.example contracts/.env
    echo -e "${YELLOW}📝 Please edit contracts/.env with your values${NC}\n"
fi

if [ ! -f "services/.env" ]; then
    echo -e "${YELLOW}⚠️  services/.env not found. Copying from .env.example${NC}"
    cp services/.env.example services/.env
    echo -e "${YELLOW}📝 Please edit services/.env with your values${NC}\n"
fi

# Check if Anvil is running
if ! nc -z localhost 8545 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Anvil not running on localhost:8545${NC}"
    echo -e "${YELLOW}   Start with: anvil --fork-url <base-sepolia-rpc>${NC}\n"
fi

echo -e "${GREEN}✅ Setup complete!${NC}\n"
echo "Next steps:"
echo "  1. Start Anvil: anvil --fork-url <base-sepolia-rpc>"
echo "  2. Deploy contract: cd contracts && forge script script/Deploy.s.sol --rpc-url \$RPC_URL --broadcast"
echo "  3. Update BOND_ESCROW_ADDRESS in services/.env"
echo "  4. Fund escrow with USDC"
echo "  5. Run services:"
echo "     - Terminal 1: pnpm facilitator"
echo "     - Terminal 2: pnpm server"
echo "     - Terminal 3: pnpm client"
echo ""
echo "See SETUP.md for detailed instructions"
