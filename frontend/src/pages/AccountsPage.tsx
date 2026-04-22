import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { AirbnbAccount } from '@/types';
import { AccountForm } from '@/components/accounts/AccountForm';
import toast from 'react-hot-toast';

const statusIcon = {
  active: <CheckCircle size={14} className="text-green-500" />,
  inactive: <XCircle size={14} className="text-gray-400" />,
  error: <AlertCircle size={14} className="text-red-500" />,
  needs_2fa: <AlertCircle size={14} className="text-orange-500" />,
};

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<AirbnbAccount | undefined>();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AirbnbAccount[]>('/accounts'),
  });

  const deleteAccount = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testLogin = useMutation({
    mutationFn: (id: string) => api.post(`/accounts/${id}/test`, {}),
    onSuccess: () => toast.success('Test login queued'),
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = (account: AirbnbAccount) => {
    if (confirm(`Delete account "${account.label}"? This will also delete all associated jobs and invoices.`)) {
      deleteAccount.mutate(account.id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Airbnb Accounts</h2>
        <button
          onClick={() => { setEditAccount(undefined); setShowForm(true); }}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-hover transition-colors"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm">No accounts yet. Add your first Airbnb account to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{account.label}</h3>
                  <p className="text-sm text-gray-500">{account.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  {statusIcon[account.status]}
                  <span className="text-xs text-gray-500 capitalize">{account.status}</span>
                </div>
              </div>

              {account.last_error && (
                <p className="text-xs text-red-500 mb-3 truncate">{account.last_error}</p>
              )}

              {account.last_login_at && (
                <p className="text-xs text-gray-400 mb-4">
                  Last login: {new Date(account.last_login_at).toLocaleDateString()}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => testLogin.mutate(account.id)}
                  className="text-xs text-gray-500 hover:text-brand border border-gray-200 rounded px-2 py-1 transition-colors"
                >
                  Test Login
                </button>
                <button
                  onClick={() => { setEditAccount(account); setShowForm(true); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDelete(account)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AccountForm
          account={editAccount}
          onClose={() => { setShowForm(false); setEditAccount(undefined); }}
        />
      )}
    </div>
  );
}
