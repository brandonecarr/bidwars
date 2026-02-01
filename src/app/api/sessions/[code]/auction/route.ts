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
    const { action, itemId } = body as { action: string; itemId?: string };
    const supabase = await createServiceClient();

    switch (action) {
      case "start": {
        if (!itemId) {
          return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }

        // Ensure no other item is currently active
        const { data: activeItem } = await supabase
          .from("items")
          .select("id")
          .eq("session_id", session.id)
          .eq("status", "active")
          .single();

        if (activeItem) {
          return NextResponse.json(
            { error: "Another item is currently being auctioned" },
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

        // Set item to active
        const { error } = await supabase
          .from("items")
          .update({ status: "active" })
          .eq("id", itemId)
          .eq("session_id", session.id);

        if (error) {
          return NextResponse.json({ error: "Failed to start auction" }, { status: 500 });
        }

        // Broadcast auction start event
        const channel = supabase.channel(`session:${code}`);
        await channel.send({
          type: "broadcast",
          event: "auction:start",
          payload: { itemId },
        });
        supabase.removeChannel(channel);

        return NextResponse.json({ success: true });
      }

      case "sold": {
        if (!itemId) {
          return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }

        // Get the highest bid
        const { data: highestBid } = await supabase
          .from("bids")
          .select("*, participant:participants(id, name)")
          .eq("item_id", itemId)
          .order("amount", { ascending: false })
          .limit(1)
          .single();

        if (!highestBid) {
          // No bids - mark as unsold
          await supabase
            .from("items")
            .update({ status: "unsold" })
            .eq("id", itemId);

          const channel = supabase.channel(`session:${code}`);
          await channel.send({
            type: "broadcast",
            event: "auction:end",
            payload: { itemId, result: "unsold" },
          });
          supabase.removeChannel(channel);

          return NextResponse.json({ success: true, result: "unsold" });
        }

        // Mark as sold to highest bidder
        await supabase
          .from("items")
          .update({
            status: "sold",
            sold_to: highestBid.participant_id,
            sold_price: highestBid.amount,
          })
          .eq("id", itemId);

        // Refund all non-winning bidders for this item
        // Get all unique bidders except winner
        const { data: allBids } = await supabase
          .from("bids")
          .select("participant_id, amount")
          .eq("item_id", itemId)
          .neq("participant_id", highestBid.participant_id)
          .order("amount", { ascending: false });

        // Get unique bidders and their highest bid (already deducted)
        const refundedParticipants = new Set<string>();
        if (allBids) {
          for (const bid of allBids) {
            if (!refundedParticipants.has(bid.participant_id)) {
              refundedParticipants.add(bid.participant_id);
              // Their balance was reduced to (balance - bid.amount) when they bid,
              // but was refunded when outbid. No action needed here since
              // outbid refunds happen in the bid API.
            }
          }
        }

        const winnerName = (highestBid.participant as unknown as { name: string })?.name || "Unknown";

        const channel = supabase.channel(`session:${code}`);
        await channel.send({
          type: "broadcast",
          event: "item:sold",
          payload: {
            itemId,
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

      case "skip": {
        if (!itemId) {
          return NextResponse.json({ error: "Item ID required" }, { status: 400 });
        }

        // Refund all bidders on this item
        const { data: itemBids } = await supabase
          .from("bids")
          .select("participant_id, amount")
          .eq("item_id", itemId)
          .order("amount", { ascending: false });

        // Refund the current highest bidder (others already refunded when outbid)
        if (itemBids && itemBids.length > 0) {
          const topBid = itemBids[0];
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
          .from("items")
          .update({ status: "unsold" })
          .eq("id", itemId);

        const channel = supabase.channel(`session:${code}`);
        await channel.send({
          type: "broadcast",
          event: "auction:end",
          payload: { itemId, result: "skipped" },
        });
        supabase.removeChannel(channel);

        return NextResponse.json({ success: true, result: "skipped" });
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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
