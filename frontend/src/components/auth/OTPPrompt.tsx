import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { useAwaitingTwoFA } from '@/hooks/useRealtime';
import toast from 'react-hot-toast';

export function OTPPrompt() {
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(600);

  const onRequired = useCallback((jobId: string) => {
    setPendingJobId(jobId);
    setOtpCode('');
    setSecondsLeft(600);
  }, []);

  useAwaitingTwoFA(onRequired);

  useEffect(() => {
    if (!pendingJobId) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setPendingJobId(null);
          toast.error('2FA timeout expired');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingJobId]);

  const submit = useMutation({
    mutationFn: (code: string) =>
      api.post(`/otp/${pendingJobId}`, { otp_code: code }),
    onSuccess: () => {
      setPendingJobId(null);
      toast.success('Verification code submitted');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (!pendingJobId) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-2">Two-Factor Authentication Required</h2>
        <p className="text-gray-600 text-sm mb-6">
          Airbnb sent a verification code to your registered device. Enter it below to continue the
          invoice download.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verification Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="000000"
            autoFocus
          />
        </div>

        <p className="text-center text-sm text-gray-500 mb-6">
          Expires in{' '}
          <span className={secondsLeft < 60 ? 'text-red-500 font-bold' : 'font-semibold'}>
            {minutes}:{String(seconds).padStart(2, '0')}
          </span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => setPendingJobId(null)}
            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={otpCode.length < 4 || submit.isPending}
            onClick={() => submit.mutate(otpCode)}
            className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submit.isPending ? 'Submitting...' : 'Submit Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
