-- Enable Row Level Security on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airbnb_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "user_profiles_own" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- airbnb_accounts
CREATE POLICY "airbnb_accounts_own" ON public.airbnb_accounts
    FOR ALL USING (auth.uid() = user_id);

-- download_jobs
CREATE POLICY "download_jobs_own" ON public.download_jobs
    FOR ALL USING (auth.uid() = user_id);

-- invoices
CREATE POLICY "invoices_own" ON public.invoices
    FOR ALL USING (auth.uid() = user_id);

-- notifications
CREATE POLICY "notifications_own" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- otp_requests: access via job ownership
CREATE POLICY "otp_requests_own" ON public.otp_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.download_jobs dj
            WHERE dj.id = otp_requests.job_id
              AND dj.user_id = auth.uid()
        )
    );
