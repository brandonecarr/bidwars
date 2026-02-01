import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { addItemSchema } from "@/lib/validations/schemas";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = await createServiceClient();

    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("code", code)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("session_id", session.id)
      .order("sort_order", { ascending: true });

    return NextResponse.json({ items: items || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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
    const parsed = addItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Get current max sort order
    const { data: lastItem } = await supabase
      .from("items")
      .select("sort_order")
      .eq("session_id", session.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (lastItem?.sort_order ?? -1) + 1;

    const { data: item, error } = await supabase
      .from("items")
      .insert({
        session_id: session.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        image_url: parsed.data.imageUrl || null,
        starting_bid: parsed.data.startingBid,
        anon_mode: parsed.data.anonMode,
        anon_hint: parsed.data.anonHint || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error || !item) {
      return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await verifyAdmin(code);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("id");
    if (!itemId) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", itemId)
      .eq("session_id", session.id)
      .eq("status", "pending");

    if (error) {
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
