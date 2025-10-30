#!/usr/bin/env node

/**
 * EIP-712 签名生成工具
 * 用于测试 X402InsuranceV2 的 confirmService 功能
 */

const { ethers } = require('ethers');

// 配置
const INSURANCE_ADDRESS = '0xa7079939207526d2108005a1CbBD9fa2F35bd42F';
const CHAIN_ID = 84532; // Base Sepolia
const PROVIDER_PRIVATE_KEY = '0xdc150082f348843bcf845686cd769fa0db6c823f62e6030aadc538c64980ba31';
const REQUEST_COMMITMENT = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

// EIP-712 Domain
const domain = {
  name: 'X402InsuranceV2',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: INSURANCE_ADDRESS
};

// EIP-712 Types
const types = {
  ServiceConfirmation: [
    { name: 'requestCommitment', type: 'bytes32' }
  ]
};

// Message
const message = {
  requestCommitment: REQUEST_COMMITMENT
};

async function generateSignature() {
  console.log('🔐 生成 EIP-712 签名...\n');

  // 创建签名者
  const wallet = new ethers.Wallet(PROVIDER_PRIVATE_KEY);

  console.log('签名者地址:', wallet.address);
  console.log('合约地址:', INSURANCE_ADDRESS);
  console.log('Chain ID:', CHAIN_ID);
  console.log('Request Commitment:', REQUEST_COMMITMENT);
  console.log('');

  // 生成签名
  const signature = await wallet.signTypedData(domain, types, message);

  console.log('✅ 签名生成成功！\n');
  console.log('签名:', signature);
  console.log('');

  // 验证签名
  const recoveredAddress = ethers.verifyTypedData(domain, types, message, signature);
  console.log('验证签名者:', recoveredAddress);
  console.log('匹配:', recoveredAddress.toLowerCase() === wallet.address.toLowerCase() ? '✅' : '❌');
  console.log('');

  // 生成调用命令
  console.log('📝 调用 confirmService 命令:\n');
  console.log(`~/.foundry/bin/cast send ${INSURANCE_ADDRESS} \\`);
  console.log(`  "confirmService(bytes32,bytes)" \\`);
  console.log(`  ${REQUEST_COMMITMENT} \\`);
  console.log(`  ${signature} \\`);
  console.log(`  --private-key ${PROVIDER_PRIVATE_KEY} \\`);
  console.log(`  --rpc-url https://sepolia.base.org`);
  console.log('');

  return signature;
}

// 运行
generateSignature()
  .then(() => {
    console.log('✅ 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
