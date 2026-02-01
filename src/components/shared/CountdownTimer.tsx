"use client";

import { useEffect, useState, useCallback } from "react";

interface CountdownTimerProps {
  seconds: number;
  onComplete?: () => void;
  running: boolean;
}

export function CountdownTimer({ seconds, onComplete, running }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, handleComplete]);

  const isUrgent = timeLeft <= 10;
  const percentage = (timeLeft / seconds) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-5xl font-black tabular-nums ${
          isUrgent ? "text-bid-red animate-pulse" : "text-white"
        }`}
      >
        {timeLeft}
      </div>
      <div className="h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-game-border">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent ? "bg-bid-red" : "bg-game-accent"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
