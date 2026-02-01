"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinSession() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", ""]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleCodeChange(index: number, value: string) {
    if (value.length > 1) value = value[value.length - 1];
    const upper = value.toUpperCase();
    const newCode = [...code];
    newCode[index] = upper;
    setCode(newCode);

    if (upper && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const focusIndex = Math.min(pasted.length, 4);
    inputRefs.current[focusIndex]?.focus();
  }

  const fullCode = code.join("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (fullCode.length !== 5) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/sessions/${fullCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join session");
        return;
      }

      router.push(`/session/${fullCode}/play`);
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
          Join Game
        </h1>

        <form onSubmit={handleJoin} className="flex flex-col gap-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Game Code
            </label>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((char, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  value={char}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  maxLength={1}
                  className="h-14 w-12 rounded-xl border-2 border-game-border bg-game-surface text-center text-2xl font-black text-gold outline-none transition-colors focus:border-game-accent"
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-400">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              required
              className="w-full rounded-xl border-2 border-game-border bg-game-surface px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-game-accent"
            />
          </div>

          {error && (
            <p className="text-center text-sm text-bid-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || fullCode.length !== 5 || !name.trim()}
            className="rounded-xl border-2 border-gold bg-transparent px-8 py-4 text-lg font-bold text-gold transition-all hover:bg-gold hover:text-game-bg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? "Joining..." : "Join Game"}
          </button>
        </form>
      </div>
    </main>
  );
}
