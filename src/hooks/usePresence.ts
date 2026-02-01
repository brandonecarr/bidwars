"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  participantId: string;
  name: string;
  online_at: string;
}

export function usePresence(code: string, participantId?: string, name?: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!code) return;

    const supabase = supabaseRef.current;

    const channel = supabase.channel(`presence:${code}`, {
      config: { presence: { key: participantId || "anon" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const users: PresenceState[] = [];
        for (const key in state) {
          const presences = state[key];
          if (presences && presences.length > 0) {
            users.push(presences[0]);
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && participantId && name) {
          await channel.track({
            participantId,
            name,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, participantId, name]);

  return { onlineUsers, onlineCount: onlineUsers.length };
}
