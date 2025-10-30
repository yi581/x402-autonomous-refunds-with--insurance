# X402 Insurance Deployment Guide

Complete guide for deploying and testing the X402Insurance contract.

## Prerequisites

- Foundry installed (`foundryup`)
- Node.js and pnpm installed
- Base Sepolia testnet funds (ETH for gas, USDC for testing)
- Private keys for deployer, provider, and client accounts

## Step 1: Environment Setup

Create a `.env` file in the `contracts` directory:

```bash
# contracts/.env
PRIVATE_KEY=0x...                                          # Deployer private key
RPC_URL=https://sepolia.base.org                          # Base Sepolia RPC
CHAIN_ID=84532                                            # Base Sepolia chain ID
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # USDC on Base Sepolia
PLATFORM_TREASURY=0x...                                    # Your treasury address
INSURANCE_FEE_RATE=1000                                   # 10% (in basis points)
DEFAULT_TIMEOUT=5                                         # 5 minutes default timeout
```

Create a `.env` file in the `services` directory:

```bash
# services/.env
CLIENT_PRIVATE_KEY=0x...                                   # Client private key
SERVER_PRIVATE_KEY=0x...                                   # Provider private key
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
X402_INSURANCE_ADDRESS=                                    # Will be filled after deployment
```

## Step 2: Compile Contracts

```bash
cd contracts
~/.foundry/bin/forge build
```

Expected output:
```
[⠊] Compiling...
[⠊] Compiling 1 files with 0.8.25
[⠒] Solc 0.8.25 finished in 2.50s
Compiler run successful!
```

## Step 3: Run Tests

```bash
~/.foundry/bin/forge test --match-contract X402InsuranceTest -vv
```

Expected output:
```
Ran 25 tests for test/X402Insurance.t.sol:X402InsuranceTest
[PASS] test_CanClaimInsurance() (gas: 215557)
[PASS] test_ClaimInsurance() (gas: 229402)
[PASS] test_ConfirmService() (gas: 290973)
...
Suite result: ok. 25 passed; 0 failed; 0 skipped
```

## Step 4: Deploy to Base Sepolia

```bash
~/.foundry/bin/forge script script/DeployInsurance.s.sol:DeployInsurance \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### What happens during deployment:

1. Reads configuration from environment variables
2. Deploys X402Insurance contract
3. Prints deployment details
4. Verifies contract on BaseScan (if `--verify` flag used)

### Expected output:

```
============================================================
X402Insurance deployed successfully!
============================================================

Contract Address: 0x...
USDC Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Platform Treasury: 0x...
Platform Fee Rate (bp): 1000
Default Timeout (min): 5

============================================================
Next steps:
1. Add X402_INSURANCE_ADDRESS to .env
2. Service providers deposit bond: insurance.depositBond()
3. Clients can purchase insurance on x402 payments
4. Update services/.env with insurance address
============================================================
```

### Save the contract address:

Copy the deployed contract address and update both `.env` files:

```bash
# contracts/.env
X402_INSURANCE_ADDRESS=0x...

# services/.env
X402_INSURANCE_ADDRESS=0x...
```

## Step 5: Provider Setup (Deposit Bond)

Providers must deposit bond before clients can purchase insurance for their services.

### Using cast command:

```bash
# 1. Approve USDC for insurance contract
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $X402_INSURANCE_ADDRESS \
  1000000000 \
  --private-key $SERVER_PRIVATE_KEY \
  --rpc-url $RPC_URL

# 2. Deposit bond (1000 USDC)
cast send $X402_INSURANCE_ADDRESS \
  "depositBond(uint256)" \
  1000000000 \
  --private-key $SERVER_PRIVATE_KEY \
  --rpc-url $RPC_URL

# 3. Check bond balance
cast call $X402_INSURANCE_ADDRESS \
  "providerBond(address)(uint256)" \
  $SERVER_ADDRESS \
  --rpc-url $RPC_URL
