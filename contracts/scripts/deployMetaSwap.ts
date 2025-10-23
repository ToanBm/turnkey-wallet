import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying MetaSwap contract...");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`📍 Network: ${network.name} (Chain ID: ${chainId})`);

  // Read token address from deployments
  const tokenPath = path.join(__dirname, "../deployments/testToken.json");
  let tokenAddress: string;
  
  if (fs.existsSync(tokenPath)) {
    try {
      const tokenData = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
      tokenAddress = tokenData[chainId.toString()]?.address;
      
      if (!tokenAddress) {
        console.error(`❌ No token address found for chain ID ${chainId} in testToken.json`);
        console.log("💡 Please deploy TestToken first using: npx hardhat run scripts/deployTestToken.ts");
        process.exitCode = 1;
        return;
      }
      
      console.log(`🔗 Using TestToken address: ${tokenAddress}`);
    } catch (err) {
      console.error("❌ Could not read testToken.json:", err);
      process.exitCode = 1;
      return;
    }
  } else {
    console.error("❌ testToken.json not found");
    console.log("💡 Please deploy TestToken first using: npx hardhat run scripts/deployTestToken.ts");
    process.exitCode = 1;
    return;
  }

  // Get the contract factory
  const MetaSwap = await ethers.getContractFactory("MetakSwap");

  // Deploy the contract with token address
  const metaSwap = await MetaSwap.deploy(tokenAddress);

  // Wait for deployment to be mined
  await metaSwap.waitForDeployment();

  const metaSwapAddress = await metaSwap.getAddress();
  console.log("✅ MetaSwap deployed to:", metaSwapAddress);

  // Save to deployments directory
  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });
  
  // Read existing deployments
  const metaSwapPath = path.join(outDir, "metaSwap.json");
  let existingData: any = {};
  
  if (fs.existsSync(metaSwapPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(metaSwapPath, "utf-8"));
    } catch (err) {
      console.log("⚠️ Could not read existing metaSwap.json, creating new file");
    }
  }
  
  // Update with new deployment for this chain
  existingData[chainId.toString()] = {
    chainId: chainId,
    chainName: network.name,
    address: metaSwapAddress,
    deployedAt: new Date().toISOString(),
    contractName: "MetakSwap",
    tokenAddress: tokenAddress,
    ethToTokenRate: "1000", // 1 ETH = 1000 mUSD
    tokenToEthRate: "1000000000000000" // 1000 mUSD = 1 ETH (1e15)
  };
  
  // Save ABI separately (shared across all networks)
  existingData.abi = (await hre.artifacts.readArtifact("MetakSwap")).abi;
  
  fs.writeFileSync(
    metaSwapPath,
    JSON.stringify(existingData, null, 2)
  );

  console.log(`📝 Deployment info saved to deployments/metaSwap.json (Chain ID: ${chainId})`);
  console.log("🔗 Copy this address to your frontend config:", metaSwapAddress);
  
  // 7️⃣ Nạp mUSD vào MetaSwap ngay sau deploy
  console.log("\n🪙 Nạp thanh khoản mUSD vào MetaSwap...");
  const signer = (await ethers.getSigners())[0];
  const testToken = await ethers.getContractAt("MonadUSD", tokenAddress);
  
  // Approve MetaSwap để spend mUSD từ deployer
  const tokenDepositAmount = ethers.parseEther("10000"); // 10000 mUSD
  console.log(`   Approving ${ethers.formatEther(tokenDepositAmount)} mUSD...`);
  
  const txApprove = await testToken.approve(metaSwapAddress, tokenDepositAmount);
  const receiptApprove = await txApprove.wait();
  console.log(`   ✅ Approved MetaSwap to spend ${ethers.formatEther(tokenDepositAmount)} mUSD`);
  console.log(`      TX: ${receiptApprove?.hash}`);
  
  // Deposit tokens vào MetaSwap
  const txDepositToken = await metaSwap.depositToken(tokenDepositAmount);
  const receiptDepositToken = await txDepositToken.wait();
  console.log(`   ✅ Deposited ${ethers.formatEther(tokenDepositAmount)} mUSD vào MetaSwap`);
  console.log(`      TX: ${receiptDepositToken?.hash}\n`);

  // Display final status
  const finalTokenBalance = await testToken.balanceOf(metaSwapAddress);
  console.log("📋 MetaSwap Information:");
  console.log("Exchange Rate: 1 ETH = 1000 mUSD");
  console.log("Exchange Rate: 1000 mUSD = 1 ETH");
  console.log(`Token Address: ${tokenAddress}`);
  console.log(`mUSD Balance: ${ethers.formatEther(finalTokenBalance)} mUSD`);
  console.log("\n🎉 MetaSwap deployed và nạp thanh khoản hoàn tất!");
  console.log("💡 Users có thể swap ETH → mUSD ngay bây giờ!");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
