import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/apiClient';
import { AirbnbAccount, Schedule } from '@/types';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Schedule form state
  const [schedAccountId, setSchedAccountId] = useState('');
  const [runDay, setRunDay] = useState(1);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AirbnbAccount[]>('/accounts'),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.get<Schedule[]>('/schedules'),
  });

  const upsertSchedule = useMutation({
    mutationFn: () =>
      api.put('/schedules', { account_id: schedAccountId, enabled: true, run_day: runDay }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule saved');
      setSchedAccountId('');
      setRunDay(1);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleSchedule = useMutation({
    mutationFn: ({ accountId, enabled, runDay }: { accountId: string; enabled: boolean; runDay: number }) =>
      api.put('/schedules', { account_id: accountId, enabled, run_day: runDay }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSchedule = useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated');
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

      <div className="max-w-2xl space-y-6">
        {/* Account info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Joined: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          </p>
        </div>

        {/* Password change */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              disabled={pwLoading || !newPassword}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Monthly schedules */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Monthly Auto-Download</h3>
          <p className="text-sm text-gray-500 mb-5">
            Automatically download invoices for an account on the same day each month.
          </p>

          {/* Add / edit schedule */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={schedAccountId}
              onChange={(e) => setSchedAccountId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand flex-1 min-w-[180px]"
            >
              <option value="">Select account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>

            <select
              value={runDay}
              onChange={(e) => setRunDay(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {ordinal(d)} of each month
                </option>
              ))}
            </select>

            <button
              disabled={!schedAccountId || upsertSchedule.isPending}
              onClick={() => upsertSchedule.mutate()}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
            >
              {upsertSchedule.isPending ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>

          {/* Existing schedules */}
          {schedules.length === 0 ? (
            <p className="text-sm text-gray-400">No schedules configured.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.airbnb_accounts?.label ?? s.account_id}
                    </p>
                    <p className="text-xs text-gray-500">
                      Runs on the {ordinal(s.run_day)} of each month
                      {s.last_run_at
                        ? ` · last run ${new Date(s.last_run_at).toLocaleDateString()}`
                        : ' · never run'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={s.enabled}
                        onChange={(e) =>
                          toggleSchedule.mutate({
                            accountId: s.account_id,
                            enabled: e.target.checked,
                            runDay: s.run_day,
                          })
                        }
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-brand rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                    <button
                      onClick={() => deleteSchedule.mutate(s.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
