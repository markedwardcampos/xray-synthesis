import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/teams/invites - Create new invite link
export async function POST(request: NextRequest) {
  const { teamId, expiresInDays, maxUses } = await request.json();

  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  // Generate unique invite code
  const { data: codeData } = await supabase.rpc("generate_invite_code");
  const inviteCode = codeData;

  // Calculate expiration
  let expiresAt = null;
  if (expiresInDays) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + expiresInDays);
    expiresAt = expiry.toISOString();
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("team_invites")
    .insert({
      team_id: teamId,
      invite_code: inviteCode,
      created_by: user.id,
      expires_at: expiresAt,
      max_uses: maxUses || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invite: data });
}

// GET /api/teams/invites?code=XXX - Get invite details
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const teamId = searchParams.get("teamId");

  if (code) {
    // Public endpoint - get invite by code
    const { data, error } = await supabase
      .from("team_invites")
      .select("*, teams(name)")
      .eq("invite_code", code)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check if expired or used up
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    if (data.max_uses && data.uses_count >= data.max_uses) {
      return NextResponse.json({ error: "Invite fully used" }, { status: 410 });
    }

    return NextResponse.json({ invite: data });
  }

  if (teamId) {
    // List all invites for team
    const { data, error } = await supabase
      .from("team_invites")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invites: data });
  }

  return NextResponse.json({ error: "code or teamId required" }, { status: 400 });
}

// POST /api/teams/invites/accept - Accept invite and join team
export async function PATCH(request: NextRequest) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Must be logged in" }, { status: 401 });
  }

  // Get invite
  const { data: invite, error: inviteError } = await supabase
    .from("team_invites")
    .select("*")
    .eq("invite_code", code)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  // Validate
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  if (invite.max_uses && invite.uses_count >= invite.max_uses) {
    return NextResponse.json({ error: "Invite fully used" }, { status: 410 });
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", invite.team_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already a team member" }, { status: 409 });
  }

  // Add to team
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: invite.team_id,
    user_id: user.id,
    role: "member",
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Increment uses_count
  await supabase
    .from("team_invites")
    .update({ uses_count: invite.uses_count + 1 })
    .eq("id", invite.id);

  return NextResponse.json({ success: true, teamId: invite.team_id });
}
