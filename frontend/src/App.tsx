import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { OTPPrompt } from '@/components/auth/OTPPrompt';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { DEMO_MODE } from '@/lib/demoMode';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { JobsPage } from '@/pages/JobsPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { SettingsPage } from '@/pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Surface errors to the UI rather than swallowing them silently
      throwOnError: false,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      {DEMO_MODE && <DemoBanner />}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <OTPPrompt />
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/accounts" element={<AccountsPage />} />
                        <Route path="/jobs" element={<JobsPage />} />
                        <Route path="/invoices" element={<InvoicesPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
