import { AlertTriangle } from 'lucide-react';

interface Props {
  message?: string;
}

export function ApiErrorBanner({ message }: Props) {
  const isUnconfigured = !import.meta.env.VITE_API_BASE_URL;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-800">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
      <div>
        {isUnconfigured ? (
          <>
            <span className="font-semibold">Backend not configured.</span>{' '}
            Set <code className="bg-amber-100 px-1 rounded">VITE_API_BASE_URL</code> in your
            environment to connect to the API.
          </>
        ) : (
          message ?? 'Could not reach the backend. Make sure the API is running.'
        )}
      </div>
    </div>
  );
}
