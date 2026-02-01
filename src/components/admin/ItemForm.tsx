"use client";

import { useState } from "react";
import type { AnonMode } from "@/types/database";

interface ItemFormProps {
  code: string;
  onAdded: () => void;
}

export function ItemForm({ code, onAdded }: ItemFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startingBid, setStartingBid] = useState(1);
  const [anonMode, setAnonMode] = useState<AnonMode>("visible");
  const [anonHint, setAnonHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/sessions/${code}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          startingBid,
          anonMode,
          anonHint: anonHint || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add item");
        return;
      }

      // Reset form
      setName("");
      setDescription("");
      setStartingBid(1);
      setAnonMode("visible");
      setAnonHint("");
      onAdded();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border-2 border-game-border bg-game-surface p-4">
      <h3 className="mb-4 text-lg font-bold text-gold">Add Item</h3>

      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          required
          maxLength={100}
          className="w-full rounded-lg border border-game-border bg-game-bg px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-game-accent"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          maxLength={500}
          rows={2}
          className="w-full resize-none rounded-lg border border-game-border bg-game-bg px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-game-accent"
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Starting Bid</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gold">$</span>
              <input
                type="number"
                value={startingBid}
                onChange={(e) => setStartingBid(Number(e.target.value))}
                min={1}
                className="w-full rounded-lg border border-game-border bg-game-bg px-3 py-2 pl-7 text-white outline-none focus:border-game-accent"
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">Visibility</label>
            <select
              value={anonMode}
              onChange={(e) => setAnonMode(e.target.value as AnonMode)}
              className="w-full rounded-lg border border-game-border bg-game-bg px-3 py-2 text-white outline-none focus:border-game-accent"
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden (Mystery)</option>
              <option value="partial">Partial (Hint)</option>
            </select>
          </div>
        </div>

        {anonMode === "partial" && (
          <input
            type="text"
            value={anonHint}
            onChange={(e) => setAnonHint(e.target.value)}
            placeholder="Category hint (e.g., 'Electronics')"
            maxLength={50}
            className="w-full rounded-lg border border-game-border bg-game-bg px-3 py-2 text-white placeholder-gray-600 outline-none focus:border-game-accent"
          />
        )}

        {error && <p className="text-sm text-bid-red">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-lg bg-game-accent px-4 py-2 font-bold transition-all hover:bg-game-accent-light disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Item"}
        </button>
      </div>
    </form>
  );
}
