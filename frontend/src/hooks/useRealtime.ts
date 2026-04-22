import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { DownloadJob } from '@/types';

export function useRealtimeJobs() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('download_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'download_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate and refetch jobs queries
          queryClient.invalidateQueries({ queryKey: ['jobs'] });

          // If a specific job updated, update it in cache
          if (payload.new && typeof payload.new === 'object') {
            const updatedJob = payload.new as DownloadJob;
            queryClient.setQueryData(['jobs', updatedJob.id], updatedJob);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}

export function useRealtimeNotifications(onNew?: () => void) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          onNew?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, onNew]);
}

export function useAwaitingTwoFA(onRequired?: (jobId: string) => void) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('jobs_2fa_watch')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'download_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const job = payload.new as DownloadJob;
          if (job.status === 'awaiting_2fa') {
            onRequired?.(job.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onRequired]);
}
