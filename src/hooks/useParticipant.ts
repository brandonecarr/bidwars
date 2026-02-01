"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Participant } from "@/types/game";

export function useParticipant(code: string) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchParticipant = useCallback(async () => {
    // We need to get the participant token from the server side
    // Since cookies are httpOnly, we'll use an API call
    const res = await fetch(`/api/sessions/${code}/me`);
    if (res.ok) {
      const data = await res.json();
      setParticipant(data.participant);
    }
    setLoading(false);
  }, [code]);

  useEffect(() => {
    fetchParticipant();
  }, [fetchParticipant]);

  // Subscribe to balance updates for this participant
  useEffect(() => {
    if (!participant) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`me:${participant.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "participants",
          filter: `id=eq.${participant.id}`,
        },
        (payload) => {
          setParticipant(payload.new as Participant);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participant?.id, participant]);

  return { participant, loading, refetch: fetchParticipant };
}
