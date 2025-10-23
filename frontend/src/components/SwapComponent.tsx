"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import Image from "next/image";
import { ABIs, getTestTokenAddress, getMetaSwapAddress } from "@/abi/contracts";
import { getExplorerUrl } from "@/lib/utils";
import { parseEther, formatEther, formatUnits, encodeFunctionData, createPublicClient, http, createWalletClient, custom } from "viem";
import { monadTestnet } from "@/config/wagmi";
import { sepolia } from "wagmi/chains";
import { Turnkey } from "@turnkey/sdk-browser";
import { TurnkeySigner } from "@turnkey/ethers";
import { ethers } from "ethers";

export function SwapComponent() {
  const { chainId: wagmiChainId } = useAccount();
  const { wallets, user } = useTurnkey();
  
  const walletAddress = wallets?.[0]?.accounts?.[0]?.address;
  const isConnected = !!(user && wallets?.length > 0 && walletAddress);
  
  // Get chainId from localStorage (for embedded wallet) or wagmi (for external wallet)
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  
  useEffect(() => {
    // Priority: wagmi chainId (external wallet) > localStorage (embedded wallet) > default Sepolia
    if (wagmiChainId && (wagmiChainId === 10143 || wagmiChainId === 11155111)) {
      setSelectedChainId(wagmiChainId);
    } else {
      const savedChainId = localStorage.getItem('selectedChainId');
      if (savedChainId) {
        setSelectedChainId(parseInt(savedChainId));
      } else {
        setSelectedChainId(11155111); // Default: Sepolia
        localStorage.setItem('selectedChainId', '11155111');
      }
    }
  }, [wagmiChainId]);
  
  // Only use supported chains (10143: Monad, 11155111: Sepolia)
  const supportedChainId = selectedChainId === 10143 || selectedChainId === 11155111 ? selectedChainId : null;
  
  // Turnkey client
  const [turnkeyClient, setTurnkeyClient] = useState<Turnkey | null>(null);
  
  // Swap states
  const [swapDirection, setSwapDirection] = useState<"nativeToToken" | "tokenToNative">("nativeToToken");
  const [swapAmount, setSwapAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapTxHash, setSwapTxHash] = useState("");
  const [quote, setQuote] = useState("0");
  const [error, setError] = useState<string | null>(null);
  
  // Balance states
  const [nativeBalance, setNativeBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");

  // Modal states
  const swapAlertRef = useRef<HTMLDivElement>(null);

  // Get contract addresses
  const testTokenAddress = supportedChainId ? getTestTokenAddress(supportedChainId) : null;
  const metaSwapAddress = supportedChainId ? getMetaSwapAddress(supportedChainId) : null;

  // Initialize Turnkey client
  useEffect(() => {
    if (user && walletAddress) {
      const storageKey = `turnkey_suborg_${user.userId}`;
      const savedOrgId = localStorage.getItem(storageKey);
      
      if (savedOrgId) {
        const client = new Turnkey({
          apiBaseUrl: "https://api.turnkey.com",
          defaultOrganizationId: savedOrgId,
        });
        setTurnkeyClient(client);
      }
    }
  }, [user, walletAddress]);

  // Load balances
  const loadBalances = useCallback(async () => {
    if (!walletAddress || !supportedChainId || !testTokenAddress) return;

    try {
      const chain = supportedChainId === 11155111 ? sepolia : monadTestnet;
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      // Get native balance
      const nativeBal = await publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });
      setNativeBalance(formatEther(nativeBal));

      // Get token balance
      const tokenBal = await publicClient.readContract({
        address: testTokenAddress as `0x${string}`,
        abi: ABIs.TestToken,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });
      
      setTokenBalance(formatUnits(tokenBal as bigint, 18));

    } catch (err: unknown) {
      console.error("Error loading balances:", err);
    }
  }, [walletAddress, supportedChainId, testTokenAddress]);

  // Close alert when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (swapTxHash && swapAlertRef.current) {
        const target = event.target as HTMLElement;
        if (!swapAlertRef.current.contains(target)) {
          setSwapTxHash("");
        }
      }
    };

    if (swapTxHash) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [swapTxHash]);

  // Calculate quote
  const calculateQuote = useCallback(async () => {
    if (!swapAmount || !metaSwapAddress || !supportedChainId || parseFloat(swapAmount) <= 0) {
      setQuote("0");
      return;
    }

    try {
      const chain = supportedChainId === 11155111 ? sepolia : monadTestnet;
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      if (swapDirection === "nativeToToken") {
        // Get quote for ETH/MON → mUSD
        const result = await publicClient.readContract({
          address: metaSwapAddress as `0x${string}`,
          abi: ABIs.MetaSwap,
          functionName: "getQuoteETHToToken",
          args: [parseEther(swapAmount)],
        });
        setQuote(formatUnits(result as bigint, 18));
      } else {
        // Get quote for mUSD → ETH/MON
        const result = await publicClient.readContract({
          address: metaSwapAddress as `0x${string}`,
          abi: ABIs.MetaSwap,
          functionName: "getQuoteTokenToETH",
          args: [parseEther(swapAmount)],
        });
        setQuote(formatEther(result as bigint));
      }
    } catch (err: unknown) {
      console.error("Error calculating quote:", err);
      setQuote("0");
    }
  }, [swapAmount, metaSwapAddress, supportedChainId, swapDirection]);

  // Perform swap via Turnkey EOA wallet
  const handleSwap = async () => {
    if (!walletAddress || !swapAmount || !metaSwapAddress || !supportedChainId || !testTokenAddress) {
      setError("Missing required data for swap");
      return;
    }

    if (parseFloat(swapAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Check balance before swap
    const inputAmount = parseFloat(swapAmount);
    if (swapDirection === "nativeToToken") {
      if (inputAmount > parseFloat(nativeBalance)) {
        setError("Insufficient balance");
        return;
      }
    } else {
      if (inputAmount > parseFloat(tokenBalance)) {
        setError("Insufficient mUSD balance");
        return;
      }
    }

    setIsSwapping(true);
    setError(null);
    setSwapTxHash("");

    try {
      const provider = window.ethereum;
      const chain = supportedChainId === 11155111 ? sepolia : monadTestnet;

      // Check if external wallet or embedded wallet
      const isExternalWallet = !!(provider && (await provider.request({ method: "eth_accounts" }) as string[]).length > 0);
      
      let hash: string;

      if (isExternalWallet && provider) {
        // ========== EXTERNAL WALLET (MetaMask) ==========
        const walletClient = createWalletClient({
          account: walletAddress as `0x${string}`,
          chain,
          transport: custom(provider),
        });

        if (swapDirection === "nativeToToken") {
          // Native → Token: 1 TX
          const swapData = encodeFunctionData({
            abi: ABIs.MetaSwap,
            functionName: "swapETHToToken",
            args: [],
          });

          hash = await walletClient.sendTransaction({
            to: metaSwapAddress as `0x${string}`,
            data: swapData,
            value: parseEther(swapAmount),
          });
        } else {
          // Token → Native: Check allowance first, then approve if needed, then swap
          const publicClient = createPublicClient({
            chain,
            transport: http(),
          });

          // Check current allowance
          const currentAllowance = await publicClient.readContract({
            address: testTokenAddress as `0x${string}`,
            abi: ABIs.TestToken,
            functionName: "allowance",
            args: [walletAddress as `0x${string}`, metaSwapAddress as `0x${string}`],
          }) as bigint;

          const requiredAmount = parseEther(swapAmount);

          // Only approve if allowance is insufficient
          if (currentAllowance < requiredAmount) {
            const approveData = encodeFunctionData({
              abi: ABIs.TestToken,
              functionName: "approve",
              args: [metaSwapAddress as `0x${string}`, requiredAmount],
            });

            const approveTx = await walletClient.sendTransaction({
              to: testTokenAddress as `0x${string}`,
              data: approveData,
              value: BigInt(0),
            });

            // Wait for approve confirmation
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
          }

          // TX: Swap (or TX2 if approved above)
          const swapData = encodeFunctionData({
            abi: ABIs.MetaSwap,
            functionName: "swapTokenToETH",
            args: [requiredAmount],
          });

          hash = await walletClient.sendTransaction({
            to: metaSwapAddress as `0x${string}`,
            data: swapData,
            value: BigInt(0),
          });
        }
      } else {
        // ========== EMBEDDED WALLET (Turnkey) ==========
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Check passkey
        if (user.authenticators && user.authenticators.length === 0) {
          throw new Error("⚠️ No passkey registered. Please add a passkey first from the wallet dropdown.");
        }

        const storageKey = `turnkey_suborg_${user.userId}`;
        const savedOrgId = localStorage.getItem(storageKey);
        
        if (!savedOrgId) {
          throw new Error('Organization ID not found. Please logout and login again.');
        }

        if (!turnkeyClient) {
          throw new Error("Turnkey client not initialized");
        }

        const rpcProvider = new ethers.JsonRpcProvider(
          supportedChainId === 11155111 
            ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com'
            : process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'
        );

        const passkeyClient = turnkeyClient.passkeyClient();
        const turnkeySigner = new TurnkeySigner({
          client: passkeyClient,
          organizationId: savedOrgId,
          signWith: walletAddress,
        });

        const connectedSigner = turnkeySigner.connect(rpcProvider);

        if (swapDirection === "nativeToToken") {
          // Native → Token: 1 TX
          const metaSwapContract = new ethers.Contract(metaSwapAddress, ABIs.MetaSwap, connectedSigner);
          const tx = await metaSwapContract.swapETHToToken({ value: ethers.parseEther(swapAmount) });
          hash = tx.hash;
          await tx.wait();
        } else {
          // Token → Native: Check allowance first, then approve if needed, then swap
          const tokenContract = new ethers.Contract(testTokenAddress, ABIs.TestToken, connectedSigner);
          const requiredAmount = ethers.parseEther(swapAmount);

          // Check current allowance
          const currentAllowance = await tokenContract.allowance(walletAddress, metaSwapAddress);

          // Only approve if allowance is insufficient
          if (currentAllowance < requiredAmount) {
            const approveTx = await tokenContract.approve(metaSwapAddress, requiredAmount);
            await approveTx.wait();
          }

          // TX: Swap (or TX2 if approved above)
          const metaSwapContract = new ethers.Contract(metaSwapAddress, ABIs.MetaSwap, connectedSigner);
          const swapTx = await metaSwapContract.swapTokenToETH(requiredAmount);
          hash = swapTx.hash;
          await swapTx.wait();
        }
      }

      setSwapTxHash(hash);

      // Reload balances
      await loadBalances();
      setSwapAmount("");
      setQuote("0");
      
    } catch (err: unknown) {
      const error = err as Error;
      setError(`Swap failed: ${error.message}`);
      console.error("Swap error:", err);
    } finally {
      setIsSwapping(false);
    }
  };

  // Load balances when wallet is ready
  useEffect(() => {
    if (walletAddress && supportedChainId) {
      loadBalances();
    }
  }, [walletAddress, supportedChainId, loadBalances]);

  // Calculate quote when amount or direction changes
  useEffect(() => {
    calculateQuote();
  }, [calculateQuote]);

  if (!isConnected) {
    return null;
  }

  if (!supportedChainId) {
    return (
      <div className="p-7 rounded-xl border border-gray-700 bg-secondary-background">
        <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
          <p className="text-[16px] text-yellow-400">⚠️ Please select Sepolia or Monad network</p>
        </div>
      </div>
    );
  }

  const nativeTokenSymbol = supportedChainId === 10143 ? "MON" : "ETH";

  return (
    <div className="p-7 rounded-xl border border-gray-700 bg-secondary-background">
      <div className="space-y-4">
        {/* Swap Form */}
        <div className="space-y-4">
          {/* Sell Section */}
          <div className="p-4 bg-white/90 border border-gray-300 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 font-medium">Sell</span>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={swapAmount}
                  onChange={(e) => {
                    setSwapAmount(e.target.value);
                    // Check balance when typing based on swap direction
                    const inputAmount = parseFloat(e.target.value);
                    if (swapDirection === "nativeToToken") {
                      // ETH → mUSD: check native balance
                      if (inputAmount > parseFloat(nativeBalance)) {
                        setError("Insufficient ETH balance");
                      } else {
                        setError(null);
                      }
                    } else {
                      // mUSD → ETH: check token balance
                      if (inputAmount > parseFloat(tokenBalance)) {
                        setError("Insufficient mUSD balance");
                      } else {
                        setError(null);
                      }
                    }
                  }}
                  placeholder="0"
                  className="text-2xl font-semibold bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                />
                <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center">
                    {swapDirection === "nativeToToken" ? (
                      <Image 
                        src={supportedChainId === 11155111 ? "/eth.svg" : "/monad.svg"} 
                        alt={nativeTokenSymbol}
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                    ) : (
                      <Image 
                        src="/usdc.svg" 
                        alt="mUSD"
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                    )}
                  </div>
                  <span className="font-medium text-gray-800">
                    {swapDirection === "nativeToToken" ? nativeTokenSymbol : "mUSD"}
                  </span>
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Balance: {swapDirection === "nativeToToken" ? nativeBalance : tokenBalance} <span 
                  className="text-purple-600 font-medium cursor-pointer hover:text-purple-700"
                  onClick={() => setSwapAmount(swapDirection === "nativeToToken" ? nativeBalance : tokenBalance)}
                >Max</span>
              </div>
            </div>

            {/* Swap Direction Toggle */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  console.log("Toggle button clicked, current direction:", swapDirection);
                  const newDirection = swapDirection === "nativeToToken" ? "tokenToNative" : "nativeToToken";
                  console.log("New direction:", newDirection);
                  setSwapDirection(newDirection);
                  setSwapAmount("");
                  setQuote("0");
                  setError(null);
                }}
                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* Buy Section */}
            <div className="p-4 bg-white/90 border border-gray-300 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600 font-medium">Buy</span>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={quote}
                  readOnly
                  placeholder="0"
                  className="text-2xl font-semibold bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                />
                <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center">
                    {swapDirection === "nativeToToken" ? (
                      <Image 
                        src="/usdc.svg" 
                        alt="mUSD"
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                    ) : (
                      <Image 
                        src={supportedChainId === 11155111 ? "/eth.svg" : "/monad.svg"} 
                        alt={nativeTokenSymbol}
                        width={24}
                        height={24}
                        className="w-6 h-6"
                      />
                    )}
                  </div>
                  <span className="font-medium text-gray-800">
                    {swapDirection === "nativeToToken" ? "mUSD" : nativeTokenSymbol}
                  </span>
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Balance: {swapDirection === "nativeToToken" ? tokenBalance : nativeBalance}
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={isSwapping || !swapAmount || parseFloat(swapAmount) <= 0}
            className={`w-full h-10 px-4 text-[16px] font-semibold flex items-center justify-center rounded-xl transition-colors ${
              isSwapping || !swapAmount || parseFloat(swapAmount) <= 0
                ? 'bg-button-inactive text-gray-800 cursor-not-allowed'
                : 'bg-button-primary text-white hover:opacity-90'
            }`}
          >
            {isSwapping ? "Swapping..." : "Swap"}
          </button>

          {/* Transaction Hash */}
          {swapTxHash && (
            <div ref={swapAlertRef} className="p-3 bg-green-900/20 border border-green-500 rounded text-center">
              <p className="text-[16px] text-black">Swap successful!</p>
              <a
                href={`${getExplorerUrl(supportedChainId)}/tx/${swapTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-gray-700 underline mt-2 inline-block"
              >
                View Transaction →
              </a>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500 rounded">
              <p className="text-[16px] text-red-500 font-semibold">Error:</p>
              <p className="text-[16px] text-red-400 mt-1">{error}</p>
            </div>
          )}
        </div>
    </div>
  );
}
