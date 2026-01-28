-- Add created_by column for better ownership tracking
ALTER TABLE teams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Users can view their own memberships" ON team_members;

-- Teams: Allow authenticated users to create and view teams
CREATE POLICY "Allow authenticated users to view teams" ON teams
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = teams.id 
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow authenticated users to insert teams" ON teams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow owners to update teams" ON teams
  FOR UPDATE USING (auth.uid() = created_by);

-- Team Members: Allow authenticated users to join teams and view memberships
CREATE POLICY "Allow users to view memberships" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow authenticated users to insert memberships" ON team_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Ensure ingest_queue and processed_items are also accessible
DROP POLICY IF EXISTS "Team based access for queue" ON ingest_queue;
CREATE POLICY "Team based access for queue" ON ingest_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = ingest_queue.team_id 
      AND team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team based access for processed_items" ON processed_items;
CREATE POLICY "Team based access for processed_items" ON processed_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.team_id = processed_items.team_id 
      AND team_members.user_id = auth.uid()
    )
  );
