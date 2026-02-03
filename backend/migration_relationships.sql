-- Link tasks to profiles to enable joining
-- This works because tasks.user_id and profiles.id are both UUIDs matching auth.users
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_profiles 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id);
