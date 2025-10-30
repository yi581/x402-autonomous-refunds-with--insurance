# Setup Guide

This guide walks you through setting up the X402 Autonomous Refund System from scratch.

## Step 1: Prerequisites

Install required tools:

```bash
# Install Node.js 18+ (via nvm)
nvm install 18
nvm use 18

# Install pnpm
npm install -g pnpm

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installations:

```bash
node --version    # Should be >= 18
pnpm --version    # Should be >= 8
forge --version   # Should show Foundry version
```

## Step 2: Clone and Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd X402

# Install all dependencies
pnpm install

# Install Foundry contract dependencies
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
cd ..
```

## Step 3: Configure Environment Variables

### 3.1 Contracts Environment

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env`:

```bash
# For Anvil local testing
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://localhost:8545
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
SELLER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
MIN_BOND=100000000
```

### 3.2 Services Environment

```bash
cd services
cp .env.example .env
```

Edit `services/.env`:

```bash
# Blockchain
RPC_URL=http://localhost:8545
CHAIN_ID=84532

# Contracts (update after deployment)
BOND_ESCROW_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Private Keys (use different accounts)
FACILITATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
SERVER_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
CLIENT_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

# Server Ports
SERVER_PORT=3000
FACILITATOR_PORT=3001
```

## Step 4: Start Local Blockchain

### Option A: Anvil with Base Sepolia Fork

```bash
# Fork Base Sepolia (requires RPC URL)
anvil --fork-url https://sepolia.base.org

# Keep this terminal open
```

### Option B: Use Live Testnet

Skip Anvil and update `.env` files with Base Sepolia RPC:

```bash
RPC_URL=https://sepolia.base.org
```

## Step 5: Deploy Smart Contract

```bash
cd contracts

# Deploy
forge script script/Deploy.s.sol:DeployBondedEscrow \
  --rpc-url $RPC_URL \
  --broadcast

# Output will show deployed address:
# BondedEscrow Deployed!
# Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Important**: Copy the contract address and update `BOND_ESCROW_ADDRESS` in `services/.env`!

## Step 6: Fund Escrow with Bond

The contract owner must deposit USDC as bond.

### 6.1 Get USDC (if needed)

```bash
# For local Anvil fork, impersonate USDC holder
cast rpc anvil_impersonateAccount 0x<usdc-holder-address>

# Transfer USDC to your address
cast send $USDC_ADDRESS \
  "transfer(address,uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  1000000000 \
  --from 0x<usdc-holder-address> \
  --rpc-url $RPC_URL
```

### 6.2 Approve and Deposit

```bash
# Get escrow address from deployment output
ESCROW=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Approve USDC
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $ESCROW \
  100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# Deposit bond (100 USDC)
cast send $ESCROW \
  "deposit(uint256)" \
  100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# Verify deposit
cast call $ESCROW "getBondBalance()(uint256)" --rpc-url $RPC_URL
# Should return: 100000000 (100 USDC in wei)
```

## Step 7: Fund Client Wallet

Client needs USDC to make payments.

```bash
# Get client address
cast wallet address --private-key $CLIENT_PRIVATE_KEY
# Example: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

# Transfer USDC to client (from funded account)
cast send $USDC_ADDRESS \
  "transfer(address,uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  10000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# Verify balance
cast call $USDC_ADDRESS \
  "balanceOf(address)(uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  --rpc-url $RPC_URL
```

## Step 8: Run Services

Open **3 separate terminal windows**.

### Terminal 1: Facilitator

```bash
cd X402/services
pnpm facilitator
```

Expected output:
```
🚀 Starting X402 Facilitator...
✅ Facilitator running on port 3001
📡 RPC URL: http://localhost:8545
⛓️  Chain ID: 84532
Ready to process x402 payments...
```

### Terminal 2: Server

```bash
cd X402/services
pnpm server
```

