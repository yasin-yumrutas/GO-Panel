-- 1. Add invite_code to boards (Unique)
ALTER TABLE boards ADD COLUMN IF NOT EXISTS invite_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 0, 7);
ALTER TABLE boards ADD CONSTRAINT boards_invite_code_key UNIQUE (invite_code);

-- 2. Create board_members table
CREATE TABLE IF NOT EXISTS board_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(board_id, user_id)
);

-- 3. RLS Policies for board_members
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- Allow users to see memberships where they are the user
CREATE POLICY "Users can view their own memberships" 
ON board_members FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to join (insert themselves) - Logic handled by backend mostly but good for safety
CREATE POLICY "Users can insert their own membership" 
ON board_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Update Board RLS to allow members to view
-- Drop old policy if strictly owner-based logic exists, or add a generic "OR" policy.
-- Since Go-Panel uses a service key or simple REST calls, we often enforce via query, but RLS is safer.
-- We will rely on our Go Backend queries for now, but let's add a policy:
CREATE POLICY "Members can view boards"
ON boards FOR SELECT
USING (
    auth.uid() = user_id -- Owner
    OR 
    exists (
        select 1 from board_members 
        where board_members.board_id = boards.id 
        and board_members.user_id = auth.uid()
    )
);

-- 5. Tasks RLS needs to allow members too (Using implicit verification via Board)
-- This is tricky in simple SQL. Simple fix: If you select tasks by board_id, we assume you have access to board.
-- For now, we trust the Backend checks.

-- 6. Helper to generate code (Optional, can be done in Go)
