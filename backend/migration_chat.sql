-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read messages (board access control happens elsewhere)
CREATE POLICY "Messages are viewable by everyone" 
ON public.messages FOR SELECT 
USING (true);

-- Allow anyone to insert messages (we validate in backend)
CREATE POLICY "Anyone can insert messages" 
ON public.messages FOR INSERT 
WITH CHECK (true);
