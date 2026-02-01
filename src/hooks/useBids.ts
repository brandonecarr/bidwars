"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Bid } from "@/types/game";

interface BidWithName extends Bid {
  participantName: string;
}

export function useBids(itemId: string | null) {
  const [bids, setBids] = useState<BidWithName[]>([]);
  const [highestBid, setHighestBid] = useState<BidWithName | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const fetchBids = useCallback(async () => {
    if (!itemId) {
      setBids([]);
      setHighestBid(null);
      return;
    }

    const supabase = supabaseRef.current;
    const { data } = await supabase
      .from("bids")
      .select("*, participant:participants(name)")
      .eq("item_id", itemId)
      .order("amount", { ascending: false });

    if (data) {
      const mapped: BidWithName[] = data.map((b: Record<string, unknown>) => ({
        id: b.id as string,
        item_id: b.item_id as string,
        participant_id: b.participant_id as string,
        amount: b.amount as number,
        created_at: b.created_at as string,
        participantName: (b.participant as { name: string })?.name || "Unknown",
      }));
      setBids(mapped);
      setHighestBid(mapped[0] || null);
    }
  }, [itemId]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  useEffect(() => {
    if (!itemId) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`bids:${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `item_id=eq.${itemId}`,
        },
        async () => {
          // Refetch to get participant name
          await fetchBids();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [itemId, fetchBids]);

  return { bids, highestBid, refetch: fetchBids };
}
