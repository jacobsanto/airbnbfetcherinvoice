import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { Invoice, AirbnbAccount } from '@/types';
import { formatCurrency, formatBytes, formatMonth } from '@/lib/utils';
import toast from 'react-hot-toast';

export function InvoicesPage() {
  const [accountFilter, setAccountFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AirbnbAccount[]>('/accounts'),
  });

  const queryParams = new URLSearchParams();
  if (accountFilter) queryParams.set('account_id', accountFilter);
  if (yearFilter) queryParams.set('year', yearFilter);
  if (monthFilter) queryParams.set('month', monthFilter);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', accountFilter, yearFilter, monthFilter],
    queryFn: () => api.get<Invoice[]>(`/invoices?${queryParams}`),
  });

  const handleDownload = async (invoiceId: string, invoiceNumber: string | null) => {
    try {
      const { signedUrl } = await api.get<{ signedUrl: string }>(`/invoices/${invoiceId}/download`);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = `invoice-${invoiceNumber ?? invoiceId}.pdf`;
      a.click();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' }),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
        <span className="text-sm text-gray-500">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">All months</option>
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No invoices found for the selected filters.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 bg-gray-50">
                <th className="text-left px-6 py-3">Invoice #</th>
                <th className="text-left px-6 py-3">Account</th>
                <th className="text-left px-6 py-3">Period</th>
                <th className="text-left px-6 py-3">Type</th>
                <th className="text-left px-6 py-3">Amount</th>
                <th className="text-left px-6 py-3">Size</th>
                <th className="text-left px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">
                    {invoice.invoice_number ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {invoice.airbnb_accounts?.label ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatMonth(invoice.period_month, invoice.period_year)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                    {invoice.invoice_type ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatBytes(invoice.file_size_bytes)}
                  </td>
                  <td className="px-6 py-4">
                    {invoice.status === 'downloaded' && invoice.storage_path && (
                      <button
                        onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                        className="p-1.5 text-gray-400 hover:text-brand hover:bg-red-50 rounded transition-colors"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
