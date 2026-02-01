import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { joinSessionSchema } from "@/lib/validations/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const parsed = joinSessionSchema.safeParse({ ...body, code });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Find the session
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Game not found. Check the code and try again." },
        { status: 404 }
      );
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { error: "This game has already ended." },
        { status: 400 }
      );
    }

    // Check if name is already taken in this session
    const { data: existing } = await supabase
      .from("participants")
      .select("id")
      .eq("session_id", session.id)
      .eq("name", parsed.data.name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "That name is already taken in this game." },
        { status: 400 }
      );
    }

    // Create participant
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .insert({
        session_id: session.id,
        name: parsed.data.name,
        balance: session.starting_money,
        is_admin: false,
      })
      .select()
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Failed to join game" },
        { status: 500 }
      );
    }

    // Store participant token in cookie
    const cookieStore = await cookies();
    cookieStore.set(`bw_participant_${code.toUpperCase()}`, participant.token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({
      participantId: participant.id,
      name: participant.name,
      balance: participant.balance,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
