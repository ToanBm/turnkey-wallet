import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying TestToken (MonadUSD) contract...");

  // Get the contract factory
  const TestToken = await ethers.getContractFactory("MonadUSD");

  // Deploy the contract
  const testToken = await TestToken.deploy();

  // Wait for deployment to be mined
  await testToken.waitForDeployment();

  const tokenAddress = await testToken.getAddress();
  console.log("✅ TestToken (MonadUSD) deployed to:", tokenAddress);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log(`📍 Network: ${network.name} (Chain ID: ${chainId})`);

  // Save to deployments directory
  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });
  
  // Read existing deployments
  const tokenPath = path.join(outDir, "testToken.json");
  let existingData: any = {};
  
  if (fs.existsSync(tokenPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
    } catch (err) {
      console.log("⚠️ Could not read existing testToken.json, creating new file");
    }
  }
  
  // Update with new deployment for this chain
  existingData[chainId.toString()] = {
    chainId: chainId,
    chainName: network.name,
    address: tokenAddress,
    deployedAt: new Date().toISOString(),
    contractName: "MonadUSD",
    tokenName: "MonadUSD",
    tokenSymbol: "mUSD",
    faucetAmount: "1000000000000000000000", // 1000 * 1e18
    initialSupply: "1000000000000000000000000" // 1_000_000 * 1e18
  };
  
  // Save ABI separately (shared across all networks)
  existingData.abi = (await hre.artifacts.readArtifact("MonadUSD")).abi;
  
  fs.writeFileSync(
    tokenPath,
    JSON.stringify(existingData, null, 2)
  );

  console.log(`📝 Deployment info saved to deployments/testToken.json (Chain ID: ${chainId})`);
  console.log("🔗 Copy this address to your frontend config:", tokenAddress);
  
  // Display token info
  console.log("\n📋 Token Information:");
  console.log("Name: MonadUSD (mUSD)");
  console.log("Faucet Amount: 1000 mUSD per claim");
  console.log("Initial Supply: 1,000,000 mUSD (minted to deployer)");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
