# 🎉 X402InsuranceV2 部署成功！

## 📊 合约信息

### 部署详情

| 项目 | 信息 |
|------|------|
| **合约地址** | `0xa7079939207526d2108005a1CbBD9fa2F35bd42F` |
| **网络** | Base Sepolia (Chain ID: 84532) |
| **部署者** | `0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839` |
| **部署时间** | 2025-10-30 |
| **Gas 使用** | 1,879,580 gas |
| **部署成本** | ~0.0018 ETH (~$6 USD) |

### 合约配置

| 参数 | 值 |
|------|-----|
| **USDC 地址** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| **平台财务** | `0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839` |
| **惩罚费率** | 200 basis points (2%) |
| **默认超时** | 5 minutes |

### 区块链浏览器

- **BaseScan**: https://sepolia.basescan.org/address/0xa7079939207526d2108005a1CbBD9fa2F35bd42F

---

## ✅ 验证状态

```bash
# ✅ 合约已部署
Contract bytecode: 0x6080604081815260049182361015610015575f80fd5b...

# ✅ 平台财务地址正确
Platform Treasury: 0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839

# ✅ 惩罚费率正确
Penalty Rate: 200 (2%)

# ✅ 默认超时正确
Default Timeout: 5 (minutes)
```

---

## 🔧 快速测试命令

### 1. 查看合约信息

```bash
# 设置环境变量
export INSURANCE=0xa7079939207526d2108005a1CbBD9fa2F35bd42F
export USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export RPC=https://sepolia.base.org
export DEPLOYER_KEY=0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31

# 查看合约参数
~/.foundry/bin/cast call $INSURANCE "platformPenaltyRate()(uint256)" --rpc-url $RPC
~/.foundry/bin/cast call $INSURANCE "defaultTimeout()(uint256)" --rpc-url $RPC
```

### 2. 获取测试 USDC

访问 Circle 的 USDC Faucet:
- https://faucet.circle.com/
- 选择 Base Sepolia 网络
- 输入地址: `0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839`

或者使用 Aave Faucet:
- https://staging.aave.com/faucet/
- 选择 Base Sepolia
- 领取测试 USDC

### 3. 服务商存入 Bond

```bash
# 1. Approve USDC (1000 USDC = 1000000000)
~/.foundry/bin/cast send $USDC \
  "approve(address,uint256)" \
  $INSURANCE \
  1000000000 \
  --private-key $DEPLOYER_KEY \
  --rpc-url $RPC

# 2. Deposit Bond
~/.foundry/bin/cast send $INSURANCE \
  "depositBond(uint256)" \
  1000000000 \
  --private-key $DEPLOYER_KEY \
  --rpc-url $RPC

# 3. 查看 Bond 余额
~/.foundry/bin/cast call $INSURANCE \
  "providerBond(address)(uint256)" \
  0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
  --rpc-url $RPC
```

### 4. 设置最低 Bond 要求

```bash
# 设置 500 USDC 最低要求
~/.foundry/bin/cast send $INSURANCE \
  "setMinProviderBond(address,uint256)" \
  0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
  500000000 \
  --private-key $DEPLOYER_KEY \
  --rpc-url $RPC

# 验证设置
~/.foundry/bin/cast call $INSURANCE \
  "minProviderBond(address)(uint256)" \
  0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
  --rpc-url $RPC
```

### 5. 查看服务商统计

```bash
~/.foundry/bin/cast call $INSURANCE \
  "getProviderStats(address)(uint256,uint256,uint256,uint256,bool,bool)" \
  0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
  --rpc-url $RPC
```

输出格式:
```
totalBond       (总保证金)
lockedAmount    (已锁定金额)
availableBond   (可用金额)
minBond         (最低要求)
isHealthy       (是否健康)
liquidated      (是否已清算)
```

---

## 🧪 完整测试流程

### 场景 1: 成功流程（服务商赚钱）

```bash
# 1. 客户购买保险（无需付费！）
REQUEST_COMMITMENT=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
PAYMENT_AMOUNT=100000000  # 100 USDC

~/.foundry/bin/cast send $INSURANCE \
  "purchaseInsurance(bytes32,address,uint256,uint256)" \
  $REQUEST_COMMITMENT \
  0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
  $PAYMENT_AMOUNT \
  5 \
  --private-key CLIENT_PRIVATE_KEY \
  --rpc-url $RPC

# 2. 查看锁定状态
~/.foundry/bin/cast call $INSURANCE \
  "lockedBond(address)(uint256)" \
  0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 \
  --rpc-url $RPC
# 应该看到 102000000 (100 USDC + 2% 罚金预留)

# 3. 服务商确认服务
# (需要 EIP-712 签名 - 参考 X402_INSURANCE_V2_GUIDE.md)

# 4. Bond 解锁，服务商保留收入
```

