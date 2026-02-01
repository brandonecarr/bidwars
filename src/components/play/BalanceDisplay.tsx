"use client";

import { MoneyDisplay } from "@/components/shared/MoneyDisplay";

interface BalanceDisplayProps {
  balance: number;
  name: string;
}

export function BalanceDisplay({ balance, name }: BalanceDisplayProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border-2 border-game-border bg-game-surface px-4 py-3">
      <div>
        <div className="text-xs text-gray-500">Your Balance</div>
        <MoneyDisplay amount={balance} size="lg" animate />
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-500">Playing as</div>
        <div className="font-bold text-white">{name}</div>
      </div>
    </div>
  );
}
