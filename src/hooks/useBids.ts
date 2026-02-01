"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BidWithParticipant } from "@/types/game";

export function useBids(roundId: string | null) {
  const [bids, setBids] = useState<BidWithParticipant[]>([]);
  const [highestBid, setHighestBid] = useState<BidWithParticipant | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const fetchBids = useCallback(async () => {
    if (!roundId) {
      setBids([]);
      setHighestBid(null);
      return;
    }

    const supabase = supabaseRef.current;
    const { data } = await supabase
      .from("bids")
      .select("*, participant:participants(name)")
      .eq("round_id", roundId)
      .order("amount", { ascending: false });

    if (data) {
      const mapped: BidWithParticipant[] = data.map((b: Record<string, unknown>) => ({
        id: b.id as string,
        item_id: b.item_id as string,
        round_id: b.round_id as string | null,
        participant_id: b.participant_id as string,
        amount: b.amount as number,
        created_at: b.created_at as string,
        participantName: (b.participant as { name: string })?.name || "Unknown",
      }));
      setBids(mapped);
      setHighestBid(mapped[0] || null);
    }
  }, [roundId]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  useEffect(() => {
    if (!roundId) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`bids:${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `round_id=eq.${roundId}`,
        },
        async () => {
          await fetchBids();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roundId, fetchBids]);

  return { bids, highestBid, refetch: fetchBids };
}
