"use client";

import type { Participant } from "@/types/game";
import { formatMoney } from "@/lib/utils/format-money";

interface ParticipantListProps {
  participants: Participant[];
  onlineIds?: string[];
}

export function ParticipantList({ participants, onlineIds = [] }: ParticipantListProps) {
  const nonAdmins = participants.filter((p) => !p.is_admin);

  if (nonAdmins.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-game-border p-6 text-center text-gray-600">
        Waiting for players to join...
      </div>
    );
  }

  const sorted = [...nonAdmins].sort((a, b) => b.balance - a.balance);

  return (
    <div className="rounded-xl border-2 border-game-border bg-game-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-400 uppercase tracking-wider">
        Players ({nonAdmins.length})
      </h3>
      <div className="flex flex-col gap-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-lg bg-game-bg px-3 py-2"
          >
            <span className="w-5 text-center text-xs text-gray-600">
              {i + 1}
            </span>
            <div className="relative">
              <div
                className={`h-2 w-2 rounded-full ${
                  onlineIds.includes(p.id) ? "bg-bid-green" : "bg-gray-600"
                }`}
              />
            </div>
            <span className="flex-1 font-medium text-white truncate">
              {p.name}
            </span>
            <span className="font-bold text-gold">
              {formatMoney(p.balance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
