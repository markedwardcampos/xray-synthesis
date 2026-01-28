-- Project-Based Synthesis Schema Updates
-- Run this in Supabase SQL Editor

-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, processing, completed, failed
  synthesis_id UUID REFERENCES processed_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add project relationship to existing tables
ALTER TABLE ingest_queue 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority BOOLEAN DEFAULT false; -- For instant processing

ALTER TABLE processed_items 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_synthesis BOOLEAN DEFAULT false; -- Marks final project synthesis

-- 3. Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view projects in their teams" ON projects;
DROP POLICY IF EXISTS "Users can create projects in their teams" ON projects;
DROP POLICY IF EXISTS "Users can update projects in their teams" ON projects;
DROP POLICY IF EXISTS "Users can delete projects in their teams" ON projects;

-- 4. Create RLS Policies for projects
CREATE POLICY "Users can view projects in their teams"
  ON projects FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create projects in their teams"
  ON projects FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update projects in their teams"
  ON projects FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete projects in their teams"
  ON projects FOR DELETE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_ingest_queue_project_id ON ingest_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_ingest_queue_priority ON ingest_queue(priority) WHERE priority = true;
CREATE INDEX IF NOT EXISTS idx_processed_items_project_id ON processed_items(project_id);
CREATE INDEX IF NOT EXISTS idx_processed_items_synthesis ON processed_items(is_synthesis) WHERE is_synthesis = true;

-- 6. Create updated_at trigger for projects
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();
