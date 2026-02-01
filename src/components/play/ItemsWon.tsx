"use client";

import type { Item } from "@/types/game";
import { formatMoney } from "@/lib/utils/format-money";

interface ItemsWonProps {
  items: Item[];
  participantId: string;
}

export function ItemsWon({ items, participantId }: ItemsWonProps) {
  const wonItems = items.filter((item) => item.sold_to === participantId);

  if (wonItems.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-bid-green/30 bg-bid-green/5 p-4">
      <h3 className="mb-2 text-sm font-bold text-bid-green uppercase tracking-wider">
        Items Won ({wonItems.length})
      </h3>
      <div className="flex flex-col gap-2">
        {wonItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg bg-game-bg px-3 py-2">
            <span className="font-medium text-white">{item.name}</span>
            <span className="text-sm text-bid-green font-bold">
              {item.sold_price ? formatMoney(item.sold_price) : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
