# MetaSwap - Multi-Auth Token Swapping Platform with Turnkey

## 📋 Table of Contents
- [MetaSwap Overview](#metaswap-overview)
- [Turnkey Wallet Integration](#-turnkey-wallet-integration)

---

## 🚀 MetaSwap Overview

MetaSwap is a cutting-edge DeFi platform that enables seamless token swapping with **multiple authentication methods** powered by Turnkey. Built with Next.js, wagmi, and Turnkey Wallet Kit, it provides a secure and user-friendly interface for Web3 interactions.

### ✨ Key Features
- **🔐 Multi-Auth Support**: Login with Email OTP, Passkey (WebAuthn), Google OAuth, or External Wallet
- **👛 Embedded Wallet**: Turnkey-powered non-custodial wallet with social login
- **🔑 Passkey Signing**: Secure transaction signing with WebAuthn
- **🌐 Multi-Chain Support**: Seamlessly switch between Sepolia and Monad testnets
- **💱 Token Swapping**: Swap between native tokens (ETH/MON) and mUSD (MonadUSD)
- **⚡ Gas Optimized**: EOA transactions with auto-estimate gas

### 🛠️ Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Wallet Auth**: Turnkey Wallet Kit, Turnkey SDK Browser
- **Blockchain**: wagmi, viem, ethers
- **Transaction Signing**: TurnkeySigner with Passkey support

### 📱 Pages
- **Wallet Dashboard**: Send tokens (ETH/MON/mUSD) from Turnkey wallet
- **Swap**: Execute token swaps with allowance optimization

---

## 🔐 Turnkey Wallet Integration

MetaSwap leverages **Turnkey's Wallet-as-a-Service** to provide seamless Web3 authentication and embedded wallet functionality.

### ✨ Authentication Methods

#### 1. **Email OTP** ✉️
- Sign in with email
- Receive one-time password via email
- Auto-create embedded wallet

#### 2. **Passkey (WebAuthn)** 🔑
- Biometric authentication (Face ID, Touch ID, Windows Hello)
- Hardware security key support
- **Required for transaction signing with embedded wallet**

#### 3. **Google OAuth** 🔵
- Sign in with Google account
- One-click authentication
- Auto-create embedded wallet

#### 4. **External Wallet** 🦊
- Connect MetaMask or other Web3 wallets
- Uses existing wallet for signing
- Full compatibility with external providers

---

### 🏗️ Architecture

```
User Login (Email/Passkey/Google/Wallet)
    ↓
Turnkey Authentication
    ↓
┌─────────────────────┬──────────────────────┐
│  Embedded Wallet    │  External Wallet     │
│  (Turnkey EOA)      │  (MetaMask)          │
│                     │                      │
│  - Auto-created     │  - User's existing   │
│  - Passkey signing  │  - MetaMask signing  │
│  - Multi-chain      │  - Multi-chain       │
└─────────────────────┴──────────────────────┘
    ↓
Transaction Execution
    ↓
Blockchain (Sepolia/Monad)
```

---

### 🔑 Passkey Management

**Important**: Embedded wallet users **must register a Passkey** to sign transactions.

**How to add Passkey:**
1. Connect with Email/Google
2. Click wallet dropdown (top-right)
3. Click "➕ Add Passkey for Signing"
4. Follow browser's passkey prompt
5. ✅ Now you can sign transactions!

**Security Features:**
- Private keys never leave Turnkey's secure enclave
- Passkey stored locally on your device
- Biometric authentication
- Hardware security key compatible

---

### 📝 Implementation Highlights

#### **1. Wallet Creation (Auto)**
```typescript
// Auto-create embedded wallet after email/OAuth login
await createWallet({
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
```

#### **2. Transaction Signing with Passkey**
```typescript
// TurnkeySigner with Passkey authentication
const turnkeySigner = new TurnkeySigner({
  client: passkeyClient,
  organizationId: savedOrgId,
  signWith: walletAddress,
});

// Sign transaction (triggers passkey prompt)
const tx = await connectedSigner.sendTransaction({...});
```

#### **3. Multi-Wallet Support**
```typescript
// Detect wallet type
const isExternalWallet = !!(window.ethereum && accounts.length > 0);

if (isExternalWallet) {
  // Use viem + window.ethereum
} else {
  // Use ethers + TurnkeySigner
}
```

#### **4. Allowance Optimization**
```typescript
// Check allowance before approving (saves gas!)
const currentAllowance = await tokenContract.allowance(user, spender);

if (currentAllowance < requiredAmount) {
  await tokenContract.approve(spender, requiredAmount);
}
```

---

### 🎯 Features Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| Email OTP Auth | ✅ | Login with email + OTP |
| Passkey Auth | ✅ | WebAuthn biometric signing |
| Google OAuth | ✅ | One-click Google login |
| External Wallet | ✅ | MetaMask integration |
| Auto Wallet Creation | ✅ | Embedded wallet on first login |
| Organization ID Persistence | ✅ | localStorage management |
| Passkey Registration | ✅ | Add/manage passkeys |
| Multi-Chain Support | ✅ | Sepolia + Monad testnets |
| Network Switching | ✅ | localStorage-based for embedded |
| Token Faucet | ✅ | Mint test tokens (mUSD) |
| Send Tokens | ✅ | Transfer ETH/MON/mUSD |
| Token Swaps | ✅ | Native ↔ ERC20 swaps |
| Allowance Check | ✅ | Optimize approve transactions |

---

### 🔄 Migration from Smart Account

**Before (MetaMask Smart Account):**
- ERC-4337 Account Abstraction
- Bundler-based transactions
- Batched UserOperations
- High gas costs (~400K-500K gas)
- Single wallet type only

**After (Turnkey EOA):**
- Standard EOA wallet
- Direct RPC transactions
- Sequential approvals (optimized)
- Low gas costs (~130K-150K gas) ⚡
- **4 authentication methods** 🎉

**Gas Savings:** ~60-70% reduction ✨

---

## 🚀 Getting Started

### 1. **Install Dependencies**
```bash
cd frontend
npm install
```

### 2. **Configure Environment Variables**

Create `.env.local` file in the `frontend` directory:

```bash
# Turnkey Configuration (Required)
NEXT_PUBLIC_ORGANIZATION_ID=your_turnkey_organization_id
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=your_turnkey_auth_proxy_config_id

# RPC URLs (Optional - defaults provided)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

**Get Turnkey Credentials:**
1. Sign up at [https://turnkey.com](https://turnkey.com)
2. Create a new organization
3. Create an Auth Proxy Configuration
4. Copy `ORGANIZATION_ID` and `AUTH_PROXY_CONFIG_ID`

### 3. **Run Development Server**
```bash
npm run dev
```

### 4. **Access the Application**
- Open [http://localhost:3000](http://localhost:3000)
- Click **"Connect Wallet"**
- Choose authentication method:
  - 📧 **Email OTP**: Enter email → verify code
  - 🔑 **Passkey**: Use biometric authentication
  - 🔵 **Google**: One-click OAuth
  - 🦊 **External**: Connect MetaMask
- **Add Passkey** (for embedded wallet):
  - Click wallet dropdown → "Add Passkey for Signing"
- Select network: Sepolia or Monad
- Start using the app!

### 5. **Test Features**

#### **A. Faucet (Get Test Tokens)**
- Click **"Faucet"** button in header
- Approve transaction
- Receive 1000 mUSD tokens

#### **B. Send Tokens**
- Go to **Wallet Dashboard** (main page)
- Select token: ETH/MON/mUSD
- Enter recipient address and amount
- Click **"Send"**
- Sign with Passkey (embedded) or MetaMask (external)

#### **C. Swap Tokens**
- Go to **Swap** page
- Enter amount to swap
- Review quote
- Click **"Swap"**
- First time: Approve + Swap (2 TXs)
- After: Only Swap (1 TX - allowance cached!)

---

## 📚 Smart Contracts

- **TestToken (MonadUSD)**: ERC-20 token with faucet functionality
- **MetaSwap**: Core swapping contract for ETH/MON ↔ mUSD

**Deployment Networks:**
- ✅ Sepolia Testnet (Chain ID: 11155111)
- ✅ Monad Testnet (Chain ID: 10143)

---

## 🌐 Supported Networks

| Network | Chain ID | Currency | Status |
|---------|----------|----------|--------|
| **Sepolia Testnet** | 11155111 | ETH | ✅ Active |
| **Monad Testnet** | 10143 | MON | ✅ Active |

**Network Switching:**
- **External Wallet**: Switch via MetaMask UI
- **Embedded Wallet**: Click network dropdown → select → page reloads

---

## 🔍 Troubleshooting

### **Issue: "Please select Sepolia or Monad network"**
**Solution:** 
- For **Embedded wallet**: Click network dropdown and select Sepolia or Monad
- For **External wallet**: Switch network in MetaMask

### **Issue: "No passkey registered - Cannot sign transactions"**
**Solution:**
1. Click wallet dropdown (top-right)
2. Click "➕ Add Passkey for Signing"
3. Follow browser's passkey prompt
4. ✅ Retry transaction

### **Issue: Swap requires 2 approvals every time**
**Solution:** This was fixed! Now:
- First swap: 1 approval + 1 swap = 2 TXs
- Subsequent swaps: Only 1 TX (allowance cached)

### **Issue: "Organization ID not found"**
**Solution:**
- Logout and login again
- The app will auto-save Organization ID on next login

---

## 💡 Technical Notes

### **Wallet Types**

**Embedded Wallet (Turnkey):**
- ✅ Non-custodial (you own the keys)
- ✅ Keys stored in Turnkey's secure enclave
- ✅ Login with email/social/passkey
- ✅ Works on all EVM chains
- ⚠️ Requires passkey for transaction signing

**External Wallet (MetaMask):**
- ✅ Your existing wallet
- ✅ Full control over keys
- ✅ Browser extension UI
- ✅ Works with all dApps

### **Gas Optimization**

- **Allowance check**: Skip unnecessary approvals
- **Auto-estimate**: Let provider estimate optimal gas
- **No bundler fees**: Direct RPC = lower costs
- **Result**: ~60-70% gas savings vs Smart Account

### **Security**

- 🔒 **Private keys never exposed**: Turnkey secure enclave
- 🔑 **Passkey authentication**: WebAuthn standard
- 🌐 **Non-custodial**: You control your assets
- ✅ **Audited**: Turnkey is SOC 2 Type II certified

---

## 📞 Resources

- **Turnkey Docs**: [https://docs.turnkey.com](https://docs.turnkey.com)
- **Turnkey Dashboard**: [https://app.turnkey.com](https://app.turnkey.com)
- **Sepolia Faucet**: [https://sepoliafaucet.com](https://sepoliafaucet.com)
- **Monad Docs**: [https://docs.monad.xyz](https://docs.monad.xyz)

---

## 📝 License

MIT License - feel free to use and modify as needed.

---

## 🙏 Acknowledgments

- **Turnkey** for providing wallet infrastructure
- **Monad** for testnet access
- **Sepolia** testnet community