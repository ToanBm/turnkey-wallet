"use client";

import { useAccount } from "wagmi";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { useState, useEffect, useRef } from "react";
import { formatAddress, getExplorerUrl } from "@/lib/utils";
import { ABIs, getTestTokenAddress } from "@/abi/contracts";
import { createWalletClient, custom, encodeFunctionData } from "viem";
import { sepolia } from "wagmi/chains";
import { monadTestnet } from "@/config/wagmi";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  // Turnkey hooks cho authentication
  const { user, wallets, handleLogin, logout, createWallet, connectWalletAccount, walletProviders, session } = useTurnkey();
  
  // wagmi hooks cho chain state (vẫn cần cho network detection)
  const { chainId } = useAccount();
  
  // Lấy address từ Turnkey wallet
  const address = wallets?.[0]?.accounts?.[0]?.address;
  const isConnected = !!(user && wallets?.length > 0 && address);
  const pathname = usePathname();
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [isFauceting, setIsFauceting] = useState(false);
  const [faucetTxHash, setFaucetTxHash] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const networkDropdownRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Auto-create wallet sau khi login với Turnkey
  useEffect(() => {
    const handlePostAuth = async () => {
      if (!user || isProcessing) return;

      // Đã có wallet rồi → Lưu Organization ID nếu chưa có
      if (wallets && wallets.length > 0) {
        const storageKey = `turnkey_suborg_${user.userId}`;
        const existingOrgId = localStorage.getItem(storageKey);
        
        if (!existingOrgId) {
          const sessionOrgId = (session as Record<string, unknown> | null)?.organizationId as string | undefined;
          const walletAccountOrgId = wallets[0]?.accounts?.[0]?.organizationId;
          const orgId = sessionOrgId || walletAccountOrgId;
          
          if (orgId) {
            localStorage.setItem(storageKey, orgId);
          }
        }
        return;
      }

      setIsProcessing(true);

      try {
        const hasAuthenticators = user.authenticators && user.authenticators.length > 0;
        const hasEmailOrOAuth = user.userEmail || user.oauthProviders?.length > 0;
        
        if (hasAuthenticators || hasEmailOrOAuth) {
          if (wallets.length === 0) {
            const walletResult = await createWallet({
              walletName: "My Wallet",
              accounts: [
                {
                  curve: "CURVE_SECP256K1",
                  addressFormat: "ADDRESS_FORMAT_ETHEREUM",
                  pathFormat: "PATH_FORMAT_BIP32",
                  path: "m/44'/60'/0'/0/0",
                },
              ],
            });
            
            const walletOrgId = (walletResult as unknown as Record<string, unknown> | null)?.accounts as Array<{ organizationId?: string }> | undefined;
            const sessionOrgId = (session as Record<string, unknown> | null)?.organizationId as string | undefined;
            const orgId = walletOrgId?.[0]?.organizationId || sessionOrgId;
            
            if (orgId) {
              const storageKey = `turnkey_suborg_${user.userId}`;
              localStorage.setItem(storageKey, orgId);
            }
          }
        } else {
          const connectedProvider = walletProviders.find(
            (p) => p.connectedAddresses && p.connectedAddresses.length > 0
          );
          
          if (connectedProvider) {
            await connectWalletAccount(connectedProvider);
          }
        }
      } catch (error) {
        console.error("Wallet creation error:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    handlePostAuth();
  }, [user, wallets, walletProviders, isProcessing, connectWalletAccount, createWallet, session]);

  const displayAddress = address;
  
  // Get chainId from wagmi (external wallet) or localStorage (embedded wallet)
  const [displayChainId, setDisplayChainId] = useState<number | null>(null);
  
  useEffect(() => {
    if (chainId && (chainId === 10143 || chainId === 11155111)) {
      setDisplayChainId(chainId);
    } else {
      const savedChainId = localStorage.getItem('selectedChainId');
      if (savedChainId) {
        setDisplayChainId(parseInt(savedChainId));
      } else {
        setDisplayChainId(11155111); // Default: Sepolia
        localStorage.setItem('selectedChainId', '11155111');
      }
    }
  }, [chainId]);

  const networks = [
    { id: 10143, name: 'Monad Testnet', icon: '/monad.svg' },
    { id: 11155111, name: 'Sepolia', icon: '/eth.svg' },
  ];

  const currentNetwork = networks.find(n => n.id === displayChainId) || networks[0];

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target as Node)) {
        setIsNetworkDropdownOpen(false);
      }
    };

    if (isWalletDropdownOpen || isNetworkDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWalletDropdownOpen, isNetworkDropdownOpen]);

  // Close alert when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (faucetTxHash && alertRef.current) {
        const target = event.target as HTMLElement;
        if (!alertRef.current.contains(target)) {
          setFaucetTxHash("");
        }
      }
    };

    if (faucetTxHash) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [faucetTxHash]);

  const handleSwitchChain = async (targetChainId: number) => {
    setIsNetworkDropdownOpen(false);
    
    // Save to localStorage for embedded wallet (Turnkey)
    localStorage.setItem('selectedChainId', targetChainId.toString());
    
    try {
      // Dùng window.ethereum cho External wallet (MetaMask)
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      } else {
        // Embedded wallet: reload page để apply chainId mới
        window.location.reload();
      }
    } catch (error: unknown) {
      // Nếu chain chưa có trong wallet (error 4902), tự động add
      const err = error as { code?: number };
      if (err?.code === 4902) {
        const chainConfigs: Record<number, {
          chainId: string;
          chainName: string;
          nativeCurrency: { name: string; symbol: string; decimals: number };
          rpcUrls: string[];
          blockExplorerUrls: string[];
        }> = {
          10143: {
            chainId: '0x279f',
            chainName: 'Monad Testnet',
            nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
            rpcUrls: ['https://testnet-rpc.monad.xyz'],
            blockExplorerUrls: ['https://testnet.monadexplorer.com']
          },
          11155111: {
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://ethereum-sepolia.publicnode.com'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }
        };
        
        try {
          await window.ethereum?.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfigs[targetChainId]],
          });
        } catch (addError) {
          console.error('Failed to add chain:', addError);
        }
      }
    }
  };

  const copyAddress = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      // Có thể thêm toast notification ở đây
    }
  };

  // Faucet function
  const handleFaucet = async () => {
    if (!isConnected || !displayChainId || !address) {
      alert("Please connect wallet and select a supported network!");
      return;
    }

    setIsFauceting(true);
    try {
      const testTokenAddress = getTestTokenAddress(displayChainId);
      if (!testTokenAddress) {
        throw new Error("TestToken not deployed on this network");
      }

      const provider = window.ethereum;
      const chain = displayChainId === 11155111 ? sepolia : monadTestnet;

      // Check if external wallet or embedded wallet
      const isExternalWallet = !!(provider && (await provider.request({ method: "eth_accounts" }) as string[]).length > 0);

      let hash: string;

      if (isExternalWallet && provider) {
        // External wallet (MetaMask) - use window.ethereum
        const walletClient = createWalletClient({
          account: address as `0x${string}`,
          chain,
          transport: custom(provider),
        });

        // Encode faucet function call
        const faucetData = encodeFunctionData({
          abi: ABIs.TestToken,
          functionName: "faucet",
          args: [],
        });

        // Send transaction
        hash = await walletClient.sendTransaction({
          to: testTokenAddress as `0x${string}`,
          data: faucetData,
          value: BigInt(0),
        });
      } else {
        // Embedded wallet (Turnkey) - use TurnkeySigner
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Check if user has passkey
        if (user.authenticators && user.authenticators.length === 0) {
          throw new Error("⚠️ No passkey registered. Please add a passkey first from the wallet dropdown.");
        }

        const storageKey = `turnkey_suborg_${user.userId}`;
        const savedOrgId = localStorage.getItem(storageKey);
        
        if (!savedOrgId) {
          throw new Error('Organization ID not found. Please logout and login again.');
        }

        // Import required modules
        const { Turnkey } = await import("@turnkey/sdk-browser");
        const { TurnkeySigner } = await import("@turnkey/ethers");
        const { ethers } = await import("ethers");

        const turnkeyClient = new Turnkey({
          apiBaseUrl: "https://api.turnkey.com",
          defaultOrganizationId: savedOrgId,
        });

        const rpcProvider = new ethers.JsonRpcProvider(
          displayChainId === 11155111 
            ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com'
            : process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'
        );

        const passkeyClient = turnkeyClient.passkeyClient();
        const turnkeySigner = new TurnkeySigner({
          client: passkeyClient,
          organizationId: savedOrgId,
          signWith: address,
        });

        const connectedSigner = turnkeySigner.connect(rpcProvider);

        // Get contract interface
        const contract = new ethers.Contract(testTokenAddress, ABIs.TestToken, connectedSigner);

        // Call faucet function
        const tx = await contract.faucet();
        hash = tx.hash;
        
        // Wait for confirmation
        await tx.wait();
      }

      setFaucetTxHash(hash);
    } catch (error: unknown) {
      console.error("Faucet error:", error);
      alert(`Faucet failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFauceting(false);
    }
  };

  return (
    <header className="w-full bg-primary-background border-b border-gray-700 shadow-xl">
      <div className="max-w-[90%] mx-auto py-5 px-8 flex items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="text-black font-bold text-[32px] tracking-tight leading-none">
            MetaSwap
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex gap-4 ml-8">
          <Link 
            href="/"
            className={`h-10 text-[16px] transition-all duration-200 font-semibold px-4 flex items-center justify-center rounded-xl focus:outline-none shadow-md border ${
              pathname === '/' 
                ? 'text-white bg-button-primary border-button-primary/20' 
                : 'text-gray-800 bg-white/90 border-gray-300 hover:bg-white hover:border-gray-400'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/swap"
            className={`h-10 text-[16px] transition-all duration-200 font-semibold px-4 flex items-center justify-center rounded-xl focus:outline-none shadow-md border ${
              pathname === '/swap' 
                ? 'text-white bg-button-primary border-button-primary/20' 
                : 'text-gray-800 bg-white/90 border-gray-300 hover:bg-white hover:border-gray-400'
            }`}
          >
            Swap
          </Link>
        </nav>

        {/* Right Section */}
        <div className="ml-auto flex items-center gap-4">
          {isConnected && (
            <div className="relative" ref={networkDropdownRef}>
              <button
                onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                className="h-10 w-[185px] px-[10px] text-[16px] bg-white/90 backdrop-blur-sm border border-gray-300 rounded-xl text-gray-800 hover:bg-white hover:border-gray-400 transition-all duration-200 shadow-md flex items-center gap-2"
              >
                <Image 
                  src={currentNetwork.icon} 
                  alt={currentNetwork.name} 
                  width={20} 
                  height={20}
                  className="w-5 h-5"
                />
                <span>{currentNetwork.name}</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isNetworkDropdownOpen && (
                <div className="absolute right-0 mt-2 w-full bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-300 overflow-hidden z-50">
                  {networks.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => handleSwitchChain(network.id)}
                      className={`w-full h-10 px-4 text-[16px] flex items-center gap-3 hover:bg-gray-100 transition-colors ${
                        network.id === displayChainId ? 'bg-gray-100' : ''
                      }`}
                    >
                      <Image 
                        src={network.icon} 
                        alt={network.name} 
                        width={20} 
                        height={20}
                        className="w-5 h-5"
                      />
                      <span className="text-gray-800">{network.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={handleFaucet}
            disabled={isFauceting}
            className={`h-10 text-[16px] transition-all duration-200 font-semibold px-4 flex items-center justify-center rounded-xl focus:outline-none shadow-md border ${
              isFauceting
                ? 'bg-button-inactive text-gray-800 cursor-not-allowed'
                : 'text-white bg-button-primary border-button-primary/20 hover:opacity-90'
            }`}
          >
            {isFauceting ? "Minting..." : "Faucet"}
          </button>
          
          {!isConnected ? (
            <button
              onClick={() => handleLogin()}
              className="h-10 px-6 text-[16px] bg-button-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200 shadow-md flex items-center justify-center border border-button-primary/20"
            >
              Connect Wallet
            </button>
          ) : displayAddress ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                className="h-10 px-4 text-[16px] bg-button-primary text-white rounded-xl hover:opacity-90 transition-all duration-200 shadow-md flex items-center justify-center border border-button-primary/20"
              >
                <span className="font-mono text-sm font-bold">{formatAddress(displayAddress)}</span>
              </button>
              
              {isWalletDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[180px] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-300 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] text-gray-800 font-mono">{formatAddress(displayAddress)}</span>
                      <button
                        onClick={copyAddress}
                        className="p-1 hover:bg-gray-200 rounded transition-colors duration-200"
                        title="Copy"
                      >
                        <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="px-1.5 py-1.5">
                    <button
                      onClick={() => {
                        logout();
                        setIsWalletDropdownOpen(false);
                      }}
                      className="w-full h-8 px-4 text-[16px] bg-red-500/90 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center border border-red-500/20"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => logout()}
              className="h-10 px-6 text-[16px] bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-all duration-200 shadow-md flex items-center justify-center border border-red-500/20"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
      
      {/* Faucet Success Alert */}
      {faucetTxHash && (
        <div ref={alertRef} className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-96">
          <div className="p-3 bg-green-900/20 border border-green-500 rounded text-center">
            <p className="text-[16px] text-black">Faucet successful!</p>
            <a
              href={`${getExplorerUrl(displayChainId)}/tx/${faucetTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-700 underline mt-2 inline-block"
            >
              View Transaction →
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
