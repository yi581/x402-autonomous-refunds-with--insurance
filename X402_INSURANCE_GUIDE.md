# 🛡️ X402 + 保险层 - 使用指南

## 概述

**X402Insurance** 是一个完全兼容 x402 协议的保险保护层。它不改变 x402 的即时结算特性，而是增加了可选的保险保护。

### 核心特点

✅ **完全兼容 x402** - 不改变原有支付流程
✅ **服务商立即收款** - x402 正常结算
✅ **客户有保障** - 超时可从 bond 获得赔付
✅ **可选使用** - 服务商和客户都可选择是否启用
✅ **win-win** - 服务成功时，保险费奖励给服务商

---

## 🎯 工作原理

### 传统 x402（无保险）

```
客户支付 1.00 USDC
    ↓ x402 正常结算
服务商立即收到 1.00 USDC
    ↓
服务商交付内容
```

**问题**: 如果服务商不交付，客户无法退款

---

### x402 + 保险（新方案）

```
客户支付 1.01 USDC:
├─ 1.00 USDC → x402 正常结算 → 服务商立即收到 ✅
└─ 0.01 USDC → 保险合约锁定 🔒

然后两种结局:

✅ 服务成功:
   服务商签名确认
   → 保险费 0.01 作为奖励给服务商
   → 服务商总收入: 1.01 USDC

❌ 服务失败/超时:
   客户申领保险赔付
   → 从服务商 bond 扣除 1.00 USDC 赔付客户
   → 保险费 0.01 退还客户
   → 客户损失: 只有 gas 费
```

---

## 📊 对比

| 模式 | x402 兼容 | 服务商立即收款 | 客户保护 | 服务商激励 |
|------|----------|--------------|---------|-----------|
| **纯 x402** | ✅ | ✅ | ❌ | - |
| **x402 + 保险** ⭐ | ✅ | ✅ | ✅ | 成功有奖励 |
| **完全托管** | ⚠️ | ❌ | ✅ | - |

---

## 🚀 快速开始

### Step 1: 部署保险合约

```bash
cd contracts

# 配置 .env
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
PLATFORM_TREASURY=0xYourAddress
INSURANCE_FEE_RATE=1000  # 10% of insurance fee
DEFAULT_TIMEOUT=5        # 5 minutes

# 部署
~/.foundry/bin/forge script script/DeployInsurance.s.sol:DeployInsurance \
  --rpc-url $RPC_URL \
  --broadcast

# 记录合约地址
X402_INSURANCE_ADDRESS=0x...
```

### Step 2: 服务商存入保证金

```typescript
import { ethers } from 'ethers';
import X402InsuranceABI from './abi/X402Insurance.json';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PROVIDER_PRIVATE_KEY, provider);

const insurance = new ethers.Contract(
  X402_INSURANCE_ADDRESS,
  X402InsuranceABI,
  wallet
);

// 1. 批准 USDC
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
await usdc.approve(X402_INSURANCE_ADDRESS, ethers.parseUnits("10000", 6));

// 2. 存入保证金（10,000 USDC）
const tx = await insurance.depositBond(ethers.parseUnits("10000", 6));
await tx.wait();

console.log("✅ Bond deposited!");

// 3. 检查状态
const bondBalance = await insurance.providerBond(wallet.address);
console.log(`Bond: ${ethers.formatUnits(bondBalance, 6)} USDC`);
```

### Step 3: 服务商提供保险服务