```

### Using TypeScript:

```typescript
import { ethers } from 'ethers';
import X402InsuranceABI from './abi/X402Insurance.json';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(SERVER_PRIVATE_KEY, provider);

const insurance = new ethers.Contract(
  X402_INSURANCE_ADDRESS,
  X402InsuranceABI,
  wallet
);

// Approve USDC
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
const bondAmount = ethers.parseUnits('1000', 6); // 1000 USDC

await usdc.approve(X402_INSURANCE_ADDRESS, bondAmount);

// Deposit bond
const tx = await insurance.depositBond(bondAmount);
await tx.wait();

console.log('Bond deposited successfully!');
```

## Step 6: Set Minimum Bond (Platform Admin Only)

Only the platform treasury address can set minimum bond requirements:

```bash
cast send $X402_INSURANCE_ADDRESS \
  "setMinProviderBond(address,uint256)" \
  $SERVER_ADDRESS \
  500000000 \
  --private-key $PLATFORM_TREASURY_KEY \
  --rpc-url $RPC_URL
```

This sets a 500 USDC minimum bond for the provider.

## Step 7: Test Full Flow

### Terminal 1: Start Facilitator

```bash
cd services
pnpm facilitator
```

### Terminal 2: Start Server (Provider)

```bash
cd services
pnpm server
```

### Terminal 3: Run Client with Insurance

```bash
cd services
pnpm client:insurance
```

### Expected client output:

```
🚀 X402 Client with Insurance Support

👤 Client Address: 0x...

🛡️  Insurance Contract: 0x...

💵 USDC Balance: 1000.00 USDC

🏥 Checking provider bond in insurance contract...
  Bond Balance: 1000.00 USDC
  Minimum Bond: 500.00 USDC
  Status: ✅ Healthy

🔓 Approving USDC for server (x402 payment)...
✅ USDC approved for server

🔓 Approving USDC for insurance contract...
✅ USDC approved for insurance

==================================================
SCENARIO: Requesting /fail with insurance protection
==================================================

💰 Making paid request to /fail...

📊 Response Status: 500
📊 Response Data: { "error": "Service failed" }

🔑 Request Commitment: 0x...

💡 Note: x402 payment already completed - provider received funds immediately
   Now purchasing insurance for protection...

🛡️  Purchasing insurance...
  Payment Amount: 0.01 USDC (already paid via x402)
  Insurance Fee: 0.0001 USDC (1%)
  Timeout: 1 minutes
  Provider: 0x...
  Transaction: 0x...
  ⏳ Waiting for confirmation...
  ✅ Insurance purchased! (Block 12345678)

❌ Service request failed!

   💸 x402 Payment settled: Client paid 0.01 USDC to Provider
   💸 Insurance purchased: Client paid 0.0001 USDC insurance fee
   ⏰ Waiting 1 minute(s) for timeout...

⏳ Simulating 1-minute wait...
✅ Timeout period elapsed!

🔍 Checking insurance claim status...
  Can Claim: ✅ Yes
  Status: Pending
  Payment Amount: 0.01 USDC
  Insurance Fee: 0.0001 USDC
  ⏰ Timeout expired!

💰 Claiming insurance...
  Transaction: 0x...
  ⏳ Waiting for confirmation...
  ✅ Insurance claimed! (Block 12345679)

💵 Balance before claim: 999.9899 USDC
💵 Balance after claim: 1000.00 USDC
📈 Insurance payout: +0.0101 USDC
📈 Net change from initial: 0.00 USDC

💡 Summary:
   - Paid provider via x402: 0.01 USDC
   - Paid insurance fee: 0.0001 USDC
   - Received insurance claim: 0.0101 USDC
   - Net cost: 0.00 USDC (ideally 0)

