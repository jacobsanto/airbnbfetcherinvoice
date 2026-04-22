import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { AirbnbAccount } from '@/types';
import toast from 'react-hot-toast';

interface Props {
  account?: AirbnbAccount;
  onClose: () => void;
}

export function AccountForm({ account, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!account;

  const [label, setLabel] = useState(account?.label ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [password, setPassword] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, string> = { label, email };
      if (password) body.password = password;
      return isEdit
        ? api.put(`/accounts/${account!.id}`, body)
        : api.post('/accounts', { label, email, password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(isEdit ? 'Account updated' : 'Account added');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-6">{isEdit ? 'Edit Account' : 'Add Airbnb Account'}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label / Nickname</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Main Property Manager"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Airbnb Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="host@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {isEdit && <span className="text-gray-400">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Airbnb password'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <p className="text-xs text-gray-500">
            Credentials are encrypted with AES-256-GCM and never stored in plaintext.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!label || !email || (!isEdit && !password) || save.isPending}
            onClick={() => save.mutate()}
            className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {save.isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
