-- Team Invite System Schema
-- Add to existing Supabase schema

-- 1. Create team_invites table
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
DROP POLICY IF EXISTS "Team members can view invites" ON team_invites;
DROP POLICY IF EXISTS "Team members can create invites" ON team_invites;
DROP POLICY IF EXISTS "Anyone can view valid invite by code" ON team_invites;

CREATE POLICY "Team members can view invites"
  ON team_invites FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Public view for accepting invites (no auth required)
CREATE POLICY "Anyone can view valid invite by code"
  ON team_invites FOR SELECT
  USING (
    invite_code IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR uses_count < max_uses)
  );

-- 4. Create index
CREATE INDEX IF NOT EXISTS idx_team_invites_code ON team_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id);

-- 5. Function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No confusing characters
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
