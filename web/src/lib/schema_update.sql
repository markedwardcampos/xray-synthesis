
-- Update processed_items to store raw content link
ALTER TABLE processed_items ADD COLUMN IF NOT EXISTS raw_content_path TEXT;

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_item_id UUID REFERENCES processed_items(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  gcs_path TEXT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID REFERENCES teams(id)
);

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for assets (similar to processed_items)
DROP POLICY IF EXISTS "Team based access for assets" ON assets;
CREATE POLICY "Team based access for assets" ON assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = assets.team_id 
      AND team_members.user_id = auth.uid()
    )
  );
