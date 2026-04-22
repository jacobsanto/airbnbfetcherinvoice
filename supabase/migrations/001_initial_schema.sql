-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE public.user_profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    full_name     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- AIRBNB ACCOUNTS
-- ============================================================
CREATE TABLE public.airbnb_accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    label               TEXT NOT NULL,
    email               TEXT NOT NULL,
    encrypted_password  TEXT NOT NULL,
    encryption_iv       TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'error', 'needs_2fa')),
    last_login_at       TIMESTAMPTZ,
    last_error          TEXT,
    session_cookie      TEXT,
    session_cookie_iv   TEXT,
    session_expires_at  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, email)
);

-- ============================================================
-- DOWNLOAD JOBS
-- ============================================================
CREATE TABLE public.download_jobs (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id            UUID NOT NULL REFERENCES public.airbnb_accounts(id) ON DELETE CASCADE,
    status                TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN (
                                  'pending', 'queued', 'running',
                                  'awaiting_2fa', 'completed', 'failed', 'cancelled'
                              )),
    month                 SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                  SMALLINT NOT NULL CHECK (year BETWEEN 2010 AND 2100),
    invoices_found        INTEGER DEFAULT 0,
    invoices_downloaded   INTEGER DEFAULT 0,
    error_message         TEXT,
    started_at            TIMESTAMPTZ,
    completed_at          TIMESTAMPTZ,
    bullmq_job_id         TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE public.invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL REFERENCES public.download_jobs(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES public.airbnb_accounts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    invoice_number  TEXT,
    invoice_type    TEXT,
    period_month    SMALLINT NOT NULL,
    period_year     SMALLINT NOT NULL,
    amount          NUMERIC(12, 2),
    currency        CHAR(3),
    airbnb_url      TEXT,
    storage_path    TEXT,
    file_size_bytes BIGINT,
    downloaded_at   TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'downloaded', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    job_id      UUID REFERENCES public.download_jobs(id) ON DELETE SET NULL,
    type        TEXT NOT NULL
                    CHECK (type IN (
                        'job_completed', 'job_failed', 'job_started',
                        'invoice_downloaded', '2fa_required', 'monthly_summary'
                    )),
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OTP REQUESTS (2FA handshake)
-- ============================================================
CREATE TABLE public.otp_requests (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id      UUID NOT NULL REFERENCES public.download_jobs(id) ON DELETE CASCADE,
    account_id  UUID NOT NULL REFERENCES public.airbnb_accounts(id) ON DELETE CASCADE,
    otp_code    TEXT,
    status      TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'submitted', 'expired', 'used')),
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_airbnb_accounts_updated_at
    BEFORE UPDATE ON public.airbnb_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_download_jobs_updated_at
    BEFORE UPDATE ON public.download_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_airbnb_accounts_user_id ON public.airbnb_accounts(user_id);
CREATE INDEX idx_download_jobs_user_id ON public.download_jobs(user_id);
CREATE INDEX idx_download_jobs_account_id ON public.download_jobs(account_id);
CREATE INDEX idx_download_jobs_status ON public.download_jobs(status);
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_account_id ON public.invoices(account_id);
CREATE INDEX idx_invoices_period ON public.invoices(period_year, period_month);
CREATE INDEX idx_notifications_user_id_unread ON public.notifications(user_id, is_read);
CREATE INDEX idx_otp_requests_job_id ON public.otp_requests(job_id);
CREATE INDEX idx_otp_requests_status ON public.otp_requests(status);
