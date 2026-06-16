-- Phase 4 PM: link expenses to projects for project cost tracking

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'expenses'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'expenses'
      AND column_name = 'project_id'
  ) THEN
    ALTER TABLE expenses
      ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
  END IF;
END $$;
