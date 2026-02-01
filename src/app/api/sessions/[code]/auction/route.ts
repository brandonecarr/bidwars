import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import type { Session } from "@/types/game";

async function verifyAdmin(code: string): Promise<Session | null> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(`bw_admin_${code}`)?.value;
  if (!adminToken) return null;

  const supabase = await createServiceClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .eq("admin_token", adminToken)
    .single();

  return session;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await verifyAdmin(code);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, roundId, itemId } = body as {
      action: string;
      roundId?: string;
      itemId?: string;
    };
    const supabase = await createServiceClient();

    switch (action) {
      // Start a new bag round (no item linked)
      case "start_round": {
        // Ensure no other round is currently active
        const { data: activeRound } = await supabase
          .from("rounds")
          .select("id")
          .eq("session_id", session.id)
          .eq("status", "active")
          .single();

        if (activeRound) {
          return NextResponse.json(
            { error: "A bag is already being auctioned" },
            { status: 400 }
          );
        }

        // Set session to active if in lobby
        if (session.status === "lobby") {
          await supabase
            .from("sessions")
            .update({ status: "active" })
            .eq("id", session.id);
        }

        // Get next round number
        const { data: lastRound } = await supabase
          .from("rounds")
          .select("round_number")
          .eq("session_id", session.id)
          .order("round_number", { ascending: false })
          .limit(1)
          .single();

        const nextNumber = (lastRound?.round_number ?? 0) + 1;

        const { data: round, error } = await supabase
          .from("rounds")
          .insert({
            session_id: session.id,
            round_number: nextNumber,
            status: "active",
          })
          .select()
          .single();

        if (error || !round) {
          return NextResponse.json({ error: "Failed to start round" }, { status: 500 });
        }

        // Broadcast round start
        const channel = supabase.channel(`session:${code}`);
        await channel.send({
          type: "broadcast",
          event: "round:start",
          payload: { roundId: round.id, roundNumber: nextNumber },
        });
        supabase.removeChannel(channel);

        return NextResponse.json({ success: true, round });
      }

      // Mark bag as sold to highest bidder
      case "sold": {
        if (!roundId) {
          return NextResponse.json({ error: "Round ID required" }, { status: 400 });
        }

        // Get the highest bid for this round
        const { data: highestBid } = await supabase
          .from("bids")
          .select("*, participant:participants(id, name)")
          .eq("round_id", roundId)
          .order("amount", { ascending: false })
          .limit(1)
          .single();

        if (!highestBid) {
          // No bids - mark as unsold
          await supabase
            .from("rounds")
            .update({ status: "unsold" })
            .eq("id", roundId);

          const channel = supabase.channel(`session:${code}`);
          await channel.send({
            type: "broadcast",
            event: "round:skip",
            payload: { roundId, result: "unsold" },
          });
          supabase.removeChannel(channel);

          return NextResponse.json({ success: true, result: "unsold" });
        }

        // Mark round as sold
        await supabase
          .from("rounds")
          .update({
            status: "sold",
            sold_to: highestBid.participant_id,
            sold_price: highestBid.amount,
          })
          .eq("id", roundId);

        const winnerName =
          (highestBid.participant as unknown as { name: string })?.name || "Unknown";

        const channel = supabase.channel(`session:${code}`);
        await channel.send({
          type: "broadcast",
          event: "round:sold",
          payload: {
            roundId,
            winnerId: highestBid.participant_id,
            winnerName,
            finalPrice: highestBid.amount,
          },
        });
        supabase.removeChannel(channel);

        return NextResponse.json({
          success: true,
          result: "sold",
          winnerId: highestBid.participant_id,
          winnerName,
          finalPrice: highestBid.amount,
        });
      }

      // Skip/cancel the current round
      case "skip": {
        if (!roundId) {
          return NextResponse.json({ error: "Round ID required" }, { status: 400 });
        }

        // Refund the current highest bidder (others already refunded when outbid)
        const { data: topBids } = await supabase
          .from("bids")
          .select("participant_id, amount")
          .eq("round_id", roundId)
          .order("amount", { ascending: false })
          .limit(1);

        if (topBids && topBids.length > 0) {
          const topBid = topBids[0];
          const { data: participant } = await supabase
            .from("participants")
            .select("balance")
            .eq("id", topBid.participant_id)
            .single();

          if (participant) {
            await supabase
              .from("participants")
              .update({ balance: participant.balance + topBid.amount })
              .eq("id", topBid.participant_id);
          }
        }

        await supabase
          .from("rounds")
          .update({ status: "unsold" })
          .eq("id", roundId);

        const channel = supabase.channel(`session:${code}`);
        await channel.send({
          type: "broadcast",
          event: "round:skip",
          payload: { roundId, result: "skipped" },
        });
        supabase.removeChannel(channel);

        return NextResponse.json({ success: true, result: "skipped" });
      }

      // Admin assigns an item to a sold round (after reveal)
      case "assign_item": {
        if (!roundId || !itemId) {
          return NextResponse.json(
            { error: "Round ID and Item ID required" },
            { status: 400 }
          );
        }

        await supabase
          .from("rounds")
          .update({ item_id: itemId })
          .eq("id", roundId)
          .eq("session_id", session.id);

        // Also mark the item as sold
        const { data: round } = await supabase
          .from("rounds")
          .select("sold_to, sold_price")
          .eq("id", roundId)
          .single();

        if (round) {
          await supabase
            .from("items")
            .update({
              status: "sold",
              sold_to: round.sold_to,
              sold_price: round.sold_price,
            })
            .eq("id", itemId);
        }

        const channel = supabase.channel(`session:${code}`);
        await channel.send({
          type: "broadcast",
          event: "round:assign",
          payload: { roundId, itemId },
        });
        supabase.removeChannel(channel);

        return NextResponse.json({ success: true });
      }

      case "end_session": {
        await supabase
          .from("sessions")
          .update({ status: "completed" })
          .eq("id", session.id);

        const channel = supabase.channel(`session:${code}`);
        await channel.send({
          type: "broadcast",
          event: "session:end",
          payload: {},
        });
        supabase.removeChannel(channel);

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    console.error("POST /api/sessions/[code]/auction error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
