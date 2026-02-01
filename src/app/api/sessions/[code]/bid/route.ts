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

    // Verify round is active and belongs to this session
    const { data: round } = await supabase
      .from("rounds")
      .select("*")
      .eq("id", parsed.data.roundId)
      .eq("session_id", participant.session_id)
      .eq("status", "active")
      .single();

    if (!round) {
      return NextResponse.json(
        { error: "No active auction right now" },
        { status: 400 }
      );
    }

    // Get current highest bid for this round
    const { data: currentHighest } = await supabase
      .from("bids")
      .select("*")
      .eq("round_id", round.id)
      .order("amount", { ascending: false })
      .limit(1)
      .single();

    const minimumBid = currentHighest ? currentHighest.amount + 1 : 1;

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
        round_id: round.id,
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
  } catch (err) {
    console.error("POST /api/sessions/[code]/bid error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
