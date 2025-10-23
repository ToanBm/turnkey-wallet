// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MonadUSD Faucet Token (mUSD)
/// @notice ERC20 token faucet for testing — each address can claim once
contract MonadUSD is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1000 * 1e18; // 1000 mUSD per claim
    mapping(address => bool) public claimed;

    constructor() ERC20("MonadUSD", "mUSD") {
        // Optional: mint initial supply to deployer for liquidity/testing
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    /// @notice Allow each address to claim mUSD once
    function faucet() external {
        require(!claimed[msg.sender], "Already claimed");
        claimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
