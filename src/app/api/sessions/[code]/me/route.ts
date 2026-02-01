import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cookieStore = await cookies();
    const participantToken = cookieStore.get(`bw_participant_${code}`)?.value;

    if (!participantToken) {
      return NextResponse.json({ error: "Not in this game" }, { status: 401 });
    }

    const supabase = await createServiceClient();

    const { data: participant } = await supabase
      .from("participants")
      .select("*")
      .eq("token", participantToken)
      .single();

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    return NextResponse.json({ participant });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
