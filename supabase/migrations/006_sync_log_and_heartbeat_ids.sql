-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 006: sync_log table + heartbeat mapping columns
-- Date: 2026-04-17
--
-- Adds:
--   1. sync_log — generic ingestion sync tracking (source, timestamp, row count)
--   2. divisions.heartbeat_division_id — maps HBv1 division IDs to Pv2 UUIDs
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Sync Log
CREATE TABLE IF NOT EXISTS sync_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL,                    -- 'webforms', 'rilla', 'zoom', etc.
  synced_at   timestamptz NOT NULL DEFAULT now(),
  rows_synced integer NOT NULL DEFAULT 0,
  metadata    jsonb,                            -- flexible: errors, duration, counts
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_source ON sync_log(source, synced_at DESC);

-- 2. Heartbeat division ID on divisions (HBv1 uses integer IDs: 1=DE, 2=VA, 4=TN)
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS heartbeat_division_id integer;
CREATE INDEX IF NOT EXISTS idx_divisions_hb_id ON divisions(heartbeat_division_id)
  WHERE heartbeat_division_id IS NOT NULL;

-- Seed the heartbeat IDs for existing divisions
UPDATE divisions SET heartbeat_division_id = 1 WHERE code = 'DE' AND heartbeat_division_id IS NULL;
UPDATE divisions SET heartbeat_division_id = 2 WHERE code = 'VA' AND heartbeat_division_id IS NULL;
UPDATE divisions SET heartbeat_division_id = 4 WHERE code = 'TN' AND heartbeat_division_id IS NULL;
