-- Add Finance Department
INSERT INTO departments (name, slug, description, icon, color)
VALUES ('Finance', 'finance', 'Finance and Accounting Department', 'Wallet', 'green')
ON CONFLICT (slug) DO NOTHING;
