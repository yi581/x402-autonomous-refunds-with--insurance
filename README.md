# X402 Insurance Protocol V2

> Zero-Fee Insurance for Web3 API Payments

A novel insurance protocol that protects clients making API payments without charging insurance fees. Service providers deposit bonds, which are temporarily locked during transactions and used for compensation in case of service failures.

## Overview

X402 Insurance V2 implements a **zero insurance fee model** where:

- Clients pay only for the service (e.g., 1 USDC)
- No additional insurance premium required
- Service providers deposit collateral bonds
- Automatic compensation if service fails
- Platform earns 2% penalty on failures

### Key Innovation

Unlike traditional insurance where clients pay premiums, this protocol shifts the economic model:

1. **Providers Bear Risk**: Service providers deposit bonds
2. **Clients Get Free Protection**: No insurance fees, only gas costs
3. **Aligned Incentives**: Providers motivated to deliver quality service
4. **Automatic Enforcement**: Smart contract handles all settlements

##  Architecture

```
┌─────────────┐          ┌──────────────┐         ┌─────────────┐
│   Client    │          │   Provider   │         │  Platform   │
└──────┬──────┘          └──────┬───────┘         └─────────────┘
       │                        │                         
       │   1. x402 Payment      │                         
       │   (1 USDC)            │                         
       ├───────────────────────>│                         
       │                        │                         
       │   2. Purchase Insurance│                         
       │   (0 USDC fee!)       │                         
       ├───────────────────────>│ [Lock 1.02 USDC bond]  
       │                        │                         
       │                        │                         
       │   ┌─── Success ────┐   │                         
       │   │ 3a. Confirm    │   │                         
       │   │ (EIP-712 sig)  │   │ [Unlock bond]          
       │   └────────────────┘   │ Provider keeps 1 USDC   
       │                        │                         
       │   ┌─── Failure ────┐   │                         
       │   │ 3b. Timeout    │   │                         
       │   │ 4. Claim       │   │ [Bond: -2.04 USDC]     
       │   │   Client: +2   │   │ [Client: +2 USDC]      
       │   │   Platform: +0.04  │ [Platform: +0.04 USDC] 
       │   └────────────────┘   │                         
       │                        │                         
```

##  Features

### For Clients
- **Zero Insurance Fees**: Pay only for the service
- **Automatic Protection**: Insurance included by default
- **Quick Compensation**: Instant refund on service failure (2x payment)
- **No Approval Needed**: Just submit claim after timeout

### For Service Providers
- **Bond Efficiency**: Locked only during active orders
- **EIP-712 Signatures**: Gas-efficient service confirmation
- **Flexible Deposits**: Add/withdraw bonds anytime
- **Reputation System**: Build trust through successful deliveries

### For Platform
- **Risk-Free Revenue**: Earn 2% penalty only on failures
- **Self-Regulating**: Bad providers naturally exit
- **Minimal Overhead**: Smart contract automation
- **Transparent**: All transactions on-chain

##  Repository Structure

```
X402/
├── contracts/                    # Solidity smart contracts
│   ├── src/
│   │   └── X402InsuranceV2.sol  # Main insurance contract
│   ├── script/
│   │   └── DeployInsuranceV2.s.sol
│   ├── test/
│   │   └── X402InsuranceV2.t.sol
│   ├── .env.example             # Contract config template
│   └── foundry.toml
│
├── services/                    # Off-chain services (future)
│   ├── facilitator/            # Payment processor
│   ├── server/                 # Resource provider
│   └── client/                 # SDK & examples
│
├── test-*.sh                   # On-chain test scripts
├── SETUP.md                    # Detailed setup guide
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # CC BY-NC 4.0
└── README.md                   # This file
```

##  Quick Start

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Node.js 18+
nvm install 18
nvm use 18

# Install pnpm
npm install -g pnpm
```

### 1. Clone & Install

```bash
git clone https://github.com/your-username/X402.git
cd X402

# Install contract dependencies
cd contracts
forge install
cd ..
```

### 2. Configure Environment

```bash
cd contracts
cp .env.example .env
```

Edit `.env`:
```bash
PRIVATE_KEY=your_testnet_private_key
RPC_URL=https://sepolia.base.org
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Base Sepolia USDC
PLATFORM_TREASURY=your_treasury_address
PLATFORM_PENALTY_RATE=200  # 2%
DEFAULT_TIMEOUT=5          # minutes
```

### 3. Deploy Contract

```bash
cd contracts

forge script script/DeployInsuranceV2.s.sol:DeployInsuranceV2 \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify
```

Save the deployed contract address!

### 4. Provider: Deposit Bond

```bash
INSURANCE=0x<deployed-contract-address>

# Approve USDC
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $INSURANCE \
  50000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# Deposit 50 USDC bond
cast send $INSURANCE \
  "depositBond(uint256)" \
  50000000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

### 5. Run On-Chain Tests

