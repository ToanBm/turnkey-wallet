
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
