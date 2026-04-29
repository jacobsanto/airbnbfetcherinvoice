-- ============================================================
-- SCHEDULED JOBS — monthly auto-download configuration
-- ============================================================
CREATE TABLE public.scheduled_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES public.airbnb_accounts(id) ON DELETE CASCADE,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    run_day         SMALLINT NOT NULL DEFAULT 1
                        CHECK (run_day BETWEEN 1 AND 28),
    last_run_at     TIMESTAMPTZ,
    last_job_id     UUID REFERENCES public.download_jobs(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, account_id)
);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_jobs_own" ON public.scheduled_jobs
    FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER trg_scheduled_jobs_updated_at
    BEFORE UPDATE ON public.scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_scheduled_jobs_enabled ON public.scheduled_jobs(enabled)
    WHERE enabled = TRUE;