```bash
# Success scenario: 1 USDC payment, service delivered
bash test-success-simple.sh

# Failure scenario: 2 USDC payment, timeout, claim compensation
bash test-complete-success-flow.sh
```

##  Economic Model

### Success Scenario (95%+ expected)

| Party    | Action                          | Amount      |
|----------|---------------------------------|-------------|
| Client   | Pays for service (x402)         | -1 USDC     |
| Client   | Purchases insurance             | -0 USDC  |
| Provider | Receives payment                | +1 USDC     |
| Provider | Bond locked temporarily         | 1.02 USDC   |
| Provider | Bond unlocked (confirmed)       | 1.02 USDC   |
| Platform | Revenue                         | 0 USDC      |

**Result**: Client gets service, Provider earns 1 USDC, Platform earns nothing.

### Failure Scenario (<5% expected)

| Party    | Action                          | Amount      |
|----------|---------------------------------|-------------|
| Client   | Paid for service (x402)         | -1 USDC     |
| Client   | Claims insurance (2x refund)    | +2 USDC     |
| Client   | Net gain                        | +1 USDC  |
| Provider | Keeps payment (already settled) | 1 USDC kept |
| Provider | Bond deducted (compensation)    | -2.04 USDC  |
| Provider | Net loss                        | -1.04 USDC  |
| Platform | Penalty collected               | +0.04 USDC  |

**Result**: Client gets 2x refund, Provider loses 1.04 USDC total, Platform earns 0.04 USDC penalty.

###  Why This Works

1. **Provider Incentive**: Losing 1.04 USDC per failure is expensive  providers deliver
2. **Client Benefit**: Free insurance + profit on failures  clients protected
3. **Platform Revenue**: Sustainable from penalties without burdening clients
4. **Market Equilibrium**: Bad providers exit naturally (bond depletion)

##  Security

### Audit Status

- **Status**: ⚠️ **NOT AUDITED**
- **Use Case**: Testnet, research, education only
- **Production**: DO NOT deploy to mainnet without professional audit

### Known Considerations

1. **Bond Management**: Providers must monitor bond levels
2. **Timeout Settings**: 5-minute default (configurable)
3. **EIP-712 Signatures**: Secure but requires proper key management
4. **Reentrancy**: Protected via OpenZeppelin SafeERC20
5. **Oracle Independence**: No price feeds required (fixed USDC amounts)

### Responsible Disclosure

Found a security issue? Please email: security@[your-domain].com

Do not open public issues for vulnerabilities.

##  Testing

### On-Chain Integration Tests

```bash
# Test success flow
bash test-success-simple.sh

# Test failure + claim flow
bash wait-and-claim.sh

# View results on BaseScan
https://sepolia.basescan.org/address/<your-address>
```

### Smart Contract Tests

```bash
cd contracts
forge test -vvv
```

##  Roadmap

- [x] Core insurance protocol (V2)
- [x] Zero-fee model implementation
- [x] EIP-712 signature verification
- [x] On-chain testing (Base Sepolia)
- [ ] Professional security audit
- [ ] Multi-token support (ETH, DAI)
- [ ] Off-chain facilitator service
- [ ] Client SDK (x402-axios)
- [ ] Mainnet deployment
- [ ] DAO governance

##  Use Cases

### 1. Web3 API Services
```javascript
// Client pays 1 USDC for API call
// Automatically protected by insurance
// No extra fees!
const response = await fetch('https://api.example.com/data', {
  headers: { 'x-payment': '1000000' }  // 1 USDC in wei
});
```

### 2. Micropayments
- Pay-per-request APIs
- Content access (articles, videos)
- Computation services
- Data feeds

### 3. Service Level Agreements
- Uptime guarantees
- Response time SLAs
- Data quality assurance

##  Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Install dependencies
pnpm install

# Run tests
cd contracts && forge test

# Check for issues
forge fmt --check
```

##  License

**CC BY-NC 4.0** - Creative Commons Attribution-NonCommercial 4.0 International

- ✅ **Permitted**: Research, education, testing, non-commercial use
- ❌ **Prohibited**: Commercial production, SaaS, revenue-generating use

For commercial licensing, please contact the maintainers.

##  Links

- **Documentation**: [docs/](docs/)
- **Setup Guide**: [SETUP.md](SETUP.md)
- **Test Results**: [FINAL_CHAIN_TEST_REPORT.md](FINAL_CHAIN_TEST_REPORT.md)
- **Scenario Analysis**: [SCENARIO_COMPARISON.md](SCENARIO_COMPARISON.md)

##  Disclaimer

This software is provided for educational purposes only. Smart contracts have not been audited. DO NOT use with real funds. Use at your own risk.

The protocol is experimental. Users assume all risks including but not limited to:
- Smart contract bugs
- Economic exploits
- Network failures
- Loss of funds

---

**Built with**  
Solidity · Foundry · OpenZeppelin · EIP-712 · Base

**Status**: 🧪 Testnet Only | ⚠️ Not Audited | 📚 Educational
