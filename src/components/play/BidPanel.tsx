"use client";

import { useState } from "react";
import type { Round } from "@/types/game";
import { useBids } from "@/hooks/useBids";
import { formatMoney } from "@/lib/utils/format-money";

interface BidPanelProps {
  round: Round;
  code: string;
  balance: number;
  participantId: string;
}

export function BidPanel({ round, code, balance, participantId }: BidPanelProps) {
  const { bids, highestBid } = useBids(round.id);
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const minimumBid = highestBid ? highestBid.amount + 1 : 1;
  const isHighestBidder = highestBid?.participant_id === participantId;

  async function handleBid(amount: number) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/sessions/${code}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setBidAmount("");
    } catch {
      setError("Failed to place bid");
    } finally {
      setLoading(false);
    }
  }

  const quickBids = [
    minimumBid,
    Math.ceil(minimumBid * 1.5),
    minimumBid * 2,
    Math.min(balance, minimumBid * 5),
  ].filter((v, i, arr) => v <= balance && arr.indexOf(v) === i);

  return (
    <div className="flex flex-col gap-4">
      {/* Bag display */}
      <div className="rounded-xl border-2 border-bid-red bg-bid-red/10 p-4 text-center">
        <div className="mb-1 text-xs font-bold text-bid-red uppercase tracking-wider animate-pulse">
          Live Auction
        </div>
        <h2 className="text-3xl font-black text-white">
          Bag #{round.round_number}
        </h2>
      </div>

      {/* Current highest bid */}
      <div className="rounded-xl bg-game-surface border-2 border-game-border p-4 text-center">
        <div className="text-xs text-gray-500">Current Highest Bid</div>
        <div className="text-4xl font-black text-gold">
          {highestBid ? formatMoney(highestBid.amount) : "$0"}
        </div>
        {highestBid && (
          <div className={`mt-1 text-sm ${isHighestBidder ? "text-bid-green font-bold" : "text-gray-400"}`}>
            {isHighestBidder ? "You are the highest bidder!" : `by ${highestBid.participantName}`}
          </div>
        )}
      </div>

      {/* Bid input */}
      {!isHighestBidder && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {quickBids.map((amount) => (
              <button
                key={amount}
                onClick={() => handleBid(amount)}
                disabled={loading || amount > balance}
                className="rounded-lg bg-game-accent px-4 py-2 font-bold transition-all hover:bg-game-accent-light disabled:opacity-30 active:scale-95"
              >
                {formatMoney(amount)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold font-bold">$</span>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Min ${formatMoney(minimumBid)}`}
                min={minimumBid}
                max={balance}
                className="w-full rounded-xl border-2 border-game-border bg-game-surface px-3 py-3 pl-8 text-white placeholder-gray-600 outline-none focus:border-game-accent"
              />
            </div>
            <button
              onClick={() => {
                const amount = parseInt(bidAmount);
                if (amount >= minimumBid) handleBid(amount);
              }}
              disabled={loading || !bidAmount || parseInt(bidAmount) < minimumBid}
              className="rounded-xl bg-gold px-6 py-3 font-black text-game-bg transition-all hover:brightness-110 disabled:opacity-30 active:scale-95"
            >
              BID
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-bid-red">{error}</p>
      )}

      {/* Recent bids */}
      {bids.length > 0 && (
        <div className="rounded-xl border border-game-border bg-game-surface p-3">
          <div className="text-xs text-gray-500 mb-2">Recent Bids</div>
          {bids.slice(0, 5).map((bid) => (
            <div key={bid.id} className="flex justify-between py-1 text-sm">
              <span className={bid.participant_id === participantId ? "text-game-accent font-bold" : "text-gray-400"}>
                {bid.participant_id === participantId ? "You" : bid.participantName}
              </span>
              <span className="text-gold font-bold">{formatMoney(bid.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