```typescript
// server.ts
import express from 'express';
import { paymentMiddleware } from 'x402-express';

const app = express();

// 标准端点（无保险）
app.get('/api/basic',
  paymentMiddleware(wallet.address, {
    '/api/basic': { price: '$0.10', network: 'base-sepolia' }
  }, FACILITATOR_URL),
  (req, res) => {
    // x402 正常结算，服务商立即收款
    const result = processRequest(req);
    res.json(result);
  }
);

// 带保险的端点
app.get('/api/protected',
  paymentMiddleware(wallet.address, {
    '/api/protected': { price: '$0.10', network: 'base-sepolia' }
  }, FACILITATOR_URL),
  async (req, res) => {
    const requestCommitment = calculateRequestCommitment(req);

    try {
      // 处理业务逻辑
      const result = await processRequest(req);

      // 成功！通知保险合约（获得保险费奖励）
      if (req.headers['x-insurance-commitment']) {
        await confirmInsuranceSuccess(requestCommitment);
      }

      res.json({ success: true, data: result });
    } catch (error) {
      // 失败！客户可以申领保险
      res.status(500).json({
        success: false,
        error: error.message,
        canClaimInsurance: true  // 提示客户可以申领保险
      });
    }
  }
);

// 确认服务成功（获得保险费奖励）
async function confirmInsuranceSuccess(requestCommitment: string) {
  const signature = await signServiceConfirmation(requestCommitment);
  const tx = await insurance.confirmService(requestCommitment, signature);
  await tx.wait();
  console.log(`✅ Insurance fee earned!`);
}
```

### Step 4: 客户使用保险

```typescript
// client.ts
import axios from 'axios';
import { withPaymentInterceptor } from 'x402-axios';

const api = withPaymentInterceptor(
  axios.create({ baseURL: 'http://localhost:4000' }),
  viemClient
);

// 使用保险保护
async function requestWithInsurance() {
  const requestCommitment = generateRequestCommitment();

  // 1. 正常的 x402 请求
  const response = await api.get('/api/protected');

  // 2. 购买保险（额外支付）
  const insuranceFee = ethers.parseUnits("0.01", 6);  // 1% of $1
  const tx = await insurance.purchaseInsurance(
    requestCommitment,
    SERVER_ADDRESS,
    ethers.parseUnits("1", 6),  // payment amount
    insuranceFee,
    5  // 5 minutes timeout
  );
  await tx.wait();

  console.log("✅ Insurance purchased");

  // 3. 如果服务失败，等待超时后申领
  if (!response.data.success) {
    console.log("Service failed, waiting for timeout...");

    setTimeout(async () => {
      // 检查是否可以申领
      const canClaim = await insurance.canClaimInsurance(requestCommitment);

      if (canClaim) {
        const claimTx = await insurance.claimInsurance(requestCommitment);
        await claimTx.wait();
        console.log("✅ Insurance claimed! Money back!");
      }
    }, 5 * 60 * 1000);  // 5 分钟后
  }
}
```

---

## 💰 经济模型

### 服务商视角

```
场景 1: 服务成功（100 次）
├─ x402 收入: 100 * $1.00 = $100
├─ 保险费奖励: 100 * $0.009 = $0.90 (扣除 10% 平台费)
└─ 总收入: $100.90

场景 2: 服务失败（5 次）
├─ x402 收入: 5 * $1.00 = $5.00 (已结算无法撤回)
├─ Bond 赔付: 5 * $1.00 = $5.00 (从 bond 扣除)
└─ 净损失: $0

总结:
├─ 成功 100 次: +$100.90
├─ 失败 5 次: $0
├─ Bond 消耗: $5.00
└─ 实际收入: $95.90 (95.9% 成功率)
```

**激励**: 服务商有动力提供优质服务，成功率越高收入越高！

### 客户视角

```
标准 x402 支付: $1.00
保险费: $0.01 (1%)
总成本: $1.01

如果服务成功:
├─ 获得服务 ✅
└─ 成本: $1.01

如果服务失败:
├─ 保险赔付: $1.00
├─ 保险费退还: $0.01
└─ 净损失: 只有 gas 费 (~$0.001)
```

**保障**: 客户最多损失 0.1% (gas 费)

### 平台视角

```
每笔保险费: $0.01
平台抽成: 10%
平台收入: $0.001/笔

如果有 10 万笔/月:
月收入 = 100,000 * $0.001 = $100/月

如果有 100 万笔/月:
月收入 = 1,000,000 * $0.001 = $1,000/月
```

