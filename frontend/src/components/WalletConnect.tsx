"use client";

import { useTurnkey, WalletSource } from "@turnkey/react-wallet-kit";
import { useEffect, useState } from "react";

export default function WalletConnect() {
  const {
    user,
    wallets,
    walletProviders,
    handleLogin,
    logout,
    connectWalletAccount,
    createWallet,
    handleAddPasskey,
    session,
  } = useTurnkey();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleConnect = async () => {
    try {
      await handleLogin();
    } catch (error) {
      // Show user-friendly error
      if (error instanceof Error && error.message?.includes("passkey")) {
        alert("Passkey login failed. Please try with Email or Google instead.");
      }
    }
  };

  // Xử lý sau khi user authenticate thành công
  useEffect(() => {
    const handlePostAuth = async () => {
      if (!user || isProcessing) return;

      // Đã có wallet rồi → Lưu Organization ID nếu chưa có
      if (wallets && wallets.length > 0) {
        const storageKey = `turnkey_suborg_${user.userId}`;
        const existingOrgId = localStorage.getItem(storageKey);
        
        if (!existingOrgId) {
          // Lấy organizationId từ session hoặc wallet.accounts[0]
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
        // Check auth method: Nếu user có authenticators (passkey/email) → embedded wallet
        // Chỉ dùng external wallet khi explicitly login qua wallet auth
        const hasAuthenticators = user.authenticators && user.authenticators.length > 0;
        const hasEmailOrOAuth = user.userEmail || user.oauthProviders?.length > 0;
        
        // Nếu có authenticators hoặc email/oauth → tạo embedded wallet
        if (hasAuthenticators || hasEmailOrOAuth) {
          // Tạo wallet nếu chưa có
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
            
            // Lưu organizationId từ wallet creation
            const walletOrgId = (walletResult as unknown as Record<string, unknown> | null)?.accounts as Array<{ organizationId?: string }> | undefined;
            const sessionOrgId = (session as Record<string, unknown> | null)?.organizationId as string | undefined;
            const orgId = walletOrgId?.[0]?.organizationId || sessionOrgId;
            
            if (orgId) {
              const storageKey = `turnkey_suborg_${user.userId}`;
              localStorage.setItem(storageKey, orgId);
            }
          }
        } else {
          // Wallet auth → connect external wallet
          const connectedProvider = walletProviders.find(
            (p) => p.connectedAddresses && p.connectedAddresses.length > 0
          );
          
          if (connectedProvider) {
            await connectWalletAccount(connectedProvider);
          }
        }
      } catch {
        // Silent error handling
      } finally {
        setIsProcessing(false);
      }
    };

    handlePostAuth();
  }, [user, wallets, walletProviders, isProcessing, connectWalletAccount, createWallet, session]);

  // Lấy wallet info để hiển thị
  const wallet = wallets?.[0];
  const walletAddress = wallet?.accounts?.[0]?.address;
  const isExternalWallet = wallet?.source === WalletSource.Connected;
  const walletType = isExternalWallet ? "External Wallet" : "Embedded Wallet";

  const isConnected = user && wallets?.length > 0;

  // Nếu chưa connect → hiển thị nút Connect
  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        className="h-10 px-6 text-[16px] bg-button-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-200 shadow-md flex items-center justify-center border border-button-primary/20"
        disabled={isProcessing}
      >
        {isProcessing ? "Processing..." : "Connect Turnkey"}
      </button>
    );
  }

  // Đã connect → hiển thị dropdown
  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          {walletType === "External Wallet" ? "🦊" : "🔐"}
        </div>
        <div className="text-left">
          <p className="text-white text-sm font-medium">
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connected"}
          </p>
          <p className="text-gray-400 text-xs">{walletType}</p>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-xl z-20 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">Manage Account</h3>
            </div>

            {/* User Info */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">User name</p>
                <p className="text-white font-mono text-sm">
                  {user?.userEmail 
                    ? user.userEmail 
                    : user?.userId 
                      ? `${user.userId.slice(0, 8)}...${user.userId.slice(-8)}`
                      : 'Unknown'
                  }
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-1">Wallet Type</p>
                <div className="flex items-center gap-2">
                  {walletType === "External Wallet" ? (
                    <span className="text-purple-400 text-sm">🦊 External Wallet</span>
                  ) : (
                    <span className="text-blue-400 text-sm">🔐 Embedded Wallet</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-xs mb-1">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-white text-sm flex-1">
                    {walletAddress 
                      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                      : 'No address'
                    }
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(walletAddress || '')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Passkeys info */}
              {user && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">
                    Passkeys ({user.authenticators?.length || 0})
                  </p>
                  {user.authenticators && user.authenticators.length > 0 ? (
                    <div className="space-y-1">
                      {user.authenticators.slice(0, 3).map((auth, index) => (
                        <p key={index} className="text-gray-300 text-xs">
                          • Passkey {index + 1}
                        </p>
                      ))}
                      {user.authenticators.length > 3 && (
                        <p className="text-gray-400 text-xs">
                          +{user.authenticators.length - 3} more...
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-400 text-xs">
                      ⚠️ No passkey registered - Cannot sign transactions!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-700 space-y-2">
              {/* Add Passkey button - luôn show cho embedded wallet */}
              {user && !isExternalWallet && (
                <button
                  onClick={async () => {
                    try {
                      await handleAddPasskey();
                      alert("✅ Passkey registered to Turnkey backend! Now you can sign transactions.");
                      // Refresh page để update user.authenticators
                      window.location.reload();
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      alert("❌ Failed to add passkey: " + errorMessage);
                    }
                  }}
                  className="w-full px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg font-medium transition-colors text-sm"
                >
                  ➕ {user.authenticators?.length > 0 ? 'Re-register' : 'Add'} Passkey for Signing
                </button>
              )}
              
              <button
                onClick={() => logout()}
                className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium transition-colors text-sm"
              >
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

