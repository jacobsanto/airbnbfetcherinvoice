import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, FileText, AlertCircle, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/apiClient';
import { AirbnbAccount, DownloadJob, Invoice } from '@/types';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { NewJobForm } from '@/components/jobs/NewJobForm';
import { ApiErrorBanner } from '@/components/ui/ApiErrorBanner';
import { useRealtimeJobs } from '@/hooks/useRealtime';
import { formatMonth } from '@/lib/utils';

export function DashboardPage() {
  const [showNewJob, setShowNewJob] = useState(false);

  const { data: accounts = [], error: accountsError } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AirbnbAccount[]>('/accounts'),
  });

  const { data: recentJobs = [] } = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: () => api.get<DownloadJob[]>('/jobs?limit=10'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', 'recent'],
    queryFn: () => api.get<Invoice[]>('/invoices?limit=100'),
  });

  useRealtimeJobs();

  const failedJobs = recentJobs.filter((j) => j.status === 'failed').length;
  const activeJobs = recentJobs.filter((j) =>
    ['running', 'queued', 'awaiting_2fa'].includes(j.status)
  ).length;

  const isFirstRun = !accountsError && accounts.length === 0 && recentJobs.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <button
          onClick={() => setShowNewJob(true)}
          disabled={accounts.length === 0}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={16} /> New Download
        </button>
      </div>

      {/* API not configured banner */}
      {accountsError && (
        <div className="mb-6">
          <ApiErrorBanner message={(accountsError as Error).message} />
        </div>
      )}

      {/* First-run onboarding */}
      {isFirstRun && !accountsError && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-2xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-1">Welcome to Invoice Fetcher</h3>
          <p className="text-sm text-gray-600 mb-5">
            Follow these steps to start downloading your Airbnb commission invoices automatically.
          </p>
          <div className="space-y-3">
            {[
              { step: 1, label: 'Add your Airbnb host account', href: '/accounts', done: accounts.length > 0 },
              { step: 2, label: 'Create your first download job', href: '#', done: recentJobs.length > 0 },
              { step: 3, label: 'Your PDFs will appear in Invoices', href: '/invoices', done: invoices.length > 0 },
            ].map(({ step, label, href, done }) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-white border-2 border-brand text-brand'}`}>
                  {done ? <CheckCircle2 size={14} /> : step}
                </div>
                <span className={`text-sm flex-1 ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{label}</span>
                {!done && href !== '#' && (
                  <Link to={href} className="text-xs text-brand font-medium flex items-center gap-1 hover:underline">
                    Go <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Accounts" value={accounts.length} color="blue" />
        <StatCard icon={Briefcase} label="Active Jobs" value={activeJobs} color="yellow" />
        <StatCard icon={FileText} label="Invoices" value={invoices.length} color="green" />
        <StatCard icon={AlertCircle} label="Failed Jobs" value={failedJobs} color="red" />
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Jobs</h3>
          {recentJobs.length > 0 && (
            <Link to="/jobs" className="text-xs text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          )}
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Briefcase size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">No jobs yet</p>
            <p className="text-xs text-gray-400 mt-1">
              {accounts.length === 0
                ? 'Add an account first, then create a download job.'
                : 'Click "New Download" to fetch your first invoices.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50">
                <th className="text-left px-6 py-3">Account</th>
                <th className="text-left px-6 py-3">Period</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">
                    {job.airbnb_accounts?.label ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {formatMonth(job.month, job.year)}
                  </td>
                  <td className="px-6 py-3">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {job.invoices_found > 0
                      ? `${job.invoices_downloaded}/${job.invoices_found}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNewJob && <NewJobForm onClose={() => setShowNewJob(false)} />}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'green' | 'red';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
