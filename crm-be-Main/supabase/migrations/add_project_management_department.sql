-- Add Project Management Department
INSERT INTO departments (name, slug, description, icon, color, is_active)
VALUES 
  ('Project Management', 'project-management', 'Manage all projects and tasks', 'briefcase', '#10b981', true)
ON CONFLICT (slug) DO UPDATE 
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  is_active = true;
