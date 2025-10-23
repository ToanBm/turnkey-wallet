
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
