import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Danh sách contracts cần generate
const CONTRACTS = ["TestToken", "MetaSwap", "SwapHub"];

// Path: từ frontend/scripts lên monad-m8, vào contracts
const contractsDir = path.resolve(__dirname, "../../contracts");
const deploymentsDir = path.join(contractsDir, "deployments");

// Output: frontend/src/abi
const outdir = path.resolve(__dirname, "../src/abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

const line = "\n===================================================================\n";

if (!fs.existsSync(contractsDir)) {
  console.error(`${line}Unable to locate contracts directory at ${contractsDir}${line}`);
  process.exit(1);
}

// ===================== TestToken (MonadUSD) =====================
console.log("\n🔄 Generating TestToken (MonadUSD)...");

const testTokenFile = path.join(deploymentsDir, "testToken.json");
if (!fs.existsSync(testTokenFile)) {
  console.error(`${line}TestToken deployment not found at ${testTokenFile}${line}`);
  process.exit(1);
}

const testTokenDeployment = JSON.parse(fs.readFileSync(testTokenFile, "utf-8"));

const testTokenABI = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const TestTokenABI = ${JSON.stringify({ abi: testTokenDeployment.abi }, null, 2)} as const;
`;

// Generate TestToken addresses for all chains
const testTokenChains = Object.keys(testTokenDeployment).filter(key => key !== 'abi');
console.log(`📦 Found ${testTokenChains.length} TestToken chain(s): ${testTokenChains.join(', ')}`);

const testTokenAddressEntries = testTokenChains.map(chainId => {
  const chainData = testTokenDeployment[chainId];
  return `  "${chainId}": { address: "${chainData.address}", chainId: ${chainData.chainId}, chainName: "${chainData.chainName}" }`;
}).join(',\n');

const testTokenAddress = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const TestTokenAddresses = { 
${testTokenAddressEntries}
};
`;

fs.writeFileSync(path.join(outdir, "TestTokenABI.ts"), testTokenABI, "utf-8");
fs.writeFileSync(path.join(outdir, "TestTokenAddresses.ts"), testTokenAddress, "utf-8");

console.log(`✅ Generated TestTokenABI.ts`);
console.log(`✅ Generated TestTokenAddresses.ts`);

// ===================== MetaSwap =====================
console.log("\n🔄 Generating MetaSwap...");

const metaSwapFile = path.join(deploymentsDir, "metaSwap.json");
if (!fs.existsSync(metaSwapFile)) {
  console.error(`${line}MetaSwap deployment not found at ${metaSwapFile}${line}`);
  process.exit(1);
}

const metaSwapDeployment = JSON.parse(fs.readFileSync(metaSwapFile, "utf-8"));

const metaSwapABI = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const MetaSwapABI = ${JSON.stringify({ abi: metaSwapDeployment.abi }, null, 2)} as const;
`;

// Generate MetaSwap addresses for all chains
const metaSwapChains = Object.keys(metaSwapDeployment).filter(key => key !== 'abi');
console.log(`📦 Found ${metaSwapChains.length} MetaSwap chain(s): ${metaSwapChains.join(', ')}`);

const metaSwapAddressEntries = metaSwapChains.map(chainId => {
  const chainData = metaSwapDeployment[chainId];
  return `  "${chainId}": { address: "${chainData.address}", chainId: ${chainData.chainId}, chainName: "${chainData.chainName}" }`;
}).join(',\n');

const metaSwapAddress = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const MetaSwapAddresses = { 
${metaSwapAddressEntries}
};
`;

fs.writeFileSync(path.join(outdir, "MetaSwapABI.ts"), metaSwapABI, "utf-8");
fs.writeFileSync(path.join(outdir, "MetaSwapAddresses.ts"), metaSwapAddress, "utf-8");

console.log(`✅ Generated MetaSwapABI.ts`);
console.log(`✅ Generated MetaSwapAddresses.ts`);

// ===================== SwapHub =====================
console.log("\n🔄 Generating SwapHub...");

const swapHubFile = path.join(deploymentsDir, "swapHub.json");
if (!fs.existsSync(swapHubFile)) {
  console.error(`${line}SwapHub deployment not found at ${swapHubFile}${line}`);
  process.exit(1);
}

const swapHubDeployment = JSON.parse(fs.readFileSync(swapHubFile, "utf-8"));

const swapHubABI = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const SwapHubABI = ${JSON.stringify({ abi: swapHubDeployment.abi }, null, 2)} as const;
`;

// Generate SwapHub addresses for all chains
const swapHubChains = Object.keys(swapHubDeployment).filter(key => key !== 'abi');
console.log(`📦 Found ${swapHubChains.length} SwapHub chain(s): ${swapHubChains.join(', ')}`);

const swapHubAddressEntries = swapHubChains.map(chainId => {
  const chainData = swapHubDeployment[chainId];
  return `  "${chainId}": { address: "${chainData.address}", chainId: ${chainData.chainId}, chainName: "${chainData.chainName}" }`;
}).join(',\n');

const swapHubAddress = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const SwapHubAddresses = { 
${swapHubAddressEntries}
};
`;

fs.writeFileSync(path.join(outdir, "SwapHubABI.ts"), swapHubABI, "utf-8");
fs.writeFileSync(path.join(outdir, "SwapHubAddresses.ts"), swapHubAddress, "utf-8");

console.log(`✅ Generated SwapHubABI.ts`);
console.log(`✅ Generated SwapHubAddresses.ts`);

// ===================== Helper Functions =====================
// Generate helper functions for all contracts
const helperFunctions = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
import { TestTokenAddresses } from './TestTokenAddresses';
import { MetaSwapAddresses } from './MetaSwapAddresses';
import { SwapHubAddresses } from './SwapHubAddresses';

// Helper to get TestToken address by chainId
export function getTestTokenAddress(chainId: number): string | undefined {
  const chain = TestTokenAddresses[chainId.toString() as keyof typeof TestTokenAddresses];
  return chain?.address;
}

// Helper to get MetaSwap address by chainId  
export function getMetaSwapAddress(chainId: number): string | undefined {
  const chain = MetaSwapAddresses[chainId.toString() as keyof typeof MetaSwapAddresses];
  return chain?.address;
}

// Helper to get SwapHub address by chainId
export function getSwapHubAddress(chainId: number): string | undefined {
  const chain = SwapHubAddresses[chainId.toString() as keyof typeof SwapHubAddresses];
  return chain?.address;
}

// Get all available chain IDs
export function getAvailableChains() {
  const testTokenChains = Object.keys(TestTokenAddresses);
  const metaSwapChains = Object.keys(MetaSwapAddresses);
  const swapHubChains = Object.keys(SwapHubAddresses);
  
  // Return intersection of all three
  return testTokenChains.filter(chainId => 
    metaSwapChains.includes(chainId) && swapHubChains.includes(chainId)
  );
}
`;

fs.writeFileSync(path.join(outdir, "helpers.ts"), helperFunctions, "utf-8");
console.log(`✅ Generated helpers.ts`);

// ===================== contracts.ts (tổng hợp) =====================
const contractsTs = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
import { TestTokenABI } from './TestTokenABI';
import { TestTokenAddresses } from './TestTokenAddresses';
import { MetaSwapABI } from './MetaSwapABI';
import { MetaSwapAddresses } from './MetaSwapAddresses';
import { SwapHubABI } from './SwapHubABI';
import { SwapHubAddresses } from './SwapHubAddresses';
import { getTestTokenAddress, getMetaSwapAddress, getSwapHubAddress, getAvailableChains } from './helpers';

// Export tất cả ABIs
export const ABIs = {
  TestToken: TestTokenABI.abi,
  MetaSwap: MetaSwapABI.abi,
  SwapHub: SwapHubABI.abi,
};

// Export tất cả Addresses
export const Addresses = {
  TestToken: TestTokenAddresses,
  MetaSwap: MetaSwapAddresses,
  SwapHub: SwapHubAddresses,
};

// Export individual contracts
export { TestTokenABI, TestTokenAddresses };
export { MetaSwapABI, MetaSwapAddresses };
export { SwapHubABI, SwapHubAddresses };
export { getTestTokenAddress, getMetaSwapAddress, getSwapHubAddress, getAvailableChains };
`;

fs.writeFileSync(path.join(outdir, "contracts.ts"), contractsTs, "utf-8");

console.log(`\n🎉 All done! Generated files:`);
console.log(`   - TestTokenABI.ts`);
console.log(`   - TestTokenAddresses.ts`);
console.log(`   - MetaSwapABI.ts`);
console.log(`   - MetaSwapAddresses.ts`);
console.log(`   - SwapHubABI.ts`);
console.log(`   - SwapHubAddresses.ts`);
console.log(`   - helpers.ts`);
console.log(`   - contracts.ts (tổng hợp)`);

console.log(`\n📝 Usage example:`);
console.log(`   import { ABIs, Addresses, getTestTokenAddress, getMetaSwapAddress, getSwapHubAddress } from '@/abi/contracts';`);
console.log(`   const testTokenABI = ABIs.TestToken;`);
console.log(`   const testTokenAddress = getTestTokenAddress(10143);`);
console.log(`   const metaSwapAddress = getMetaSwapAddress(10143);`);
console.log(`   const swapHubAddress = getSwapHubAddress(10143);`);

