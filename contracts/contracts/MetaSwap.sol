// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title MockSwap - Simple Swap Contract for testing MetaMask Smart Account
/// @notice 1 ETH = 1000 mUSD, and 1000 mUSD = 1 ETH
contract MetakSwap {
    IERC20 public token;
    uint256 public constant ETH_TO_TOKEN_RATE = 1000; // 1 ETH = 1000 mUSD
    uint256 public constant TOKEN_TO_ETH_RATE = 1e15; // 1000 mUSD = 1 ETH (1e18 / 1000)

    event SwapETHForToken(address indexed user, uint256 ethIn, uint256 tokenOut);
    event SwapTokenForETH(address indexed user, uint256 tokenIn, uint256 ethOut);
    event DepositETH(address indexed user, uint256 amount);
    event DepositToken(address indexed user, uint256 amount);

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    /// @notice Swap ETH → mUSD
    function swapETHToToken() external payable {
        require(msg.value > 0, "Must send ETH");
        uint256 tokenAmount = msg.value * ETH_TO_TOKEN_RATE;
        uint256 contractBalance = token.balanceOf(address(this));
        require(contractBalance >= tokenAmount, "Not enough tokens in contract");

        token.transfer(msg.sender, tokenAmount);
        emit SwapETHForToken(msg.sender, msg.value, tokenAmount);
    }

    /// @notice Swap mUSD → ETH
    function swapTokenToETH(uint256 tokenAmount) external {
        require(tokenAmount > 0, "Must send tokens");

        uint256 ethAmount = (tokenAmount * TOKEN_TO_ETH_RATE) / 1e18;
        require(address(this).balance >= ethAmount, "Not enough ETH in contract");

        // User must approve MockSwap to spend token before calling this
        bool success = token.transferFrom(msg.sender, address(this), tokenAmount);
        require(success, "Token transfer failed");

        (bool sent, ) = payable(msg.sender).call{value: ethAmount}("");
        require(sent, "ETH transfer failed");

        emit SwapTokenForETH(msg.sender, tokenAmount, ethAmount);
    }

    /// @notice Deposit ETH into the pool (for testing Token→ETH swaps)
    function depositETH() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        emit DepositETH(msg.sender, msg.value);
    }

    /// @notice Deposit mUSD tokens into the pool (for testing ETH→Token swaps)
    function depositToken(uint256 amount) external {
        require(amount > 0, "Must deposit some tokens");
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");
        emit DepositToken(msg.sender, amount);
    }

    /// @notice View how many mUSD user would receive for X ETH
    function getQuoteETHToToken(uint256 ethAmount) external pure returns (uint256) {
        return ethAmount * ETH_TO_TOKEN_RATE;
    }

    /// @notice View how many ETH user would receive for X mUSD
    function getQuoteTokenToETH(uint256 tokenAmount) external pure returns (uint256) {
        return (tokenAmount * TOKEN_TO_ETH_RATE) / 1e18;
    }

    /// @dev Allow contract to receive ETH
    receive() external payable {}
}
