import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { createSessionSchema } from "@/lib/validations/schemas";
import { generateSessionCode } from "@/lib/utils/generate-code";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const { adminName, startingMoney } = parsed.data;

    // Generate a unique code (retry if collision)
    let code = generateSessionCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("code", code)
        .single();

      if (!existing) break;
      code = generateSessionCode();
      attempts++;
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        code,
        admin_name: adminName,
        starting_money: startingMoney,
      })
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Create admin as a participant
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .insert({
        session_id: session.id,
        name: adminName,
        balance: startingMoney,
        is_admin: true,
      })
      .select()
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Failed to create admin participant" },
        { status: 500 }
      );
    }

    // Store tokens in cookies for auth
    const cookieStore = await cookies();
    cookieStore.set(`bw_admin_${code}`, session.admin_token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    cookieStore.set(`bw_participant_${code}`, participant.token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({
      code: session.code,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("POST /api/sessions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
