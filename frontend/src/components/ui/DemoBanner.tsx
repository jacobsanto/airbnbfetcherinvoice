import { Beaker } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm px-4 py-2.5 flex items-center justify-center gap-2">
      <Beaker size={15} className="shrink-0" />
      <span>
        <strong>Demo mode</strong> — all data is simulated. To go live, add your{' '}
        <code className="bg-white/20 px-1 rounded text-xs">VITE_SUPABASE_URL</code> and{' '}
        <code className="bg-white/20 px-1 rounded text-xs">VITE_API_BASE_URL</code> in Netlify environment variables.
      </span>
    </div>
  );
}
