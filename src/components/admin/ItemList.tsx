"use client";

import type { Item } from "@/types/game";

interface ItemListProps {
  items: Item[];
  code: string;
  onDeleteItem: (itemId: string) => void;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "Available", className: "bg-gray-700 text-gray-300" },
  sold: { label: "Sold", className: "bg-bid-green text-white" },
};

export function ItemList({ items, onDeleteItem }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-game-border p-8 text-center text-gray-600">
        No items yet. Add items to your inventory.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => {
        const status = statusBadge[item.status] || statusBadge.pending;

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border-2 border-game-border bg-game-surface p-3 transition-colors"
          >
            <span className="w-6 text-center text-sm text-gray-600">
              {index + 1}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white truncate">
                  {item.name}
                </span>
              </div>
              {item.description && (
                <p className="text-xs text-gray-500 truncate">{item.description}</p>
              )}
            </div>

            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.className}`}>
              {status.label}
            </span>

            {item.status === "pending" && (
              <button
                onClick={() => onDeleteItem(item.id)}
                className="rounded-lg bg-bid-red/20 px-3 py-1 text-xs font-bold text-bid-red transition-all hover:bg-bid-red/40"
              >
                Delete
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
