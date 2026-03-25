-- Private bucket for HR employee documents (backend uploads via service role; signed URLs for viewing)

INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-documents', 'hr-documents', false)
ON CONFLICT (id) DO NOTHING;
