-- Performance workflow hardening: director approval + employee acknowledgment

ALTER TABLE IF EXISTS review_cycles
  ADD COLUMN IF NOT EXISTS final_approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_approval_note TEXT;

ALTER TABLE IF EXISTS performance_reviews
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledgement_note TEXT;

CREATE INDEX IF NOT EXISTS idx_review_cycles_final_approved_at
  ON review_cycles(final_approved_at);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_acknowledged_at
  ON performance_reviews(acknowledged_at);
