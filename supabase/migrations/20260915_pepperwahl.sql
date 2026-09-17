-- Pepperwahl Surveys Feature Migration
-- Tables: pepperwahl_surveys, pepperwahl_completions

-- ============================================================
-- 1. pepperwahl_surveys
--    Stores surveys received from Pepperwahl via webhook.
--    Admin can activate/deactivate and edit pre-screening questions.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pepperwahl_surveys (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id         text NOT NULL UNIQUE,         -- Pepperwahl's own ID e.g. "SMC57"
  survey_name       text NOT NULL,
  survey_link       text NOT NULL,                -- Contains {{user_id}} placeholder
  description       text,
  payout_usd        numeric(10, 2) DEFAULT 0,
  country           text,                          -- Target country e.g. "US"
  min_age           integer DEFAULT 18,
  max_age           integer DEFAULT 65,
  loi_minutes       integer,                       -- Length of interview in minutes
  survey_type       text,
  notes             text,
  expiry_date       date,
  questions         jsonb DEFAULT '[]'::jsonb,     -- Array of {question, options, qualify_if}
  status            text NOT NULL DEFAULT 'inactive', -- 'active' | 'inactive'
  received_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'pepperwahl_surveys_updated_at'
  ) THEN
    CREATE TRIGGER pepperwahl_surveys_updated_at
      BEFORE UPDATE ON public.pepperwahl_surveys
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================================
-- 2. pepperwahl_completions
--    Tracks clicks and completions per user per survey.
--    Populated by:
--      - Pre-screening pass → click recorded (status='clicked')
--      - Pepperwahl postback → status updated to 'completed'
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pepperwahl_completions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id         text NOT NULL REFERENCES public.pepperwahl_surveys(survey_id) ON DELETE CASCADE,
  user_id           text,                          -- profiles.id (nullable for anonymous)
  username          text,                          -- profiles.username
  uid_passed        text,                          -- The uid actually passed in the survey link
  status            text NOT NULL DEFAULT 'clicked', -- 'clicked' | 'completed' | 'disqualified'
  txn_id            text,                          -- Postback transaction ID from Pepperwahl
  ip_address        text,
  user_agent        text,
  clicked_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  raw_postback      jsonb                          -- Raw postback params stored for debugging
);

CREATE INDEX IF NOT EXISTS idx_pepperwahl_completions_survey_id ON public.pepperwahl_completions(survey_id);
CREATE INDEX IF NOT EXISTS idx_pepperwahl_completions_user_id ON public.pepperwahl_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_pepperwahl_completions_status ON public.pepperwahl_completions(status);

-- ============================================================
-- 3. RLS Policies
-- ============================================================

-- pepperwahl_surveys: public read for active surveys, admin full access
ALTER TABLE public.pepperwahl_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active pepperwahl surveys"
  ON public.pepperwahl_surveys FOR SELECT
  USING (status = 'active' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE));

CREATE POLICY "Admins have full access to pepperwahl surveys"
  ON public.pepperwahl_surveys FOR ALL
  USING (public.is_admin_or_subadmin());

-- pepperwahl_completions: service role writes, users can read own
ALTER TABLE public.pepperwahl_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own pepperwahl completions"
  ON public.pepperwahl_completions FOR SELECT
  USING (user_id = (SELECT id::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Admins have full access to pepperwahl completions"
  ON public.pepperwahl_completions FOR ALL
  USING (public.is_admin_or_subadmin());

-- ============================================================
-- 4. pepperwahl_postback_logs
--    Logs every raw postback received from Pepperwahl.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pepperwahl_postback_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id    text,
  uid          text,
  txn_id       text,
  status_raw   text,
  normalized   text,                 -- 'success' | 'duplicate' | 'not_found' | 'failed' | 'ignored'
  user_id      text,                 -- resolved profiles.id
  username     text,
  ip_address   text,
  raw_params   jsonb,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pepperwahl_postback_logs_survey_id ON public.pepperwahl_postback_logs(survey_id);
CREATE INDEX IF NOT EXISTS idx_pepperwahl_postback_logs_created_at ON public.pepperwahl_postback_logs(created_at DESC);

ALTER TABLE public.pepperwahl_postback_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to pepperwahl postback logs"
  ON public.pepperwahl_postback_logs FOR ALL
  USING (public.is_admin_or_subadmin());
