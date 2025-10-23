"use client";

import { SwapComponent } from "@/components/SwapComponent";

export default function SwapPage() {
  return (
    <div className="max-w-[40%] mx-auto px-8">
      <div className="space-y-6">
        {/* MetaSwap */}
        <SwapComponent />
      </div>
    </div>
  );
}