### 场景 2: 失败流程（客户获得赔付）

```bash
# 1. 客户购买保险
# (同上)

# 2. 等待超时（5分钟）
sleep 300

# 3. 检查是否可以申领
~/.foundry/bin/cast call $INSURANCE \
  "canClaimInsurance(bytes32)(bool)" \
  $REQUEST_COMMITMENT \
  --rpc-url $RPC

# 4. 客户申领保险
~/.foundry/bin/cast send $INSURANCE \
  "claimInsurance(bytes32)" \
  $REQUEST_COMMITMENT \
  --private-key CLIENT_PRIVATE_KEY \
  --rpc-url $RPC

# 5. 验证客户收到退款
# 客户应收到: 100 USDC (补偿) + 之前支付的费用
# 服务商 bond 被扣: 102 USDC (100 + 2罚金)
# 平台收到: 2 USDC 罚金
```

---

## 📁 更新项目配置

### 更新 services/.env

在 `/Users/panda/Documents/ibnk/code/X402/services/.env` 中添加:

```bash
# X402InsuranceV2 合约地址
X402_INSURANCE_V2_ADDRESS=0xa7079939207526d2108005a1CbBD9fa2F35bd42F

# Base Sepolia 配置
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# 服务商密钥（部署者）
SERVER_PRIVATE_KEY=0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31
SERVER_ADDRESS=0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839

# 客户测试密钥（需要另外生成）
CLIENT_PRIVATE_KEY=0x...
```

### 更新 contracts/.env

```bash
# 已经包含正确的配置
X402_INSURANCE_V2_ADDRESS=0xa7079939207526d2108005a1CbBD9fa2F35bd42F
```

---

## 🎯 核心功能验证清单

- [x] ✅ 合约部署成功
- [x] ✅ 参数配置正确
- [ ] ⏳ 服务商存入 bond
- [ ] ⏳ 设置最低 bond 要求
- [ ] ⏳ 客户购买保险（零费用）
- [ ] ⏳ 测试成功流程
- [ ] ⏳ 测试失败流程
- [ ] ⏳ 验证 bond 健康管理
- [ ] ⏳ 验证 2% 惩罚机制

---

## 📖 相关文档

- **集成指南**: `/Users/panda/Documents/ibnk/code/X402/X402_INSURANCE_V2_GUIDE.md`
- **部署步骤**: `/Users/panda/Documents/ibnk/code/X402/DEPLOYMENT_STEPS.md`
- **合约源码**: `/Users/panda/Documents/ibnk/code/X402/contracts/src/X402InsuranceV2.sol`
- **测试代码**: `/Users/panda/Documents/ibnk/code/X402/contracts/test/X402InsuranceV2.t.sol`
- **ABI**: `/Users/panda/Documents/ibnk/code/X402/services/abi/X402InsuranceV2.json`

---

## 🚀 下一步行动

1. **获取测试 USDC**
   - 访问 https://faucet.circle.com/
   - 领取测试 USDC

2. **存入 Bond**
   - 运行上面的 "存入 Bond" 命令
   - 存入 1000 USDC 测试

3. **设置最低要求**
   - 运行 "设置最低 Bond 要求" 命令
   - 设置 500 USDC 最低阈值

4. **运行完整测试**
   - 按照 "完整测试流程" 执行
   - 验证成功和失败场景

5. **集成到服务**
   - 更新 services/.env
   - 修改服务端代码集成保险功能
   - 参考 `X402_INSURANCE_V2_GUIDE.md`

---

## 🎉 恭喜！

**X402InsuranceV2 已成功部署到 Base Sepolia 测试网！**

核心特性:
- ✅ 客户零保险费
- ✅ Bond 锁定机制
- ✅ 2% 惩罚性罚金
- ✅ 健康度监控
- ✅ 完全 x402 兼容

合约地址: `0xa7079939207526d2108005a1CbBD9fa2F35bd42F`

准备开始测试吧！🚀