---

## 🔧 集成示例

### 完整的服务商集成

```typescript
// insurance-middleware.ts
import { ethers } from 'ethers';
import X402InsuranceABI from './abi/X402Insurance.json';

export function withInsuranceProtection(handler: RequestHandler) {
  return async (req: Request, res: Response) => {
    const requestCommitment = calculateRequestCommitment(req);

    try {
      // 执行业务逻辑
      const result = await handler(req, res);

      // 服务成功，确认并获得保险费奖励
      if (req.headers['x-insurance-commitment']) {
        await confirmServiceSuccess(requestCommitment);
      }

      return result;
    } catch (error) {
      // 服务失败，客户可以申领保险
      console.error(`Service failed for ${requestCommitment}:`, error);

      // 返回错误，提示客户可以申领保险
      res.status(500).json({
        success: false,
        error: error.message,
        insuranceAvailable: true,
        requestCommitment
      });
    }
  };
}

// 使用示例
app.get('/api/data',
  paymentMiddleware(...),
  withInsuranceProtection(async (req, res) => {
    const data = await fetchData(req.params.id);
    res.json(data);
  })
);
```

### 完整的客户端集成

```typescript
// x402-insurance-client.ts
import { ethers } from 'ethers';
import axios from 'axios';
import { withPaymentInterceptor } from 'x402-axios';

export class X402InsuranceClient {
  private api: any;
  private insurance: ethers.Contract;
  private wallet: ethers.Wallet;

  constructor(config: ClientConfig) {
    this.wallet = new ethers.Wallet(config.privateKey, config.provider);
    this.insurance = new ethers.Contract(
      config.insuranceAddress,
      X402InsuranceABI,
      this.wallet
    );

    this.api = withPaymentInterceptor(
      axios.create({ baseURL: config.serverUrl }),
      viemClient
    );
  }

  /**
   * 带保险保护的请求
   */
  async requestWithInsurance(
    endpoint: string,
    options: InsuranceOptions = {}
  ) {
    const requestCommitment = this.generateCommitment(endpoint);
    const paymentAmount = options.paymentAmount || ethers.parseUnits("1", 6);
    const insuranceFee = options.insuranceFee || (paymentAmount * BigInt(100) / BigInt(10000)); // 1%
    const timeout = options.timeout || 5;

    try {
      // 1. 发起 x402 请求
      const response = await this.api.get(endpoint, {
        headers: {
          'x-insurance-commitment': requestCommitment
        }
      });

      // 2. 购买保险
      const insuranceTx = await this.insurance.purchaseInsurance(
        requestCommitment,
        options.providerAddress,
        paymentAmount,
        insuranceFee,
        timeout
      );
      await insuranceTx.wait();

      // 3. 成功返回
      return response.data;

    } catch (error: any) {
      // 4. 失败，自动申领保险
      console.log("Service failed, attempting insurance claim...");

      // 等待超时
      await this.waitForTimeout(timeout);

      // 申领保险
      const canClaim = await this.insurance.canClaimInsurance(requestCommitment);
      if (canClaim) {
        const claimTx = await this.insurance.claimInsurance(requestCommitment);
        await claimTx.wait();
        console.log("✅ Insurance claimed successfully!");
      }

      throw error;
    }
  }

  private async waitForTimeout(minutes: number) {
    return new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));
  }

  private generateCommitment(endpoint: string): string {
    // 实现 request commitment 生成逻辑
    return ethers.keccak256(ethers.toUtf8Bytes(endpoint + Date.now()));
  }
}

// 使用
const client = new X402InsuranceClient({
  privateKey: process.env.CLIENT_PRIVATE_KEY!,
  provider: new ethers.JsonRpcProvider(RPC_URL),
  insuranceAddress: X402_INSURANCE_ADDRESS,
  serverUrl: 'http://localhost:4000'
});

const data = await client.requestWithInsurance('/api/data', {
  providerAddress: SERVER_ADDRESS,
  paymentAmount: ethers.parseUnits("1", 6),
  timeout: 5
});
```

