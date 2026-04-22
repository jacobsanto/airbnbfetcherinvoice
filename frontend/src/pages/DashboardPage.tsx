import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, FileText, AlertCircle, Plus } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { AirbnbAccount, DownloadJob, Invoice } from '@/types';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { NewJobForm } from '@/components/jobs/NewJobForm';
import { useRealtimeJobs } from '@/hooks/useRealtime';
import { formatMonth } from '@/lib/utils';

export function DashboardPage() {
  const [showNewJob, setShowNewJob] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AirbnbAccount[]>('/accounts'),
  });

  const { data: recentJobs = [] } = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: () => api.get<DownloadJob[]>('/jobs?limit=10'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', 'recent'],
    queryFn: () => api.get<Invoice[]>('/invoices?limit=5'),
  });

  useRealtimeJobs();

  const failedJobs = recentJobs.filter((j) => j.status === 'failed').length;
  const activeJobs = recentJobs.filter((j) =>
    ['running', 'queued', 'awaiting_2fa'].includes(j.status)
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <button
          onClick={() => setShowNewJob(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover transition-colors"
        >
          <Plus size={16} /> New Download
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Accounts" value={accounts.length} color="blue" />
        <StatCard icon={Briefcase} label="Active Jobs" value={activeJobs} color="yellow" />
        <StatCard icon={FileText} label="Invoices" value={invoices.length} color="green" />
        <StatCard icon={AlertCircle} label="Failed Jobs" value={failedJobs} color="red" />
      </div>

      {/* Recent jobs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Jobs</h3>
        </div>

        {recentJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Briefcase size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No jobs yet. Start by adding an account and running a download.</p>
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
