-- 1. Create BOARDS Table
CREATE TABLE IF NOT EXISTS public.boards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'standard', -- standard, professional, smart, minimal
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid()
);

-- 2. Add board_id to TASKS
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS board_id uuid REFERENCES public.boards(id) ON DELETE CASCADE;

-- 3. Enable RLS on boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- 4. Policies for BOARDS
DROP POLICY IF EXISTS "Users can manage their own boards" ON public.boards;
CREATE POLICY "Users can manage their own boards"
  ON public.boards FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- 5. Data Migration (Optional/Recommended)
-- Create a default board for existing tasks that don't have a board_id.
-- This part is tricky in pure SQL because we need a board PER USER.
-- We can execute a block to backfill.

DO $$
DECLARE
  u record;
  b_id uuid;
BEGIN
  -- For each user who has tasks but (potentially) no boards
  FOR u IN SELECT DISTINCT user_id FROM public.tasks WHERE board_id IS NULL LOOP
    -- Create a default board for this user
    INSERT INTO public.boards (user_id, title, type)
    VALUES (u.user_id, 'zero', 'standard')
    RETURNING id INTO b_id;

    -- Update their tasks to belong to this new board
    UPDATE public.tasks
    SET board_id = b_id
    WHERE user_id = u.user_id AND board_id IS NULL;
  END LOOP;
END $$;
