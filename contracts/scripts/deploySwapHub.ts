import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying SwapHub contract...");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`📍 Network: ${network.name} (Chain ID: ${chainId})`);

  // Get contract factory
  const SwapHub = await ethers.getContractFactory("SwapHub");

  // Deploy the contract (no constructor params)
  const swapHub = await SwapHub.deploy();

  // Wait for deployment
  await swapHub.waitForDeployment();

  const swapHubAddress = await swapHub.getAddress();
  console.log("✅ SwapHub deployed to:", swapHubAddress);

  // Prepare deployments folder
  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const deployPath = path.join(outDir, "swapHub.json");

  // Read existing deployment file
  let existingData: any = {};
  if (fs.existsSync(deployPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(deployPath, "utf-8"));
    } catch {
      console.log("⚠️ Could not parse existing swapHub.json, creating new file");
    }
  }

  // Update or insert current network deployment
  existingData[chainId.toString()] = {
    chainId,
    chainName: network.name,
    address: swapHubAddress,
    deployedAt: new Date().toISOString(),
    contractName: "SwapHub",
  };

  // Save ABI (shared across networks)
  const artifact = await hre.artifacts.readArtifact("SwapHub");
  existingData.abi = artifact.abi;

  fs.writeFileSync(deployPath, JSON.stringify(existingData, null, 2));
  console.log(`📝 Deployment info saved to deployments/swapHub.json`);
  console.log(`🔗 SwapHub Address: ${swapHubAddress}`);
  console.log("💡 Use this address in your Envio config.yaml for event tracking.");

  // Optional check: read owner
  const owner = await swapHub.owner();
  console.log(`👑 Owner: ${owner}`);
  console.log("\n🎉 SwapHub deployed successfully and ready for Envio indexing!");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
