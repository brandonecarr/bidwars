"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Session, Participant, Item } from "@/types/game";

interface UseSessionOptions {
  code: string;
  onAuctionStart?: (itemId: string) => void;
  onAuctionEnd?: (itemId: string, result: string) => void;
  onItemSold?: (payload: {
    itemId: string;
    winnerId: string;
    winnerName: string;
    finalPrice: number;
  }) => void;
  onSessionEnd?: () => void;
}

export function useSession({ code, onAuctionStart, onAuctionEnd, onItemSold, onSessionEnd }: UseSessionOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [items, setItems] = useState<Item[]>([]);
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

    setParticipants((participantsRes.data as Participant[] | null) || []);
    setItems((itemsRes.data as Item[] | null) || []);
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
      // Listen for participant changes
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
              prev.map((p) => (p.id === (payload.new as Participant).id ? (payload.new as Participant) : p))
            );
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) =>
              prev.filter((p) => p.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      // Listen for item changes
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
      // Listen for session changes
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
      // Listen for broadcast events
      .on("broadcast", { event: "auction:start" }, ({ payload }) => {
        onAuctionStart?.(payload.itemId);
      })
      .on("broadcast", { event: "auction:end" }, ({ payload }) => {
        onAuctionEnd?.(payload.itemId, payload.result);
      })
      .on("broadcast", { event: "item:sold" }, ({ payload }) => {
        onItemSold?.(payload);
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
  }, [session?.id, code, onAuctionStart, onAuctionEnd, onItemSold, onSessionEnd, session]);

  const activeItem = items.find((item) => item.status === "active") || null;

  return {
    session,
    participants,
    items,
    activeItem,
    loading,
    refetch: fetchData,
  };
}
