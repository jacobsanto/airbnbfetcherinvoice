import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { DownloadJob } from '@/types';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';
import { NewJobForm } from '@/components/jobs/NewJobForm';
import { useRealtimeJobs } from '@/hooks/useRealtime';
import { formatMonth } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export function JobsPage() {
  const queryClient = useQueryClient();
  const [showNewJob, setShowNewJob] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', statusFilter],
    queryFn: () => api.get<DownloadJob[]>(`/jobs${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  const cancelJob = useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job cancelled');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useRealtimeJobs();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Download Jobs</h2>
        <button
          onClick={() => setShowNewJob(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover transition-colors"
        >
          <Plus size={16} /> New Job
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'pending', 'running', 'completed', 'failed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-brand text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No jobs found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50">
                <th className="text-left px-6 py-3">Account</th>
                <th className="text-left px-6 py-3">Period</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Progress</th>
                <th className="text-left px-6 py-3">Started</th>
                <th className="text-left px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {job.airbnb_accounts?.label ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatMonth(job.month, job.year)}
                  </td>
                  <td className="px-6 py-4">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {job.invoices_found > 0 ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-brand rounded-full transition-all"
                              style={{
                                width: `${(job.invoices_downloaded / job.invoices_found) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs">{job.invoices_downloaded}/{job.invoices_found}</span>
                        </div>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {job.started_at
                      ? formatDistanceToNow(new Date(job.started_at), { addSuffix: true })
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {['pending', 'queued'].includes(job.status) && (
                      <button
                        onClick={() => cancelJob.mutate(job.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
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
