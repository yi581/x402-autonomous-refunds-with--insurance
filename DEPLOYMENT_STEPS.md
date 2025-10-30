# X402InsuranceV2 部署步骤

## 📝 部署信息

**生成的部署账户**:
- Address: `0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839`
- Private Key: `0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31`

**预计部署成本**:
- Gas needed: ~1,879,580 gas
- Gas price: ~0.00097013 gwei
- Total cost: ~0.0000018234 ETH (~$0.006 USD)

**合约地址（预测）**: `0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc`

---

## 🚀 部署步骤

### Step 1: 更新 .env 文件

更新 `/Users/panda/Documents/ibnk/code/X402/contracts/.env`:

```bash
# 使用新生成的部署私钥
PRIVATE_KEY=0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31

# Base Sepolia RPC
RPC_URL=https://sepolia.base.org

# USDC on Base Sepolia
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# 你的平台财务地址（接收罚金）
PLATFORM_TREASURY=0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839

# 2% 惩罚费率
PLATFORM_PENALTY_RATE=200

# 5分钟默认超时
DEFAULT_TIMEOUT=5
```

### Step 2: 为部署账户充值

#### 方式 1: Base Sepolia Faucet（推荐）

1. 访问: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. 输入地址: `0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839`
3. 领取免费测试 ETH

#### 方式 2: 从现有账户转账

```bash
# 如果你有其他 Base Sepolia 账户
~/.foundry/bin/cast send 0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
  --value 0.001ether \
  --private-key YOUR_FUNDED_KEY \
  --rpc-url https://sepolia.base.org
```

#### 方式 3: 桥接 ETH

1. 从 Sepolia 桥接到 Base Sepolia
2. 使用 https://bridge.base.org/

### Step 3: 确认余额

```bash
~/.foundry/bin/cast balance 0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
  --rpc-url https://sepolia.base.org
```

应该看到至少 `0.001 ether` (1000000000000000 wei)

### Step 4: 部署合约

```bash
cd /Users/panda/Documents/ibnk/code/X402/contracts

~/.foundry/bin/forge script script/DeployInsuranceV2.s.sol:DeployInsuranceV2 \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  -vvvv
```

**预期输出**:

```
============================================================
X402InsuranceV2 deployed successfully!
============================================================

Contract Address: 0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc
USDC Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Platform Treasury: 0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839
Platform Penalty Rate (bp): 200
Default Timeout (min): 5

============================================================
Key Features:
- Zero insurance fee for clients ✅
- 2% penalty on failed services ✅
- Bond locking mechanism ✅
- Provider health monitoring ✅
============================================================
```

### Step 5: 验证部署

```bash
# 检查合约是否部署成功
~/.foundry/bin/cast code 0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc \
  --rpc-url https://sepolia.base.org

# 查看合约信息
~/.foundry/bin/cast call 0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc \
  "platformTreasury()(address)" \
  --rpc-url https://sepolia.base.org

# 查看惩罚费率
~/.foundry/bin/cast call 0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc \
  "platformPenaltyRate()(uint256)" \
  --rpc-url https://sepolia.base.org
```

### Step 6: 在 BaseScan 上验证

如果部署时使用了 `--verify` 标志，合约会自动在 BaseScan 上验证。

手动验证:
```bash
~/.foundry/bin/forge verify-contract \
  0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc \
  src/X402InsuranceV2.sol:X402InsuranceV2 \
  --chain-id 84532 \
  --constructor-args $(cast abi-encode "constructor(address,address,uint256,uint256)" \
    0x036CbD53842c5426634e7929541eC2318f3dCF7e \
    0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
    200 \
    5) \
  --watch
```

查看合约: https://sepolia.basescan.org/address/0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc

---

## 🧪 测试部署的合约

### 1. 服务商存入 Bond

```bash
# 先获取一些测试 USDC
# USDC Faucet: https://faucet.circle.com/

# 服务商地址
PROVIDER=0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839
INSURANCE=0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc
USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# 1. Approve USDC
~/.foundry/bin/cast send $USDC \
  "approve(address,uint256)" \
  $INSURANCE \
  1000000000 \
  --private-key 0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31 \
  --rpc-url https://sepolia.base.org

# 2. Deposit Bond (1000 USDC)
~/.foundry/bin/cast send $INSURANCE \
  "depositBond(uint256)" \
  1000000000 \
  --private-key 0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31 \
  --rpc-url https://sepolia.base.org

# 3. 查看 Bond 余额
~/.foundry/bin/cast call $INSURANCE \
  "providerBond(address)(uint256)" \
  $PROVIDER \
  --rpc-url https://sepolia.base.org
```

