"use client";

import { TurnkeyWalletInfo } from "@/components/TurnkeyWalletInfo";

export default function DashboardPage() {
  return (
    <div className="max-w-[40%] mx-auto px-8">
      <div className="space-y-6">
        {/* Dashboard Layout */}
        <div className="space-y-6">
          {/* Turnkey Wallet Management */}
          <TurnkeyWalletInfo />
        </div>
      </div>
    </div>
  );
}