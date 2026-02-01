"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Session, Participant, Item, Round } from "@/types/game";

interface UseSessionOptions {
  code: string;
  onRoundStart?: (roundId: string, roundNumber: number) => void;
  onRoundSold?: (payload: {
    roundId: string;
    winnerId: string;
    winnerName: string;
    finalPrice: number;
  }) => void;
  onRoundSkip?: (roundId: string) => void;
  onRoundAssign?: (roundId: string, itemId: string) => void;
  onSessionEnd?: () => void;
}

export function useSession({
  code,
  onRoundStart,
  onRoundSold,
  onRoundSkip,
  onRoundAssign,
  onSessionEnd,
}: UseSessionOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    const supabase = supabaseRef.current;

    const sessionRes = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code)
      .single();

    const sessionData = sessionRes.data as Session | null;
    if (!sessionData) return;
    setSession(sessionData);

    const participantsRes = await supabase
      .from("participants")
      .select("*")
      .eq("session_id", sessionData.id)
      .order("joined_at", { ascending: true });

    const itemsRes = await supabase
      .from("items")
      .select("*")
      .eq("session_id", sessionData.id)
      .order("sort_order", { ascending: true });

    const roundsRes = await supabase
      .from("rounds")
      .select("*")
      .eq("session_id", sessionData.id)
      .order("round_number", { ascending: true });

    setParticipants((participantsRes.data as Participant[] | null) || []);
    setItems((itemsRes.data as Item[] | null) || []);
    setRounds((roundsRes.data as Round[] | null) || []);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!session) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`session:${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setParticipants((prev) => [...prev, payload.new as Participant]);
          } else if (payload.eventType === "UPDATE") {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === (payload.new as Participant).id
                  ? (payload.new as Participant)
                  : p
              )
            );
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) =>
              prev.filter((p) => p.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [...prev, payload.new as Item]);
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === (payload.new as Item).id ? (payload.new as Item) : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) =>
              prev.filter((item) => item.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRounds((prev) => [...prev, payload.new as Round]);
          } else if (payload.eventType === "UPDATE") {
            setRounds((prev) =>
              prev.map((r) =>
                r.id === (payload.new as Round).id ? (payload.new as Round) : r
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .on("broadcast", { event: "round:start" }, ({ payload }) => {
        onRoundStart?.(payload.roundId, payload.roundNumber);
      })
      .on("broadcast", { event: "round:sold" }, ({ payload }) => {
        onRoundSold?.(payload);
      })
      .on("broadcast", { event: "round:skip" }, ({ payload }) => {
        onRoundSkip?.(payload.roundId);
      })
      .on("broadcast", { event: "round:assign" }, ({ payload }) => {
        onRoundAssign?.(payload.roundId, payload.itemId);
      })
      .on("broadcast", { event: "session:end" }, () => {
        onSessionEnd?.();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [session?.id, code, onRoundStart, onRoundSold, onRoundSkip, onRoundAssign, onSessionEnd, session]);

  const activeRound = rounds.find((r) => r.status === "active") || null;

  return {
    session,
    participants,
    items,
    rounds,
    activeRound,
    loading,
    refetch: fetchData,
  };
}
