"use client";

import { useState } from "react";

interface SessionCodeProps {
  code: string;
}

export function SessionCode({ code }: SessionCodeProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-2 rounded-xl border-2 border-game-border bg-game-surface px-4 py-2 transition-colors hover:border-gold"
      title="Click to copy"
    >
      <span className="text-xs text-gray-500 uppercase tracking-wider">Code</span>
      <span className="font-mono text-xl font-black tracking-[0.2em] text-gold">
        {code}
      </span>
      <span className="text-xs text-gray-500 group-hover:text-gold transition-colors">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
