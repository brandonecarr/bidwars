import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { placeBidSchema } from "@/lib/validations/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cookieStore = await cookies();
    const participantToken = cookieStore.get(`bw_participant_${code}`)?.value;

    if (!participantToken) {
      return NextResponse.json({ error: "Not in this game" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = placeBidSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Verify participant
    const { data: participant } = await supabase
      .from("participants")
      .select("*")
      .eq("token", participantToken)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 401 });
    }

    // Verify item is active and belongs to this session
    const { data: item } = await supabase
      .from("items")
      .select("*")
      .eq("id", parsed.data.itemId)
      .eq("session_id", participant.session_id)
      .eq("status", "active")
      .single();

    if (!item) {
      return NextResponse.json(
        { error: "This item is not currently up for auction" },
        { status: 400 }
      );
    }

    // Get current highest bid
    const { data: currentHighest } = await supabase
      .from("bids")
      .select("*")
      .eq("item_id", item.id)
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    const minimumBid = currentHighest
      ? currentHighest.amount + 1
      : item.starting_bid;

    if (parsed.data.amount < minimumBid) {
      return NextResponse.json(
        { error: `Bid must be at least $${minimumBid.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Check if this participant is already the highest bidder
    if (currentHighest && currentHighest.participant_id === participant.id) {
      return NextResponse.json(
        { error: "You already have the highest bid" },
        { status: 400 }
      );
    }

    // Calculate how much more the participant needs to pay
    // If they had a previous bid on this item, they were already refunded when outbid
    // So we deduct the full new bid amount
    if (participant.balance < parsed.data.amount) {
      return NextResponse.json(
        { error: "Insufficient funds" },
        { status: 400 }
      );
    }

    // Deduct from bidder's balance
    await supabase
      .from("participants")
      .update({ balance: participant.balance - parsed.data.amount })
      .eq("id", participant.id);

    // Refund the previous highest bidder
    if (currentHighest && currentHighest.participant_id !== participant.id) {
      const { data: prevBidder } = await supabase
        .from("participants")
        .select("balance")
        .eq("id", currentHighest.participant_id)
        .single();

      if (prevBidder) {
        await supabase
          .from("participants")
          .update({ balance: prevBidder.balance + currentHighest.amount })
          .eq("id", currentHighest.participant_id);
      }
    }

    // Place the bid
    const { data: bid, error: bidError } = await supabase
      .from("bids")
      .insert({
        item_id: item.id,
        participant_id: participant.id,
        amount: parsed.data.amount,
      })
      .select()
      .single();

    if (bidError || !bid) {
      // Rollback balance change
      await supabase
        .from("participants")
        .update({ balance: participant.balance })
        .eq("id", participant.id);

      return NextResponse.json({ error: "Failed to place bid" }, { status: 500 });
    }

    return NextResponse.json({
      bid: {
        id: bid.id,
        amount: bid.amount,
        participantName: participant.name,
      },
      newBalance: participant.balance - parsed.data.amount,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
