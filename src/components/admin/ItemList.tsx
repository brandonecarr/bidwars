"use client";

import type { Item } from "@/types/game";
import { formatMoney } from "@/lib/utils/format-money";

interface ItemListProps {
  items: Item[];
  code: string;
  onStartAuction: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  hasActiveItem: boolean;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-700 text-gray-300" },
  active: { label: "LIVE", className: "bg-bid-red text-white animate-pulse" },
  sold: { label: "Sold", className: "bg-bid-green text-white" },
  unsold: { label: "Unsold", className: "bg-gray-600 text-gray-300" },
};

const anonBadge: Record<string, { label: string; className: string }> = {
  visible: { label: "Visible", className: "text-gray-500" },
  hidden: { label: "Mystery", className: "text-purple-400" },
  partial: { label: "Hint", className: "text-yellow-400" },
};

export function ItemList({ items, onStartAuction, onDeleteItem, hasActiveItem }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-game-border p-8 text-center text-gray-600">
        No items yet. Add items to start auctioning.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => {
        const status = statusBadge[item.status];
        const anon = anonBadge[item.anon_mode];

        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-colors ${
              item.status === "active"
                ? "border-bid-red bg-bid-red/10"
                : "border-game-border bg-game-surface"
            }`}
          >
            <span className="w-6 text-center text-sm text-gray-600">
              {index + 1}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white truncate">
                  {item.name}
                </span>
                <span className={`text-xs ${anon.className}`}>
                  {anon.label}
                </span>
              </div>
              {item.description && (
                <p className="text-xs text-gray-500 truncate">{item.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">
                  Start: {formatMoney(item.starting_bid)}
                </span>
                {item.sold_price && (
                  <span className="text-xs text-bid-green">
                    Sold: {formatMoney(item.sold_price)}
                  </span>
                )}
              </div>
            </div>

            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.className}`}>
              {status.label}
            </span>

            {item.status === "pending" && (
              <div className="flex gap-1">
                <button
                  onClick={() => onStartAuction(item.id)}
                  disabled={hasActiveItem}
                  className="rounded-lg bg-game-accent px-3 py-1 text-xs font-bold transition-all hover:bg-game-accent-light disabled:opacity-30"
                  title={hasActiveItem ? "Finish current auction first" : "Start auction"}
                >
                  Start
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="rounded-lg bg-bid-red/20 px-3 py-1 text-xs font-bold text-bid-red transition-all hover:bg-bid-red/40"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
