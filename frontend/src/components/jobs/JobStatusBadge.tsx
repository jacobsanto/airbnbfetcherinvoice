import { cn } from '@/lib/utils';
import { JobStatus } from '@/types';

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  pending:     { label: 'Pending',      className: 'bg-gray-100 text-gray-700' },
  queued:      { label: 'Queued',       className: 'bg-blue-100 text-blue-700' },
  running:     { label: 'Running',      className: 'bg-yellow-100 text-yellow-700 animate-pulse' },
  awaiting_2fa:{ label: 'Needs 2FA',   className: 'bg-orange-100 text-orange-700 animate-pulse' },
  completed:   { label: 'Completed',    className: 'bg-green-100 text-green-700' },
  failed:      { label: 'Failed',       className: 'bg-red-100 text-red-700' },
  cancelled:   { label: 'Cancelled',    className: 'bg-gray-100 text-gray-500' },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { label, className } = statusConfig[status] ?? statusConfig.pending;
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', className)}>
      {label}
    </span>
  );
}
