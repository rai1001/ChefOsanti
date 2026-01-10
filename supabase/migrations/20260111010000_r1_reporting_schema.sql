-- Create tables for Reporting Module

-- Table: reporting_generated_reports
-- Stores the final output (markdown) and source data (json metrics) of a report.
-- This serves as both the "log" of reports and the cache for viewing them.
CREATE TABLE IF NOT EXISTS reporting_generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Report Metadata
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'on_demand')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Content
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_md TEXT, -- Nullable if generation fails or is in progress, but typically populated
  
  -- Status
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
  error_message TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS: reporting_generated_reports
ALTER TABLE reporting_generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports for their orgs"
  ON reporting_generated_reports
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports for their orgs"
  ON reporting_generated_reports
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_reporting_generated_reports_org_date ON reporting_generated_reports(org_id, created_at DESC);
CREATE INDEX idx_reporting_generated_reports_period ON reporting_generated_reports(org_id, period_start);
