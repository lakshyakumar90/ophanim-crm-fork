-- Create team_notes table
CREATE TABLE IF NOT EXISTS public.team_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Policy: View notes
-- Admins can view all notes.
-- Members can view notes of their team.
CREATE POLICY "View team notes" ON public.team_notes
    FOR SELECT
    USING (
        (auth.jwt() ->> 'role')::text = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.team_id = team_notes.team_id
        )
    );

-- Policy: Create notes
-- Admins can create notes in any team.
-- Members can create notes in their own team.
CREATE POLICY "Create team notes" ON public.team_notes
    FOR INSERT
    WITH CHECK (
        (auth.jwt() ->> 'role')::text = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.team_id = team_notes.team_id
        )
    );

-- Policy: Update notes
-- Only admins can update notes (users cannot edit as per requirement "cant be deleted if posted once").
-- Wait, user said "cant be deleted if posted once" but also "admin can see edit delete all".
-- So only admins can update.
CREATE POLICY "Update team notes" ON public.team_notes
    FOR UPDATE
    USING (
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Policy: Delete notes
-- Only admins can delete notes.
CREATE POLICY "Delete team notes" ON public.team_notes
    FOR DELETE
    USING (
        (auth.jwt() ->> 'role')::text = 'admin'
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_notes_team_id ON public.team_notes(team_id);
