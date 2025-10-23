"use client";

import { useState, useEffect } from "react";
import { getExplorerUrl } from "@/lib/utils";

type EventRecord = {
  user: string;
  ethIn?: string;
  tokenOut?: string;
  tokenIn?: string;
  ethOut?: string;
  amount?: string;
  timestamp: string;
};

export default function MetaTracking() {
  const [data, setData] = useState<{
    SwapETHForToken: EventRecord[];
    SwapTokenForETH: EventRecord[];
  }>({
    SwapETHForToken: [],
    SwapTokenForETH: [],
  });

  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Combine both swap types into one array
  const allSwaps = [
    ...data.SwapETHForToken.map(swap => ({ ...swap, type: 'ethToToken' as const })),
    ...data.SwapTokenForETH.map(swap => ({ ...swap, type: 'tokenToEth' as const }))
  ].sort((a, b) => Number(b.timestamp) - Number(a.timestamp)); // Sort by timestamp desc

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(allSwaps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSwaps = allSwaps.slice(startIndex, endIndex);

  // Get current chain ID (you might need to pass this as prop or get from context)
  useEffect(() => {
    // Try to get chain ID from window.ethereum
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_chainId' }).then((chainId: unknown) => {
        if (typeof chainId === 'string') {
          setCurrentChainId(parseInt(chainId, 16));
        }
      });
    }
  }, []);

  // Envio GraphQL endpoint
  const ENVIO_GRAPHQL_URL = "https://indexer.dev.hyperindex.xyz/9cb1975/v1/graphql";

  const QUERY = `
    query {
      SwapHub_SwapETHForToken(limit: 20, order_by: { timestamp: desc }) {
        user
        ethIn
        tokenOut
        timestamp
      }
      SwapHub_SwapTokenForETH(limit: 20, order_by: { timestamp: desc }) {
        user
        tokenIn
        ethOut
        timestamp
      }
    }
  `;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(ENVIO_GRAPHQL_URL, {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: QUERY })
        });

        const result = await res.json();
        const d = result.data;
        setData({
          SwapETHForToken: d?.SwapHub_SwapETHForToken || [],
          SwapTokenForETH: d?.SwapHub_SwapTokenForETH || [],
        });
      } catch (err: unknown) {
        console.error("GraphQL fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh mỗi 30 giây
    return () => clearInterval(interval);
  }, [QUERY]);

  if (loading)
    return (
      <div className="p-7 rounded-xl border border-gray-700 bg-secondary-background">
        <h3 className="text-[18px] font-bold mb-4 text-gray-800">
          Envio Tracker
        </h3>
        <div className="text-center py-8">
          <div className="text-gray-400 text-[16px]">Loading tracking data...</div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-7 rounded-xl border border-gray-700 bg-secondary-background">
        <h3 className="text-[18px] font-bold mb-4 text-gray-800">
          Envio Tracker
        </h3>
        <div className="p-3 bg-red-900/20 border border-red-500 rounded">
          <p className="text-[16px] text-red-500 font-semibold">Error:</p>
          <p className="text-[16px] text-red-400 mt-1">❌ {error}</p>
        </div>
      </div>
    );

  const formatTime = (t: string) => {
    const d = new Date(Number(t) * 1000);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };


  const formatETH = (amount: string) => {
    const num = Number(amount) / Math.pow(10, 18);
    return `${num.toFixed(4)} ETH`;
  };

  const formatToken = (amount: string) => {
    const num = Number(amount) / Math.pow(10, 18);
    return `${num.toFixed(2)} mUSD`;
  };

  const renderTransactions = () => (
    <div>
      {currentSwaps.length === 0 ? (
        <div className="text-gray-400 text-[16px] py-4 text-center">
          No swap events yet
        </div>
      ) : (
        currentSwaps.map((row, idx) => (
          <div key={idx} className="flex items-center justify-between h-10 px-3 border-b border-gray-300">
            <div className="flex items-center gap-3">
              <span className="text-green-600 font-semibold text-[16px]">✅</span>
              {currentChainId ? (
                <a
                  href={`${getExplorerUrl(currentChainId)}/address/${row.user}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-mono text-[16px] hover:underline"
                >
                  {formatAddress(row.user)}
                </a>
              ) : (
                <span className="text-gray-800 font-mono text-[16px]">
                  {formatAddress(row.user)}
                </span>
              )}
              <span className="text-gray-600 text-[16px]">Swap</span>
              {row.type === 'ethToToken' ? (
                <>
                  <span className="text-blue-600 font-semibold text-[16px]">
                    {formatETH(row.ethIn || "0")}
                  </span>
                  <span className="text-gray-600 text-[16px]">To</span>
                  <span className="text-green-600 font-semibold text-[16px]">
                    {formatToken(row.tokenOut || "0")}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-green-600 font-semibold text-[16px]">
                    {formatToken(row.tokenIn || "0")}
                  </span>
                  <span className="text-gray-600 text-[16px]">To</span>
                  <span className="text-blue-600 font-semibold text-[16px]">
                    {formatETH(row.ethOut || "0")}
                  </span>
                </>
              )}
            </div>
            <span className="text-gray-500 text-[16px]">
              {formatTime(row.timestamp)}
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="p-7 rounded-xl border border-gray-700 bg-secondary-background">
      <h3 className="text-[18px] font-bold mb-4 text-gray-800">
        Envio Tracker
      </h3>

      {renderTransactions()}

      {/* Pagination */}
      {allSwaps.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-3 pt-2">
          <div className="text-gray-600 text-[16px]">
            Showing {startIndex + 1}-{Math.min(endIndex, allSwaps.length)} of {allSwaps.length} transactions
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 text-[16px] font-semibold rounded-xl transition-colors ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-button-primary text-white hover:opacity-90'
              }`}
            >
              Previous
            </button>
            <span className="px-4 py-2 text-[16px] text-gray-800 font-semibold">
              {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 text-[16px] font-semibold rounded-xl transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-button-primary text-white hover:opacity-90'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
