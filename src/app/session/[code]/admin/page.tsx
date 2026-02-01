"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { usePresence } from "@/hooks/usePresence";
import { SessionCode } from "@/components/shared/SessionCode";
import { ItemForm } from "@/components/admin/ItemForm";
import { ItemList } from "@/components/admin/ItemList";
import { AuctionControls } from "@/components/admin/AuctionControls";
import { ParticipantList } from "@/components/admin/ParticipantList";

export default function AdminPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();

  const onSessionEnd = useCallback(() => {
    router.push("/");
  }, [router]);

  const {
    session,
    participants,
    items,
    activeItem,
    loading,
    refetch,
  } = useSession({
    code,
    onSessionEnd,
  });

  const { onlineUsers } = usePresence(code);
  const onlineIds = onlineUsers.map((u) => u.participantId);

  async function handleStartAuction(itemId: string) {
    await fetch(`/api/sessions/${code}/auction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", itemId }),
    });
  }

  async function handleDeleteItem(itemId: string) {
    await fetch(`/api/sessions/${code}/items?id=${itemId}`, {
      method: "DELETE",
    });
    refetch();
  }

  async function handleEndSession() {
    if (!confirm("End this game session? This cannot be undone.")) return;
    await fetch(`/api/sessions/${code}/auction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end_session" }),
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-game-bg">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-game-bg">
        <div className="text-bid-red">Session not found</div>
      </main>
    );
  }

  const pendingItems = items.filter((i) => i.status === "pending").length;
  const soldItems = items.filter((i) => i.status === "sold").length;

  return (
    <main className="min-h-screen bg-game-bg p-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gold">BidWars</h1>
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>
          <SessionCode code={code} />
        </div>

        {/* Stats bar */}
        <div className="mb-6 flex gap-4 rounded-xl border-2 border-game-border bg-game-surface p-3">
          <div className="flex-1 text-center">
            <div className="text-xs text-gray-500">Players</div>
            <div className="text-lg font-bold text-white">
              {participants.filter((p) => !p.is_admin).length}
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-xs text-gray-500">Items</div>
            <div className="text-lg font-bold text-white">{items.length}</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-xs text-gray-500">Pending</div>
            <div className="text-lg font-bold text-game-accent">{pendingItems}</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-xs text-gray-500">Sold</div>
            <div className="text-lg font-bold text-bid-green">{soldItems}</div>
          </div>
        </div>

        {/* Active auction */}
        {activeItem && (
          <div className="mb-6">
            <AuctionControls item={activeItem} code={code} />
          </div>
        )}

        {/* Display view link */}
        <div className="mb-6">
          <a
            href={`/session/${code}/display`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-game-border bg-game-surface p-3 text-center text-sm text-gray-400 transition-colors hover:border-gold hover:text-gold"
          >
            Open Big Screen Display &rarr;
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <ItemForm code={code} onAdded={refetch} />
            <ParticipantList participants={participants} onlineIds={onlineIds} />
          </div>

          {/* Right column */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-gray-400 uppercase tracking-wider">
              Auction Queue
            </h3>
            <ItemList
              items={items}
              code={code}
              onStartAuction={handleStartAuction}
              onDeleteItem={handleDeleteItem}
              hasActiveItem={!!activeItem}
            />
          </div>
        </div>

        {/* End session */}
        {session.status !== "completed" && (
          <div className="mt-8 text-center">
            <button
              onClick={handleEndSession}
              className="text-sm text-gray-600 underline transition-colors hover:text-bid-red"
            >
              End Game Session
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
