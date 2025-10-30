# X402 Autonomous Refund Mechanism

A trustless, blockchain-based refund system for the x402 payment protocol. This POC demonstrates how service providers can use bonded escrow and EIP-712 signatures to enable instant, autonomous refunds when services fail to deliver.

> ⚠️ **SECURITY NOTICE**: This is a proof-of-concept for educational and demonstration purposes only. DO NOT use in production without a thorough security audit. Always use fresh wallet addresses and never commit private keys to version control.

## Overview

### Problem
In prepaid API payment systems:
- Clients pay upfront but may not receive the service
- Traditional refunds require manual processing and trust
- Failed transactions lock up funds

### Solution
**Bonded Escrow + Signed Refund Authorization**

1. Service providers deposit USDC as bond in a smart contract
2. When service fails, server signs an EIP-712 refund authorization
3. Clients autonomously claim refunds on-chain
4. No intermediaries, no delays, no trust required

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │◄───────►│  Facilitator │◄───────►│   Server    │
│             │  x402   │              │  x402   │             │
│ client.ts   │ Payment │ facilitator  │ Verify  │ server.ts   │
└──────┬──────┘         └──────────────┘         └──────┬──────┘
       │                                                 │
       │ 1. Check isHealthy()                           │
       │──────────┐                                     │
       │          ▼                                     │
       │   ┌──────────────┐                            │
       │   │ BondedEscrow │◄───────────────────────────┘
       │   │   Contract   │     Sign Refund
       │   └──────────────┘
       │          │
       │ 2. claimRefund()
       └──────────┘
```

## Project Structure

```
x402-refunds-poc/
├── contracts/              # Solidity smart contracts (Foundry)
│   ├── src/
│   │   └── BondedEscrow.sol       # Main escrow contract
│   ├── script/
│   │   └── Deploy.s.sol           # Deployment script
│   └── foundry.toml
│
├── services/               # TypeScript services
│   ├── src/
│   │   ├── facilitator.ts         # x402 payment facilitator
│   │   ├── server.ts              # Resource server with refund logic
│   │   ├── client.ts              # Client with autonomous refund
│   │   └── utils.ts               # Shared utilities
│   └── abi/
│       └── BondedEscrow.json      # Contract ABI
│
├── package.json            # Workspace root
└── pnpm-workspace.yaml
```

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **Foundry** (forge, anvil, cast)
- **Base Sepolia RPC** or local fork

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Install pnpm

```bash
npm install -g pnpm
```

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd X402
pnpm install
```

### 2. Install Foundry Dependencies

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
cd ..
```

### 3. Setup Environment Variables

#### Contracts

```bash
cd contracts
cp .env.example .env
# Edit .env with your values
```

Required variables:
- `PRIVATE_KEY`: Deployer private key
- `RPC_URL`: Blockchain RPC endpoint
- `USDC_ADDRESS`: USDC token contract address
- `SELLER_ADDRESS`: Server signing address
- `MIN_BOND`: Minimum bond (e.g., 100000000 = 100 USDC)

#### Services

```bash
cd services
cp .env.example .env
# Edit .env with your values
```

Required variables:
- `RPC_URL`: Same as contracts
- `CHAIN_ID`: Chain ID (84532 for Base Sepolia)
- `FACILITATOR_PRIVATE_KEY`: Facilitator wallet
- `SERVER_PRIVATE_KEY`: Server signing wallet
- `CLIENT_PRIVATE_KEY`: Client wallet
- `USDC_ADDRESS`: USDC token address
- `BOND_ESCROW_ADDRESS`: (Set after deployment)

### 4. Start Local Blockchain (Option A)

For testing, use Anvil with Base Sepolia fork:

```bash
anvil --fork-url <base-sepolia-rpc-url>
```

**OR** use a live testnet (Option B) by setting `RPC_URL` to Base Sepolia RPC.

### 5. Deploy Contract

```bash
cd contracts

# Ensure .env is configured
forge script script/Deploy.s.sol:DeployBondedEscrow \
  --rpc-url $RPC_URL \
  --broadcast

# Copy the deployed contract address
# Update BOND_ESCROW_ADDRESS in services/.env
```

### 6. Fund Contract with USDC

Approve and deposit bond:

```bash
# Approve USDC
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $BOND_ESCROW_ADDRESS \
  100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# Deposit bond
cast send $BOND_ESCROW_ADDRESS \
  "deposit(uint256)" \
  100000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

### 7. Fund Client Wallet

Transfer USDC to client address:

```bash
# Get client address
cast wallet address --private-key $CLIENT_PRIVATE_KEY

# Transfer USDC (from another wallet or faucet)
cast send $USDC_ADDRESS \
  "transfer(address,uint256)" \
  <client-address> \
  10000000 \
  --private-key <funder-private-key> \
  --rpc-url $RPC_URL
```

### 8. Start Services

Open 3 terminal windows:

**Terminal 1 - Facilitator**
```bash
cd services
pnpm facilitator
```

**Terminal 2 - Server**
```bash
cd services
pnpm server
```

**Terminal 3 - Client**
```bash
cd services
pnpm client
```

## How It Works

### Step-by-Step Flow

1. **Client Pre-Flight Check**
   - Queries server for escrow address (`GET /escrow`)
   - Calls `escrow.isHealthy()` to verify sufficient bond
   - Aborts if bond is insufficient

2. **Paid Request**
   - Client creates x402 payment signature
   - Sends request with `x-payment` header
   - Server attempts to fulfill service

3. **Service Failure**
   - Server encounters error (simulated by `/fail` endpoint)
   - Calculates `requestCommitment` hash:
     ```typescript
     keccak256(method, url, xpay, window)
     ```
   - Signs EIP-712 refund authorization
   - Returns 400 with refund bundle