Expected output:
```
🚀 X402 Resource Server Starting...
✅ Server running on http://localhost:3000
📄 Escrow Contract: 0x5FbDB...
🔑 Signer Address: 0x7099...
Available endpoints:
  GET /escrow   - Get escrow contract address
  GET /premium  - Paid endpoint (success scenario)
  GET /fail     - Paid endpoint (failure + refund)
  GET /health   - Health check
```

### Terminal 3: Client

```bash
cd X402/services
pnpm client
```

Expected output:
```
🚀 X402 Client with Autonomous Refund
==================================================

👤 Client Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

📡 Fetching escrow contract address...
✅ Escrow Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3

🏥 Checking escrow health...
  Bond Balance: 100.0 USDC
  Minimum Bond: 100.0 USDC
  Status: ✅ Healthy

💵 USDC Balance: 10.0 USDC

==================================================
SCENARIO: Requesting /fail (service failure)
==================================================

💰 Making paid request to /fail...
❌ Request failed: Service temporarily unavailable
   Error Code: INTERNAL_ERROR

📄 Refund receipt saved: refund-abcd1234.json

💸 Claiming refund from escrow...
  Request Commitment: 0xabcd...
  Amount: 1.0 USDC
  Transaction: 0x1234...
  ⏳ Waiting for confirmation...
  ✅ Refund claimed! (Block 12345)

💵 New USDC Balance: 10.0 USDC
📈 Balance Change: +1.0 USDC

==================================================
✅ Client demo completed successfully!
==================================================
```

## Step 9: Verify Results

### Check Refund Receipt

```bash
cd X402
cat refund-*.json
```

Should show:
```json
{
  "timestamp": "2025-10-30T...",
  "requestCommitment": "0xabcd...",
  "amount": "1000000",
  "signature": "0x..."
}
```

### Check On-Chain State

```bash
# Check if commitment is settled
cast call $ESCROW \
  "commitmentSettled(bytes32)(bool)" \
  0xabcd... \
  --rpc-url $RPC_URL
# Should return: true

# Check bond balance decreased
cast call $ESCROW "getBondBalance()(uint256)" --rpc-url $RPC_URL
# Should be: 99000000 (99 USDC)
```

## Troubleshooting

### Issue: "Insufficient USDC balance"

```bash
# Check balance
cast call $USDC_ADDRESS \
  "balanceOf(address)(uint256)" \
  <your-address> \
  --rpc-url $RPC_URL

# If zero, transfer USDC from funded account
```

### Issue: "Escrow is not healthy"

```bash
# Check bond balance
cast call $ESCROW "getBondBalance()(uint256)" --rpc-url $RPC_URL

# If below minBond, deposit more
cast send $ESCROW \
  "deposit(uint256)" \
  100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

### Issue: "Connection refused" on facilitator

```bash
# Ensure Anvil is running
# Ensure RPC_URL is correct in .env
# Try restarting Anvil
```

### Issue: "InvalidSignature" error

```bash
# Verify SELLER_ADDRESS matches SERVER_PRIVATE_KEY
# In contracts/.env:
SELLER_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Derive address from key:
cast wallet address --private-key $SERVER_PRIVATE_KEY
# Must match SELLER_ADDRESS
```

## Next Steps

- Modify `/fail` endpoint to test different scenarios
- Add more endpoints requiring payment
- Experiment with different bond amounts
- Test edge cases (double refund, invalid signature, etc.)

## Clean Start

To reset everything:

```bash
# Kill all processes (Ctrl+C in each terminal)

# Restart Anvil (this resets blockchain state)
anvil --fork-url https://sepolia.base.org

# Redeploy contract
cd contracts
forge script script/Deploy.s.sol:DeployBondedEscrow --rpc-url $RPC_URL --broadcast

# Update BOND_ESCROW_ADDRESS in services/.env

# Restart all services
```

## Production Deployment

For production:

1. Use audited contracts
2. Deploy to mainnet (Ethereum, Base, etc.)
3. Use secure key management (HSM, KMS)
4. Implement monitoring and alerting
5. Add rate limiting and DDoS protection
6. Use proper error handling and logging
7. Implement automated bond rebalancing

---

**Congratulations!** You now have a working X402 autonomous refund system.
