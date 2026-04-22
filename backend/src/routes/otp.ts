import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { authenticate, getUserId } from '../middleware/auth';
import { config } from '../config';

const submitSchema = z.object({
  otp_code: z.string().min(4).max(10),
});

export async function otpRoutes(fastify: FastifyInstance) {
  // Scraper polls this endpoint (authenticated with internal secret)
  fastify.get('/:jobId', async (req, reply) => {
    const internalSecret = req.headers['x-internal-secret'];
    if (internalSecret !== config.INTERNAL_API_SECRET) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { jobId } = req.params as { jobId: string };

    const { data, error } = await supabaseAdmin
      .from('otp_requests')
      .select('id, otp_code, status, expires_at')
      .eq('job_id', jobId)
      .eq('status', 'submitted')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { status: 'waiting', otp_code: null };
    }

    // Mark as used immediately
    await supabaseAdmin
      .from('otp_requests')
      .update({ status: 'used' })
      .eq('id', data.id);

    return { status: 'received', otp_code: data.otp_code };
  });

  // User submits OTP via frontend
  fastify.post('/:jobId', { preHandler: authenticate }, async (req, reply) => {
    const { jobId } = req.params as { jobId: string };
    const userId = getUserId(req);
    const body = submitSchema.parse(req.body);

    // Verify job belongs to user
    const { data: job } = await supabaseAdmin
      .from('download_jobs')
      .select('id, status')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (!job) return reply.status(404).send({ error: 'Job not found' });
    if (job.status !== 'awaiting_2fa') {
      return reply.status(400).send({ error: 'Job is not awaiting 2FA' });
    }

    // Update pending otp_request with the submitted code
    const { error } = await supabaseAdmin
      .from('otp_requests')
      .update({ otp_code: body.otp_code, status: 'submitted' })
      .eq('job_id', jobId)
      .eq('status', 'waiting');

    if (error) throw error;

    return { message: 'OTP submitted successfully' };
  });
}