### 2. 设置最低 Bond 要求

```bash
# 平台管理员设置最低 500 USDC
~/.foundry/bin/cast send $INSURANCE \
  "setMinProviderBond(address,uint256)" \
  $PROVIDER \
  500000000 \
  --private-key 0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31 \
  --rpc-url https://sepolia.base.org
```

### 3. 客户购买保险（零费用！）

```bash
# 客户地址（使用另一个钱包）
CLIENT=0x...
REQUEST_COMMITMENT=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# 购买保险（客户无需 approve USDC！）
~/.foundry/bin/cast send $INSURANCE \
  "purchaseInsurance(bytes32,address,uint256,uint256)" \
  $REQUEST_COMMITMENT \
  $PROVIDER \
  100000000 \
  5 \
  --private-key $CLIENT_KEY \
  --rpc-url https://sepolia.base.org
```

### 4. 查看保险状态

```bash
# 检查是否可以申领
~/.foundry/bin/cast call $INSURANCE \
  "canClaimInsurance(bytes32)(bool)" \
  $REQUEST_COMMITMENT \
  --rpc-url https://sepolia.base.org

# 查看详细信息
~/.foundry/bin/cast call $INSURANCE \
  "getClaimDetails(bytes32)" \
  $REQUEST_COMMITMENT \
  --rpc-url https://sepolia.base.org

# 查看服务商统计
~/.foundry/bin/cast call $INSURANCE \
  "getProviderStats(address)" \
  $PROVIDER \
  --rpc-url https://sepolia.base.org
```

---

## 🔗 更新服务配置

### 更新 services/.env

```bash
# 在 /Users/panda/Documents/ibnk/code/X402/services/.env 中添加:

X402_INSURANCE_V2_ADDRESS=0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532

# 服务商密钥
SERVER_PRIVATE_KEY=0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31

# 客户密钥（用于测试）
CLIENT_PRIVATE_KEY=0x...
```

---

## 📊 合约信息总结

| 项目 | 值 |
|------|-----|
| 合约地址 | `0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc` |
| USDC 地址 | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| 平台财务 | `0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839` |
| 惩罚费率 | 2% (200 basis points) |
| 默认超时 | 5 minutes |
| 网络 | Base Sepolia (Chain ID: 84532) |
| BaseScan | https://sepolia.basescan.org/address/0xE527DDaC2592FAa45884a0B78E4D377a5D3dF8cc |

---

## 🎯 核心特性验证

### 测试场景 1: 成功流程

```bash
# 1. 服务商存入 bond
# 2. 客户购买保险（零费用）
# 3. 服务商确认服务
# 4. Bond 解锁，服务商保留收入
```

### 测试场景 2: 失败流程

```bash
# 1. 服务商存入 bond
# 2. 客户购买保险（零费用）
# 3. 等待超时（5分钟）
# 4. 客户申领保险
# 5. 客户获得全额退款
# 6. 服务商 bond 被扣除（含2%罚金）
```

### 测试场景 3: 健康度管理

```bash
# 1. 检查服务商健康度
# 2. 多笔订单锁定 bond
# 3. available < min 时无法接单
# 4. 充值后恢复健康
```

---

## 🚨 重要提示

1. **私钥安全**:
   - 这是测试网部署，私钥已公开
   - 生产环境必须使用硬件钱包或 MPC
   - 不要将真实资金发送到此地址

2. **USDC 获取**:
   - Circle USDC Faucet: https://faucet.circle.com/
   - 或从 Sepolia 桥接

3. **Gas 费用**:
   - Base Sepolia 极低 gas
   - 建议保留 0.01 ETH 用于测试

4. **合约验证**:
   - 验证后可在 BaseScan 上查看源码
   - 增加透明度和信任

---

## 📞 下一步

1. ✅ 为部署地址充值 ETH
2. ✅ 部署合约
3. ✅ 获取测试 USDC
4. ✅ 运行测试场景
5. ✅ 集成到现有服务

准备好后运行 Step 4 的部署命令！🚀
