"use client";

import { use, useCallback, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useParticipant } from "@/hooks/useParticipant";
import { usePresence } from "@/hooks/usePresence";
import { BalanceDisplay } from "@/components/play/BalanceDisplay";
import { BidPanel } from "@/components/play/BidPanel";

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { participant, loading: loadingParticipant } = useParticipant(code);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  const showNotification = useCallback((type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const onRoundSold = useCallback(
    (payload: { winnerName: string; finalPrice: number; winnerId: string }) => {
      if (participant && payload.winnerId === participant.id) {
        showNotification("win", `You won the bag for $${payload.finalPrice.toLocaleString()}!`);
      } else {
        showNotification("info", `Sold to ${payload.winnerName} for $${payload.finalPrice.toLocaleString()}`);
      }
    },
    [participant, showNotification]
  );

  const onRoundSkip = useCallback(() => {
    showNotification("info", "Bag was skipped");
  }, [showNotification]);

  const onSessionEnd = useCallback(() => {
    showNotification("info", "Game has ended!");
  }, [showNotification]);

  const {
    session,
    rounds,
    activeRound,
    loading: loadingSession,
  } = useSession({
    code,
    onRoundSold,
    onRoundSkip,
    onSessionEnd,
  });

  usePresence(code, participant?.id, participant?.name);

  if (loadingSession || loadingParticipant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-game-bg">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  if (!session || !participant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-game-bg gap-4">
        <div className="text-bid-red">Could not join this game session.</div>
        <a href="/join" className="text-game-accent underline">Try joining again</a>
      </main>
    );
  }

  if (session.status === "completed") {
    const wonRounds = rounds.filter((r) => r.sold_to === participant.id);
    const totalSpent = wonRounds.reduce((sum, r) => sum + (r.sold_price || 0), 0);

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-game-bg p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-2 text-4xl font-black text-gold">Game Over</h1>
          <p className="mb-1 text-gray-400">Thanks for playing, {participant.name}!</p>
          <p className="mb-6 text-sm text-gray-600">{session.session_name}</p>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-game-surface border border-game-border p-4">
              <div className="text-xs text-gray-500">Bags Won</div>
              <div className="text-2xl font-black text-bid-green">{wonRounds.length}</div>
            </div>
            <div className="rounded-xl bg-game-surface border border-game-border p-4">
              <div className="text-xs text-gray-500">Total Spent</div>
              <div className="text-2xl font-black text-gold">${totalSpent.toLocaleString()}</div>
            </div>
          </div>

          <a
            href="/"
            className="mt-6 inline-block rounded-xl bg-game-accent px-6 py-3 font-bold transition-all hover:bg-game-accent-light"
          >
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-game-bg p-4">
      <div className="mx-auto max-w-sm">
        {notification && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-6 py-3 font-bold shadow-lg ${
              notification.type === "win"
                ? "bg-bid-green text-white"
                : "bg-game-surface border border-game-border text-white"
            }`}
            style={{ animation: "slide-up 0.3s ease-out" }}
          >
            {notification.message}
          </div>
        )}

        <div className="mb-4 text-center">
          <h1 className="text-xl font-black text-gold">BidWars</h1>
          <p className="text-sm text-gray-400">{session.session_name}</p>
        </div>

        <div className="mb-4">
          <BalanceDisplay balance={participant.balance} name={participant.name} />
        </div>

        {activeRound ? (
          <BidPanel
            round={activeRound}
            code={code}
            balance={participant.balance}
            participantId={participant.id}
          />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-game-border p-12 text-center">
            <div className="text-4xl mb-3">&#x23F3;</div>
            <div className="text-gray-500">
              {session.status === "lobby"
                ? "Waiting for the admin to start..."
                : "Waiting for next bag..."}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
