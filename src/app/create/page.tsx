"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateSession() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [startingMoney, setStartingMoney] = useState(1000);
  const [moneyDisplay, setMoneyDisplay] = useState("1,000");

  function handleMoneyChange(value: string) {
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) {
      setStartingMoney(0);
      setMoneyDisplay("");
      return;
    }
    const num = parseInt(digits, 10);
    if (num > 10000000) return;
    setStartingMoney(num);
    setMoneyDisplay(num.toLocaleString());
  }

  function handleMoneyPreset(amount: number) {
    setStartingMoney(amount);
    setMoneyDisplay(amount.toLocaleString());
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName, startingMoney }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create session");
        return;
      }

      router.push(`/session/${data.code}/admin`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-game-bg p-4">
      <Link href="/" className="mb-8 text-gray-500 hover:text-gray-300 transition-colors">
        &larr; Back
      </Link>

      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-3xl font-black text-gold">
          Create Game
        </h1>

        <form onSubmit={handleCreate} className="flex flex-col gap-6">
          <div>
            <label htmlFor="adminName" className="mb-2 block text-sm font-medium text-gray-400">
              Your Name
            </label>
            <input
              id="adminName"
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              required
              className="w-full rounded-xl border-2 border-game-border bg-game-surface px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-game-accent"
            />
          </div>

          <div>
            <label htmlFor="startingMoney" className="mb-2 block text-sm font-medium text-gray-400">
              Starting Money (per player)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-bold">$</span>
              <input
                id="startingMoney"
                type="text"
                inputMode="numeric"
                value={moneyDisplay}
                onChange={(e) => handleMoneyChange(e.target.value)}
                placeholder="1,000"
                required
                className="w-full rounded-xl border-2 border-game-border bg-game-surface px-4 py-3 pl-8 text-white placeholder-gray-600 outline-none transition-colors focus:border-game-accent"
              />
            </div>
            <div className="mt-2 flex gap-2">
              {[500, 1000, 5000, 10000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleMoneyPreset(amount)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    startingMoney === amount
                      ? "bg-game-accent text-white"
                      : "bg-game-surface border border-game-border text-gray-400 hover:text-white"
                  }`}
                >
                  ${amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-center text-sm text-bid-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !adminName.trim()}
            className="rounded-xl bg-game-accent px-8 py-4 text-lg font-bold transition-all hover:bg-game-accent-light disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? "Creating..." : "Create Game"}
          </button>
        </form>
      </div>
    </main>
  );
}
