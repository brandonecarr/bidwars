"use client";

import { use, useCallback, useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { useBids } from "@/hooks/useBids";
import { formatMoney } from "@/lib/utils/format-money";
import type { Participant } from "@/types/game";

interface SoldResult {
  winnerName: string;
  finalPrice: number;
  itemName: string;
}

export default function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [soldResult, setSoldResult] = useState<SoldResult | null>(null);

  const onItemSold = useCallback(
    (payload: { winnerName: string; finalPrice: number; itemId: string }) => {
      // We'll set the result and clear it after a few seconds
      setSoldResult({
        winnerName: payload.winnerName,
        finalPrice: payload.finalPrice,
        itemName: "", // Will be set from items
      });
    },
    []
  );

  const {
    session,
    participants,
    items,
    activeItem,
    loading,
  } = useSession({ code, onItemSold });

  const { bids, highestBid } = useBids(activeItem?.id || null);

  // Update sold result item name
  useEffect(() => {
    if (soldResult && !soldResult.itemName) {
      const soldItem = items.find((i) => i.status === "sold" && !soldResult.itemName);
      if (soldItem) {
        setSoldResult((prev) => prev ? { ...prev, itemName: soldItem.name } : null);
      }
      const timer = setTimeout(() => setSoldResult(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [soldResult, items]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-game-bg">
        <div className="text-gray-500">Loading display...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-game-bg">
        <div className="text-bid-red text-2xl">Session not found</div>
      </main>
    );
  }

  // Sort participants by balance (excluding admin)
  const leaderboard = [...participants]
    .filter((p) => !p.is_admin)
    .sort((a, b) => b.balance - a.balance);

  const isAnonymous = activeItem && activeItem.anon_mode !== "visible";
  const displayName = activeItem
    ? activeItem.anon_mode === "hidden"
      ? "Mystery Item"
      : activeItem.anon_mode === "partial"
        ? `Mystery Item (${activeItem.anon_hint || "???"})`
        : activeItem.name
    : null;

  // Game over screen
  if (session.status === "completed") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-game-bg p-8">
        <h1 className="mb-8 text-6xl font-black text-gold">Game Over!</h1>
        <div className="w-full max-w-lg">
          <Leaderboard participants={leaderboard} items={items} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-game-bg">
      {/* Sold announcement overlay */}
      {soldResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" style={{ animation: "slide-up 0.5s ease-out" }}>
          <div className="text-center">
            <div className="mb-4 text-2xl text-bid-green font-bold uppercase tracking-wider">Sold!</div>
            <div className="text-5xl font-black text-gold mb-4">
              {formatMoney(soldResult.finalPrice)}
            </div>
            <div className="text-3xl text-white font-bold">
              {soldResult.winnerName}
            </div>
          </div>
        </div>
      )}

      {/* Main display */}
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black text-gold tracking-tight md:text-7xl">
            BID<span className="text-white">WARS</span>
          </h1>
          <div className="mt-2 font-mono text-lg text-gray-600 tracking-[0.3em]">{code}</div>
        </div>

        {activeItem ? (
          <div className="w-full max-w-xl text-center">
            {/* Item name */}
            <div className={`mb-6 text-4xl font-black md:text-5xl ${isAnonymous ? "text-purple-400" : "text-white"}`}>
              {displayName}
            </div>

            {!isAnonymous && activeItem.description && (
              <p className="mb-6 text-xl text-gray-400">{activeItem.description}</p>
            )}

            {/* Current bid */}
            <div className="mb-8 rounded-2xl bg-game-surface border-2 border-game-border p-8">
              <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">
                Current Highest Bid
              </div>
              <div className="text-7xl font-black text-gold md:text-8xl">
                {highestBid ? formatMoney(highestBid.amount) : formatMoney(activeItem.starting_bid)}
              </div>
              {highestBid && (
                <div className="mt-3 text-2xl text-white font-bold">
                  {highestBid.participantName}
                </div>
              )}
            </div>

            {/* Bid feed */}
            <div className="flex flex-col gap-1">
              {bids.slice(0, 6).map((bid, i) => (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between rounded-lg px-4 py-2 ${
                    i === 0 ? "bg-gold/20 text-gold" : "text-gray-500"
                  }`}
                  style={{ animation: i === 0 ? "slide-up 0.3s ease-out" : undefined }}
                >
                  <span className="font-bold">{bid.participantName}</span>
                  <span className="font-black">{formatMoney(bid.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            {session.status === "lobby" ? (
              <>
                <div className="text-3xl text-gray-600 mb-4">
                  Join with code
                </div>
                <div className="font-mono text-6xl font-black text-gold tracking-[0.3em] md:text-8xl">
                  {code}
                </div>
                <div className="mt-8 text-xl text-gray-600">
                  {leaderboard.length} player{leaderboard.length !== 1 ? "s" : ""} joined
                </div>
              </>
            ) : (
              <div className="text-3xl text-gray-600">
                Waiting for next item...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar leaderboard */}
      {leaderboard.length > 0 && session.status !== "lobby" && (
        <div className="w-72 border-l-2 border-game-border bg-game-surface p-4 overflow-y-auto">
          <h3 className="mb-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Leaderboard
          </h3>
          {leaderboard.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 py-2 border-b border-game-border last:border-0">
              <span className={`w-6 text-center text-sm font-bold ${
                i === 0 ? "text-gold" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-gray-600"
              }`}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-white truncate">{p.name}</span>
              <span className="text-sm font-bold text-gold">{formatMoney(p.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Leaderboard({ participants, items }: { participants: Participant[]; items: { sold_to: string | null; sold_price: number | null; name: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {participants.map((p, i) => {
        const wonItems = items.filter((item) => item.sold_to === p.id);
        const totalSpent = wonItems.reduce((sum, item) => sum + (item.sold_price || 0), 0);

        return (
          <div
            key={p.id}
            className={`flex items-center gap-4 rounded-2xl p-4 ${
              i === 0
                ? "bg-gold/20 border-2 border-gold"
                : "bg-game-surface border-2 border-game-border"
            }`}
          >
            <span className={`text-3xl font-black ${
              i === 0 ? "text-gold" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-gray-600"
            }`}>
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="text-xl font-bold text-white">{p.name}</div>
              <div className="text-sm text-gray-500">
                {wonItems.length} item{wonItems.length !== 1 ? "s" : ""} won
                {totalSpent > 0 ? ` | ${formatMoney(totalSpent)} spent` : ""}
              </div>
            </div>
            <div className="text-2xl font-black text-gold">
              {formatMoney(p.balance)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
