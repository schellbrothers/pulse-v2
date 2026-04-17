-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 003: Contact-centric opportunities model
-- Date: 2026-04-17
-- 
-- This migration creates the proper data model for the 7-stage CRM funnel:
-- - contact_members: primary/secondary people per household
-- - opportunities: per-community journey record (one contact, many communities)
-- - stage_transitions: audit trail for every funnel movement
-- - crm_funnel_stage enum: marketing→lead→opportunity→prospect_c/b/a→homeowner
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Contact Members
CREATE TABLE IF NOT EXISTS contact_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'primary',
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text,
  phone           text,
  relationship    text,
  is_primary      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_members_contact ON contact_members(contact_id);

-- 2. CRM Funnel Stage Enum
DO $$ BEGIN
  CREATE TYPE crm_funnel_stage AS ENUM (
    'marketing', 'lead', 'opportunity',
    'prospect_c', 'prospect_b', 'prospect_a', 'homeowner'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contact_id        uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  crm_stage         crm_funnel_stage NOT NULL DEFAULT 'marketing',
  division_id       uuid REFERENCES divisions(id) ON DELETE SET NULL,
  community_id      uuid REFERENCES communities(id) ON DELETE SET NULL,
  osc_id            uuid REFERENCES users(id) ON DELETE SET NULL,
  csm_id            uuid REFERENCES users(id) ON DELETE SET NULL,
  osc_assigned_at   timestamptz,
  csm_assigned_at   timestamptz,
  osc_route_decision text,
  osc_routed_at     timestamptz,
  opportunity_source text,
  floor_plan_id     uuid REFERENCES floor_plans(id) ON DELETE SET NULL,
  home_site_id      uuid,
  budget_min        numeric(12,2),
  budget_max        numeric(12,2),
  desired_move_in   date,
  contract_date     date,
  estimated_close   date,
  purchase_price    numeric(12,2),
  settlement_date   date,
  move_in_date      date,
  source            text,
  source_detail     jsonb,
  notes             text,
  engagement_score  numeric(5,2),
  score_updated_at  timestamptz,
  last_activity_at      timestamptz,
  last_activity_in_at   timestamptz,
  last_activity_out_at  timestamptz,
  mailchimp_audience_id text,
  mailchimp_last_synced_at timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  lost_at           timestamptz,
  lost_reason       text,
  pv1_lead_id       integer,
  pv1_prospect_id   integer,
  pv1_home_owner_id integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opps_contact ON opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opps_community ON opportunities(community_id);
CREATE INDEX IF NOT EXISTS idx_opps_division ON opportunities(division_id);
CREATE INDEX IF NOT EXISTS idx_opps_stage ON opportunities(org_id, crm_stage);

-- Stage validation constraints
ALTER TABLE opportunities ADD CONSTRAINT chk_marketing_needs_division
  CHECK (crm_stage != 'marketing' OR division_id IS NOT NULL);
ALTER TABLE opportunities ADD CONSTRAINT chk_lead_needs_community
  CHECK (crm_stage = 'marketing' OR community_id IS NOT NULL);

-- 4. Stage Transitions
CREATE TABLE IF NOT EXISTS stage_transitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  opportunity_id  uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  from_stage      crm_funnel_stage,
  to_stage        crm_funnel_stage NOT NULL,
  triggered_by    text NOT NULL DEFAULT 'manual',
  triggered_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason          text,
  score_at_transition numeric(5,2),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_trans_opp ON stage_transitions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_stage_trans_contact ON stage_transitions(contact_id);

-- 5. Triggers
CREATE OR REPLACE FUNCTION fn_log_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.crm_stage IS DISTINCT FROM NEW.crm_stage THEN
    INSERT INTO stage_transitions (org_id, opportunity_id, contact_id, from_stage, to_stage, triggered_by)
    VALUES (NEW.org_id, NEW.id, NEW.contact_id, OLD.crm_stage, NEW.crm_stage, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_stage_transition
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION fn_log_stage_transition();
