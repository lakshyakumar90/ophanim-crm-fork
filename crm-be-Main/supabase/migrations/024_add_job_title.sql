-- Migration: Add job_title field to users table
-- Description: Allows categorizing users by specialization for project team assignment

-- Add job_title column with default 'other'
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(50) DEFAULT 'other';

-- Create index for filtering by job_title
CREATE INDEX IF NOT EXISTS idx_users_job_title ON users(job_title);

-- Valid job titles:
-- 'project_manager' - Can be assigned as Project Manager
-- 'developer' - Developer specialization
-- 'seo_specialist' - SEO Specialist  
-- 'content_writer' - Content Writer
-- 'designer' - Designer
-- 'other' - Other roles (default)

COMMENT ON COLUMN users.job_title IS 'User specialization: project_manager, developer, seo_specialist, content_writer, designer, other';