4. **Autonomous Refund**
   - Client receives signed refund authorization
   - Verifies `requestCommitment` matches
   - Calls `escrow.claimRefund(commitment, amount, signature)`
   - Receives USDC refund instantly

### Request Commitment

The request commitment is a unique hash that prevents double-refunds:

```typescript
requestCommitment = keccak256(
  abi.encode(
    "GET",                           // HTTP method
    "http://localhost:3000/fail",    // Full URL
    "0x...",                         // x-payment header
    "60"                             // Time window
  )
)
```

### EIP-712 Signature

Server signs refund using typed data:

```typescript
Domain: {
  name: "BondedEscrow"
  version: "1"
  chainId: 84532
  verifyingContract: <escrow-address>
}

Types: {
  RefundClaim: [
    { name: "requestCommitment", type: "bytes32" }
    { name: "amount", type: "uint256" }
  ]
}
```

## Smart Contract API

### BondedEscrow.sol

#### Core Functions

**`deposit(uint256 amount)`**
- Deposits USDC bond into escrow
- Only callable by owner
- Emits `BondDeposited` event

**`withdraw(uint256 amount)`**
- Withdraws bond (must maintain minimum)
- Only callable by owner
- Reverts if balance < minBond after withdrawal

**`claimRefund(bytes32 requestCommitment, uint256 amount, bytes signature)`**
- Claims refund with server signature
- Verifies EIP-712 signature
- Prevents double-refund via `commitmentSettled` mapping
- Transfers USDC to caller

**`isHealthy() → bool`**
- Returns true if balance >= minBond
- Used by clients for pre-flight check

**`getBondBalance() → uint256`**
- Returns current USDC balance in escrow

#### Events

```solidity
event BondDeposited(address indexed from, uint256 amount);
event BondWithdrawn(address indexed to, uint256 amount);
event RefundClaimed(bytes32 indexed requestCommitment, address indexed recipient, uint256 amount);
```

## Server Endpoints

### `GET /escrow`
Returns escrow contract address

**Response:**
```json
{
  "success": true,
  "address": "0x..."
}
```

### `GET /premium` (x402 paid)
Successful paid endpoint

**Headers:**
- `x-payment`: Signed x402 payment

**Response:**
```json
{
  "success": true,
  "message": "Premium content delivered!",
  "data": { ... }
}
```

### `GET /fail` (x402 paid)
Simulates service failure with refund

**Headers:**
- `x-payment`: Signed x402 payment

**Response (400):**
```json
{
  "success": false,
  "code": "INTERNAL_ERROR",
  "message": "Service temporarily unavailable",
  "requestCommitment": "0xabcd...",
  "refund": {
    "amount": "1000000",
    "signature": "0x..."
  }
}
```

## Configuration Reference

### Base Sepolia Addresses

```bash
CHAIN_ID=84532
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
RPC_URL=https://sepolia.base.org
```

### Anvil Test Accounts

```bash
# Account 0
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Account 1
PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

# Account 2
PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
ADDRESS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

## Testing Scenarios

### Scenario 1: Successful Payment

```bash
# Client requests /premium
# Payment verified -> Content delivered
# No refund needed
```

### Scenario 2: Failed Service + Refund

```bash
# Client requests /fail
# Server returns 400 + signed refund
# Client claims refund on-chain
# USDC returned to client
```

### Scenario 3: Insufficient Bond

```bash
# Escrow balance < minBond
# isHealthy() returns false
# Client aborts request
```

## Security Considerations

- Contract is **unaudited** - educational purposes only
- Do not use with real funds or in production
- Server must protect private key (refund signing authority)
- Request commitment prevents replay attacks
- EIP-712 ensures signature cannot be used on other chains/contracts

## Limitations

1. **Trust Assumption**: Server must honestly sign refunds
2. **No Automated Validation**: Cannot prove service failure on-chain
3. **Single Token**: Only supports USDC
4. **Fixed Chain**: Hardcoded for Base Sepolia
5. **Server Crash**: If server is completely down, no signature can be obtained

## Future Improvements

- Multi-token support (ETH, DAI, etc.)
- Multi-chain deployment
- Timeout-based automatic refunds
- Off-chain dispute resolution integration
- Reputation system for service providers
- ZK proofs for service quality verification

## Troubleshooting

### "Insufficient USDC balance"

```bash
# Check balance
cast call $USDC_ADDRESS "balanceOf(address)(uint256)" <your-address> --rpc-url $RPC_URL

# Get USDC from faucet or transfer
```

### "Escrow is not healthy"

```bash
# Check bond balance
cast call $BOND_ESCROW_ADDRESS "getBondBalance()(uint256)" --rpc-url $RPC_URL

# Deposit more bond
cast send $BOND_ESCROW_ADDRESS "deposit(uint256)" <amount> --private-key $PRIVATE_KEY --rpc-url $RPC_URL
```

### "AlreadySettled" error

This request has already been refunded. Request commitments are single-use.

### "InvalidSignature" error

Server signature verification failed. Check:
- `SELLER_ADDRESS` matches `SERVER_PRIVATE_KEY` in deployment
- EIP-712 domain matches contract deployment

## Development

### Build Contracts

```bash
cd contracts
forge build
```

### Run Tests

```bash
cd contracts
forge test
```

### Typecheck Services

```bash
cd services
pnpm typecheck
```

## References

- [EIP-712: Typed structured data hashing](https://eips.ethereum.org/EIPS/eip-712)
- [x402 Protocol](https://github.com/coinbase/x402)
- [Base Sepolia Docs](https://docs.base.org/network-information)

## License

MIT

## Disclaimer

This is a proof-of-concept for educational purposes. The smart contracts are unaudited and should not be used with real funds or in production environments.