==================================================
✅ Client with insurance demo completed!
==================================================
```

## Step 8: Verify Contract Functions

### Check provider bond:

```bash
cast call $X402_INSURANCE_ADDRESS \
  "getProviderStats(address)(uint256,uint256,bool)" \
  $SERVER_ADDRESS \
  --rpc-url $RPC_URL
```

### Check insurance claim details:

```bash
cast call $X402_INSURANCE_ADDRESS \
  "getClaimDetails(bytes32)" \
  $REQUEST_COMMITMENT \
  --rpc-url $RPC_URL
```

### Check if can claim insurance:

```bash
cast call $X402_INSURANCE_ADDRESS \
  "canClaimInsurance(bytes32)(bool)" \
  $REQUEST_COMMITMENT \
  --rpc-url $RPC_URL
```

## Common Issues and Solutions

### Issue 1: "InsufficientBond" error

**Problem**: Provider doesn't have enough bond deposited.

**Solution**:
```bash
# Check current bond
cast call $X402_INSURANCE_ADDRESS "providerBond(address)(uint256)" $SERVER_ADDRESS --rpc-url $RPC_URL

# Deposit more bond
cast send $X402_INSURANCE_ADDRESS "depositBond(uint256)" 1000000000 --private-key $SERVER_PRIVATE_KEY --rpc-url $RPC_URL
```

### Issue 2: "NotExpired" error when claiming

**Problem**: Trying to claim insurance before timeout.

**Solution**: Wait for the timeout period to expire. Check remaining time:
```bash
cast call $X402_INSURANCE_ADDRESS "getClaimDetails(bytes32)" $REQUEST_COMMITMENT --rpc-url $RPC_URL
```

### Issue 3: "InvalidSignature" error on confirm

**Problem**: Provider signature doesn't match.

**Solution**: Ensure provider is signing with the correct private key and using proper EIP-712 structure:

```typescript
const structHash = keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32'],
    [
      keccak256(ethers.toUtf8Bytes('ServiceConfirmation(bytes32 requestCommitment)')),
      requestCommitment
    ]
  )
);

const domainSeparator = await insurance.domainSeparator();
const digest = keccak256(
  ethers.concat([
    ethers.toUtf8Bytes('\x19\x01'),
    domainSeparator,
    structHash
  ])
);

const signature = await wallet.signMessage(ethers.getBytes(digest));
```

### Issue 4: Client can't approve USDC

**Problem**: Client doesn't have USDC or ETH for gas.

**Solution**: Fund the client wallet:
```bash
# Get USDC from faucet or bridge
# Get ETH from Base Sepolia faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
```

## Production Deployment Checklist

Before deploying to mainnet:

- [ ] Complete smart contract audit
- [ ] Set up multi-sig wallet for platform treasury
- [ ] Configure appropriate fee rates and timeouts
- [ ] Test all edge cases on testnet
- [ ] Set up monitoring and alerting
- [ ] Prepare emergency pause mechanism
- [ ] Document all admin functions
- [ ] Set up automated bond monitoring for providers
- [ ] Configure insurance coverage limits
- [ ] Implement rate limiting and abuse prevention

## Contract Addresses

### Base Sepolia Testnet

- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- X402Insurance: `<deployed address>` (fill in after deployment)

### Base Mainnet

- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- X402Insurance: `<deployed address>` (to be deployed)

## Additional Resources

- [X402 Insurance Guide](./X402_INSURANCE_GUIDE.md) - Complete integration guide
- [Platform Summary](./PLATFORM_SUMMARY.md) - Overall platform architecture
- [Business Model](./BUSINESS_MODEL.md) - Economic model and revenue projections
- [Foundry Documentation](https://book.getfoundry.sh/)
- [Base Documentation](https://docs.base.org/)

## Support

For issues or questions:
1. Check the [X402_INSURANCE_GUIDE.md](./X402_INSURANCE_GUIDE.md)
2. Review test cases in `contracts/test/X402Insurance.t.sol`
3. Run `forge test -vvv` for detailed test output

## License

MIT
