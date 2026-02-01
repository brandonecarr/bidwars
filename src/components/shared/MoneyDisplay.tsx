"use client";

import { formatMoney } from "@/lib/utils/format-money";

interface MoneyDisplayProps {
  amount: number;
  size?: "sm" | "md" | "lg" | "xl";
  showSign?: boolean;
  animate?: boolean;
}

export function MoneyDisplay({ amount, size = "md", showSign = false, animate = false }: MoneyDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-4xl",
  };

  const prefix = showSign && amount > 0 ? "+" : "";
  const colorClass = showSign
    ? amount > 0
      ? "text-bid-green"
      : amount < 0
        ? "text-bid-red"
        : "text-gold"
    : "text-gold";

  return (
    <span
      className={`font-black ${sizeClasses[size]} ${colorClass} ${
        animate ? "transition-all duration-300" : ""
      }`}
    >
      {prefix}{formatMoney(amount)}
    </span>
  );
}
