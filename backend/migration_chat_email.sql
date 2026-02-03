-- Add sender_email column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS sender_email TEXT;
