"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { useAccount } from "wagmi";
import { getExplorerUrl } from "@/lib/utils";
import { getTestTokenAddress } from "@/abi/contracts";
import { createPublicClient, createWalletClient, http, custom, parseEther, formatEther } from "viem";
import { monadTestnet } from "@/config/wagmi";
import { sepolia } from "wagmi/chains";
import { TestTokenABI } from "@/abi/TestTokenABI";
import { Turnkey } from "@turnkey/sdk-browser";
import { TurnkeySigner } from "@turnkey/ethers";
import { ethers } from "ethers";
import Image from "next/image";

export function TurnkeyWalletInfo() {
  const { wallets, user } = useTurnkey();
  const { chainId: wagmiChainId } = useAccount();
  
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
  
  const [error, setError] = useState<string | null>(null);
  
  // Send states
  const [selectedToken, setSelectedToken] = useState<string>("native");
  const [recipient, setRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendTxHash, setSendTxHash] = useState("");
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const sendAlertRef = useRef<HTMLDivElement>(null);
  
  // Wallet Balance state
  const [walletBalance, setWalletBalance] = useState("0");

  // Turnkey client
  const [turnkeyClient, setTurnkeyClient] = useState<Turnkey | null>(null);

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

  // Available tokens based on network
  const availableTokens = [
    {
      id: "native",
      name: supportedChainId === 10143 ? "MON" : supportedChainId === 11155111 ? "ETH" : "Select Network",
      symbol: supportedChainId === 10143 ? "MON" : supportedChainId === 11155111 ? "ETH" : "N/A",
      icon: supportedChainId === 10143 ? "/monad.svg" : supportedChainId === 11155111 ? "/eth.svg" : "/eth.svg"
    },
    {
      id: "mUSD",
      name: "MonadUSD",
      symbol: "mUSD",
      icon: "/usdc.svg"
    }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isTokenDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.token-dropdown')) {
          setIsTokenDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTokenDropdownOpen]);

  // Close send alert when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sendTxHash && sendAlertRef.current) {
        const target = event.target as HTMLElement;
        if (!sendAlertRef.current.contains(target)) {
          setSendTxHash("");
        }
      }
    };

    if (sendTxHash) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [sendTxHash]);

  // Load wallet balance based on selected token
  const loadWalletBalance = useCallback(async () => {
    if (!walletAddress || !supportedChainId) return;

    try {
      const chain = supportedChainId === 11155111 ? sepolia : monadTestnet;
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      if (selectedToken === "native") {
        // Load native token balance (ETH/MON)
        const balance = await publicClient.getBalance({
          address: walletAddress as `0x${string}`,
        });
        setWalletBalance(formatEther(balance));
      } else if (selectedToken === "mUSD") {
        // Load mUSD token balance
        const testTokenAddress = getTestTokenAddress(supportedChainId);
        if (!testTokenAddress) {
          setWalletBalance("0");
          return;
        }

        const balance = await publicClient.readContract({
          address: testTokenAddress as `0x${string}`,
          abi: TestTokenABI.abi,
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`],
        });

        setWalletBalance(formatEther(balance as bigint));
      }
    } catch (error) {
      console.error("Error loading wallet balance:", error);
    }
  }, [walletAddress, supportedChainId, selectedToken]);

  // Load wallet balance when component mounts or dependencies change
  useEffect(() => {
    loadWalletBalance();
  }, [loadWalletBalance]);

  // Handle send transaction
  const handleSend = async () => {
    if (!walletAddress || !recipient || !sendAmount) {
      setError("Please fill in all fields");
      return;
    }

    if (!supportedChainId) {
      setError("Please select a supported network");
      return;
    }

    if (!turnkeyClient || !user) {
      setError("Turnkey client not initialized");
      return;
    }

    // Check if user has passkey for embedded wallet
    if (user.authenticators && user.authenticators.length === 0) {
      setError("⚠️ No passkey registered. Please add a passkey first from the wallet dropdown.");
      return;
    }

    setIsSending(true);
    setError(null);
    setSendTxHash("");

    try {
      const chain = supportedChainId === 11155111 ? sepolia : monadTestnet;
      const provider = window.ethereum;

      // Check if external wallet or embedded wallet
      const isExternalWallet = !!(provider && (await provider.request({ method: "eth_accounts" }) as string[]).length > 0);

      if (isExternalWallet && provider) {
        // External wallet - use window.ethereum
        const walletClient = createWalletClient({
          account: walletAddress as `0x${string}`,
          chain,
          transport: custom(provider),
        });

        let hash: string;

        if (selectedToken === "native") {
          hash = await walletClient.sendTransaction({
            to: recipient as `0x${string}`,
            value: parseEther(sendAmount),
          });
        } else {
          const testTokenAddress = getTestTokenAddress(supportedChainId);
          if (!testTokenAddress) {
            throw new Error("TestToken not deployed on this network");
          }
          
          hash = await walletClient.writeContract({
            address: testTokenAddress as `0x${string}`,
            abi: TestTokenABI.abi,
            functionName: "transfer",
            args: [recipient as `0x${string}`, parseEther(sendAmount)],
          });
        }

        setSendTxHash(hash);
      } else {
        // Embedded wallet - use TurnkeySigner
        const storageKey = `turnkey_suborg_${user.userId}`;
        const savedOrgId = localStorage.getItem(storageKey);
        
        if (!savedOrgId) {
          throw new Error('Organization ID not found');
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

        if (selectedToken === "native") {
          const tx = await connectedSigner.sendTransaction({
            to: recipient,
            value: ethers.parseEther(sendAmount),
            type: 2,
          });
          setSendTxHash(tx.hash);
          await tx.wait();
        } else {
          const testTokenAddress = getTestTokenAddress(supportedChainId);
          if (!testTokenAddress) {
            throw new Error("TestToken not deployed on this network");
          }

          const contract = new ethers.Contract(testTokenAddress, TestTokenABI.abi, connectedSigner);
          const tx = await contract.transfer(recipient, ethers.parseEther(sendAmount));
          setSendTxHash(tx.hash);
          await tx.wait();
        }
      }

      setSendAmount("");
      setRecipient("");
      
      // Reload balance
      setTimeout(() => loadWalletBalance(), 2000);
    } catch (err: unknown) {
      const error = err as Error;
      const errorMsg = error.message || String(err);
      setError(`Send failed: ${errorMsg}`);
      console.error("Send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-7 rounded-xl border border-gray-700 bg-secondary-background">
        <h3 className="text-[18px] font-bold mb-4 text-gray-800">
          Turnkey Wallet
        </h3>
        <p className="text-gray-600 text-[16px]">Please connect your Turnkey wallet first.</p>
      </div>
    );
  }

  return (
    <div className="p-7 rounded-xl border border-gray-700 bg-secondary-background">
      <h3 className="text-[18px] font-bold mb-4 text-gray-800">
        Send Tokens from Turnkey Wallet
      </h3>
      
      {/* Address Display */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <p className="text-gray-600 text-xs mb-1">Your Wallet Address</p>
        <p className="text-gray-800 text-sm font-mono">
          {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </p>
      </div>

      {/* Send Form */}
      <div className="space-y-4">
        {/* Row: Token Selector, Recipient, Amount, Send Button */}
        <div className="grid grid-cols-4 gap-3">
          {/* Token Selector */}
          <div className="relative token-dropdown">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-400">Token</label>
              <span className="text-xs text-gray-500 font-bold">
                {parseFloat(walletBalance).toFixed(4)}
              </span>
            </div>
            <button
              onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
              className="w-full h-10 px-3 bg-button-inactive border border-gray-300 rounded-xl text-gray-800 text-[16px] font-semibold flex items-center justify-between hover:bg-gray-100 transition-colors shadow-md"
            >
              <div className="flex items-center gap-2">
                <Image
                  src={availableTokens.find(t => t.id === selectedToken)?.icon || "/eth.svg"}
                  alt={availableTokens.find(t => t.id === selectedToken)?.symbol || "Token"}
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <span>{availableTokens.find(t => t.id === selectedToken)?.symbol || "Select Token"}</span>
              </div>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Token Dropdown */}
            {isTokenDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-xl shadow-lg z-50">
                {availableTokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => {
                      setSelectedToken(token.id);
                      setIsTokenDropdownOpen(false);
                    }}
                    className={`w-full h-10 px-3 text-left text-[16px] font-semibold flex items-center hover:bg-gray-100 transition-colors ${
                      selectedToken === token.id ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={token.icon}
                        alt={token.symbol}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                      <span className="text-gray-800">{token.symbol}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recipient Input */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full h-10 px-3 bg-button-inactive border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 text-[16px] font-semibold focus:outline-none focus:border-gray-400 shadow-md"
            />
          </div>

          {/* Amount Input + Send Button */}
          <div className="flex flex-col">
            <label className="block text-sm text-gray-400 mb-2">Amount</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.0"
                className="w-full h-10 px-3 bg-button-inactive border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 text-[16px] font-semibold focus:outline-none focus:border-gray-400 shadow-md"
              />
            </div>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isSending || !recipient || !sendAmount}
          className={`w-full h-10 px-4 text-[16px] font-semibold flex items-center justify-center rounded-xl transition-colors ${
            isSending || !recipient || !sendAmount
              ? 'bg-button-inactive text-gray-800 cursor-not-allowed'
              : 'bg-button-primary text-white hover:opacity-90'
          }`}
        >
          {isSending ? "Sending..." : "Send"}
        </button>

        {/* Transaction Hash */}
        {sendTxHash && (
          <div ref={sendAlertRef} className="p-3 bg-green-900/20 border border-green-500 rounded text-center">
            <p className="text-[16px] text-black">Send successful!</p>
            <a
              href={`${getExplorerUrl(supportedChainId)}/tx/${sendTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-700 underline mt-2 inline-block"
            >
              View Transaction →
            </a>
          </div>
        )}

        {/* Error Display */}
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

