// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SwapHub - Event relay contract for tracking MetaMask Smart Account swap actions
/// @notice Used only for Envio indexing, mirrors MetakSwap events
contract SwapHub {
    address public owner;

    // ===================== EVENTS =====================
    event SwapETHForToken(
        address indexed user,
        uint256 ethIn,
        uint256 tokenOut,
        uint256 timestamp
    );

    event SwapTokenForETH(
        address indexed user,
        uint256 tokenIn,
        uint256 ethOut,
        uint256 timestamp
    );

    event DepositETH(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event DepositToken(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    // ===================== MODIFIERS =====================
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }

    // ===================== RECORD FUNCTIONS =====================
    /// @notice Record ETH→Token swap event for Envio
    function recordSwapETHForToken(uint256 ethIn, uint256 tokenOut) external {
        emit SwapETHForToken(msg.sender, ethIn, tokenOut, block.timestamp);
    }

    /// @notice Record Token→ETH swap event for Envio
    function recordSwapTokenForETH(uint256 tokenIn, uint256 ethOut) external {
        emit SwapTokenForETH(msg.sender, tokenIn, ethOut, block.timestamp);
    }

    /// @notice Record deposit of ETH (pool funding)
    function recordDepositETH(uint256 amount) external {
        emit DepositETH(msg.sender, amount, block.timestamp);
    }

    /// @notice Record deposit of tokens (pool funding)
    function recordDepositToken(uint256 amount) external {
        emit DepositToken(msg.sender, amount, block.timestamp);
    }
}
