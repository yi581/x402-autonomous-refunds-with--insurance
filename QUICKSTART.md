# Quick Start Guide - X402 Refund System

Get up and running in 10 minutes!

## Prerequisites Check

```bash
# Check versions
node --version   # Need >= 18
pnpm --version   # Need >= 8
forge --version  # Need Foundry
```

If missing, install:
```bash
# Install pnpm
npm install -g pnpm

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## One-Command Setup

```bash
# Clone and setup
git clone <repo-url> X402
cd X402
./scripts/setup-local.sh
```

## Manual Setup

### 1. Install Dependencies (2 min)

```bash
pnpm install
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
cd ..
```

### 2. Configure Environment (1 min)

```bash
# Contracts
cp contracts/.env.example contracts/.env

# Services
cp services/.env.example services/.env
```

**For quick testing, the example values work with Anvil default accounts!**

### 3. Start Local Blockchain (30 sec)

```bash
# Terminal 1: Start Anvil
anvil --fork-url https://sepolia.base.org
```

Keep this running!

### 4. Deploy Contract (1 min)

```bash
# Terminal 2
cd contracts

# Load environment
source .env

# Deploy
forge script script/Deploy.s.sol:DeployBondedEscrow \
  --rpc-url http://localhost:8545 \
  --broadcast

# Copy the deployed address from output
# Example: Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Update `BOND_ESCROW_ADDRESS` in `services/.env` with deployed address!**

### 5. Fund Escrow (1 min)

```bash
# Still in contracts directory

# Get USDC on Anvil (impersonate USDC holder)
export USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export ESCROW=0x5FbDB2315678afecb367f032d93F642f64180aa3  # Your deployed address

# Find a USDC holder on Base Sepolia
cast call $USDC "balanceOf(address)(uint256)" 0x4200000000000000000000000000000000000006 --rpc-url http://localhost:8545

# Impersonate and transfer
cast rpc anvil_impersonateAccount 0x4200000000000000000000000000000000000006
cast send $USDC "transfer(address,uint256)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1000000000 \
  --from 0x4200000000000000000000000000000000000006 \
  --unlocked \
  --rpc-url http://localhost:8545

# Approve and deposit to escrow
cast send $USDC "approve(address,uint256)" $ESCROW 200000000 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545

cast send $ESCROW "deposit(uint256)" 200000000 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545

# Fund client too
cast send $USDC "transfer(address,uint256)" 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC 10000000 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545

# Verify
cast call $ESCROW "getBondBalance()(uint256)" --rpc-url http://localhost:8545
# Should return: 200000000 (200 USDC)
```

### 6. Run Services (2 min)

Open 3 new terminals:

**Terminal 3: Facilitator**
```bash
cd X402/services
pnpm facilitator
```

**Terminal 4: Server**
```bash
cd X402/services
pnpm server
```

**Terminal 5: Client**
```bash
cd X402/services
pnpm client
```

## Expected Output

When running the client, you should see:

```
🚀 X402 Client with Autonomous Refund
==================================================

👤 Client Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC

📡 Fetching escrow contract address...
✅ Escrow Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3

🏥 Checking escrow health...
  Bond Balance: 200.0 USDC
  Minimum Bond: 100.0 USDC
  Status: ✅ Healthy

💵 USDC Balance: 10.0 USDC

==================================================
SCENARIO: Requesting /fail (service failure)
==================================================

💰 Making paid request to /fail...

🔴 Service failure detected:
  Method: GET
  URL: http://localhost:3000/fail
  Payment Amount: 1000000
  Request Commitment: 0xabcd...
  Signature: 0x1234...
  ✅ Refund authorization signed

❌ Request failed: Service temporarily unavailable
   Error Code: INTERNAL_ERROR

📄 Refund receipt saved: refund-abcd1234.json

💸 Claiming refund from escrow...
  Request Commitment: 0xabcd...
  Amount: 1.0 USDC
  Transaction: 0x...
  ⏳ Waiting for confirmation...
  ✅ Refund claimed! (Block 12345)

💵 New USDC Balance: 10.0 USDC
📈 Balance Change: +1.0 USDC

==================================================
✅ Client demo completed successfully!
==================================================
```

## Verify Results

```bash
# Check refund receipt
cat refund-*.json

# Check escrow state
cast call $ESCROW "getBondBalance()(uint256)" --rpc-url http://localhost:8545
# Should be: 199000000 (199 USDC, reduced by 1 USDC)

# Check commitment settled
cast call $ESCROW "commitmentSettled(bytes32)(bool)" <commitment-from-output> --rpc-url http://localhost:8545
# Should return: true
```

## Troubleshooting

### "Insufficient USDC balance"
```bash
# Transfer more USDC to client
cast send $USDC "transfer(address,uint256)" <client-address> 10000000 \
  --private-key $PRIVATE_KEY --rpc-url http://localhost:8545
```

### "Escrow is not healthy"
```bash
# Check balance
cast call $ESCROW "getBondBalance()(uint256)" --rpc-url http://localhost:8545

# Deposit more
cast send $ESCROW "deposit(uint256)" 100000000 \
  --private-key $PRIVATE_KEY --rpc-url http://localhost:8545
```

### "Connection refused"
```bash
# Make sure Anvil is running
# Check if ports 8545, 3000, 3001 are free
lsof -i :8545
lsof -i :3000
lsof -i :3001
```

### "AlreadySettled" error
Each request commitment can only be used once. Restart the server to make a new request with a different commitment.

## Next Steps

1. Read [README.md](README.md) for full documentation
2. Review [SETUP.md](SETUP.md) for deployment details
3. Check [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for technical details
4. Modify `/fail` endpoint to test different scenarios
5. Add your own paid endpoints

## Testing Scenarios

### Scenario 1: Success (No Refund)
```bash
# Modify client.ts to call /premium instead of /fail
# Should get content, no refund needed
```

### Scenario 2: Multiple Requests
```bash
# Run client multiple times
# Each request should get a unique commitment
# All refunds should succeed
```

### Scenario 3: Insufficient Bond
```bash
# Withdraw most of the bond
cast send $ESCROW "withdraw(uint256)" 150000000 \
  --private-key $PRIVATE_KEY --rpc-url http://localhost:8545

# Run client - should abort with "Escrow is not healthy"
```

## Clean Restart

```bash
# Kill all terminals (Ctrl+C)
# Restart Anvil (this resets state)
anvil --fork-url https://sepolia.base.org

# Redeploy and repeat steps 4-6
```

## Production Deployment

For real deployment:
1. Use mainnet RPC URLs
2. Use secure key management (hardware wallet, KMS)
3. Audit smart contracts
4. Implement monitoring
5. See [README.md](README.md) Security section

---

Happy hacking! 🚀