---

## 📈 监控和统计

### 服务商仪表盘

```typescript
// 获取服务商统计
const stats = await insurance.getProviderStats(providerAddress);

console.log(`
  Bond Balance: ${ethers.formatUnits(stats.bondBalance, 6)} USDC
  Min Bond: ${ethers.formatUnits(stats.minBond, 6)} USDC
  Status: ${stats.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}
`);

// 获取特定保险索赔详情
const claim = await insurance.getClaimDetails(requestCommitment);

console.log(`
  Client: ${claim.client}
  Payment: ${ethers.formatUnits(claim.paymentAmount, 6)} USDC
  Insurance Fee: ${ethers.formatUnits(claim.insuranceFee, 6)} USDC
  Deadline: ${new Date(Number(claim.deadline) * 1000).toLocaleString()}
  Time Left: ${claim.timeLeft} seconds
  Status: ${claim.status}  // 0=Pending, 1=Confirmed, 2=Claimed
`);
```

---

## 🎯 最佳实践

### 服务商

1. **合理设置 bond**
   ```typescript
   // 至少是日均交易量的 2-3 倍
   const dailyVolume = 1000 * 1;  // 1000 笔 * $1
   const recommendedBond = dailyVolume * 3;
   ```

2. **及时确认成功**
   ```typescript
   // 服务成功后立即确认，获得保险费奖励
   if (serviceSuccess) {
     await confirmService(requestCommitment, signature);
   }
   ```

3. **监控 bond 余额**
   ```typescript
   setInterval(async () => {
     const bond = await insurance.providerBond(myAddress);
     const min = await insurance.minProviderBond(myAddress);

     if (bond < min * 1.2) {  // 低于 120% 最低值
       console.warn("⚠️  Bond running low!");
       await topUpBond();
     }
   }, 3600 * 1000);  // 每小时检查
   ```

### 客户

1. **检查服务商信誉**
   ```typescript
   const stats = await insurance.getProviderStats(providerAddress);

   if (!stats.isHealthy) {
     console.warn("⚠️  Provider bond insufficient!");
     // 选择其他服务商或不购买保险
   }
   ```

2. **合理设置超时**
   ```typescript
   // 根据服务类型设置
   const timeouts = {
     'fast-api': 1,      // 1 分钟
     'data-query': 5,    // 5 分钟
     'heavy-compute': 30  // 30 分钟
   };
   ```

3. **自动监控和申领**
   ```typescript
   // 在后台自动监控
   async function autoMonitorInsurance(requestCommitment) {
     const claim = await insurance.getClaimDetails(requestCommitment);

     if (claim.status === 0) {  // Pending
       const checkInterval = setInterval(async () => {
         const canClaim = await insurance.canClaimInsurance(requestCommitment);

         if (canClaim) {
           clearInterval(checkInterval);
           await insurance.claimInsurance(requestCommitment);
           console.log("✅ Auto-claimed insurance!");
         }
       }, 60 * 1000);  // 每分钟检查
     }
   }
   ```

---

## 🔐 安全注意事项

1. **服务商 bond 管理**
   - 使用硬件钱包管理大额 bond
   - 实施多重签名
   - 定期审计 bond 使用情况

2. **签名安全**
   - 服务器私钥需妥善保管
   - 使用 HSM 或 KMS
   - 定期轮换密钥

3. **防止滥用**
   - 监控异常申领模式
   - 设置申领频率限制
   - 实施黑名单机制

---

## 📚 完整API 参考

查看 `X402Insurance.sol` 获取完整的合约接口。

---

## 🎉 总结

**X402Insurance 让 x402 支付更安全，同时保持其高效特性**！

- ✅ 服务商立即收款
- ✅ 客户有保险保障
- ✅ 成功有额外奖励
- ✅ 完全去中心化

**开始使用**: 部署合约 → 存入 bond → 开启保险服务！
