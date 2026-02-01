"use client";

import { useState } from "react";
import type { Item } from "@/types/game";
import { useBids } from "@/hooks/useBids";
import { formatMoney } from "@/lib/utils/format-money";

interface AuctionControlsProps {
  item: Item;
  code: string;
}

export function AuctionControls({ item, code }: AuctionControlsProps) {
  const { bids, highestBid } = useBids(item.id);
  const [loading, setLoading] = useState("");

  async function handleAction(action: "sold" | "skip") {
    setLoading(action);
    try {
      await fetch(`/api/sessions/${code}/auction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemId: item.id }),
      });
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="rounded-xl border-2 border-bid-red bg-bid-red/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">
          Now Auctioning
        </h3>
        <span className="rounded-full bg-bid-red px-3 py-0.5 text-xs font-bold text-white animate-pulse">
          LIVE
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xl font-bold text-gold">{item.name}</p>
        {item.description && (
          <p className="mt-1 text-sm text-gray-400">{item.description}</p>
        )}
      </div>

      <div className="mb-4 rounded-lg bg-game-bg p-3">
        <div className="text-sm text-gray-500">Current Highest Bid</div>
        <div className="text-3xl font-black text-gold">
          {highestBid ? formatMoney(highestBid.amount) : formatMoney(item.starting_bid)}
        </div>
        {highestBid && (
          <div className="text-sm text-gray-400">
            by <span className="text-white font-bold">{highestBid.participantName}</span>
          </div>
        )}
      </div>

      <div className="mb-4 max-h-32 overflow-y-auto">
        <div className="text-xs text-gray-500 mb-1">
          {bids.length} bid{bids.length !== 1 ? "s" : ""} placed
        </div>
        {bids.slice(0, 5).map((bid) => (
          <div key={bid.id} className="flex justify-between text-sm py-0.5">
            <span className="text-gray-400">{bid.participantName}</span>
            <span className="text-gold font-bold">{formatMoney(bid.amount)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleAction("sold")}
          disabled={!!loading}
          className="flex-1 rounded-lg bg-bid-green px-4 py-3 text-lg font-black text-white transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading === "sold" ? "..." : "SOLD!"}
        </button>
        <button
          onClick={() => handleAction("skip")}
          disabled={!!loading}
          className="rounded-lg bg-gray-700 px-4 py-3 font-bold text-gray-300 transition-all hover:bg-gray-600 disabled:opacity-50"
        >
          {loading === "skip" ? "..." : "Skip"}
        </button>
      </div>
    </div>
  );
}
