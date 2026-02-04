-- Add optional relation columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS related_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_related_team_id ON public.tasks(related_team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_user_id ON public.tasks(related_user_id);
