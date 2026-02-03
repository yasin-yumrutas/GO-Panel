-- Add assigned_to column to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) DEFAULT NULL;

-- Enable joining assigned_to logic (Supabase detects FK automatically usually, but good to know)
