import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUserId } from '../middleware/auth';
import * as jobService from '../services/jobService';

const createSchema = z.object({
  account_id: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2010).max(2100),
});

export async function jobsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (req) => {
    const query = req.query as Record<string, string>;
    return jobService.listJobs(getUserId(req), {
      status: query.status,
      account_id: query.account_id,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
    });
  });

  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await jobService.getJob(getUserId(req), id);
    if (!job) return reply.status(404).send({ error: 'Job not found' });
    return job;
  });

  fastify.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body);
    const job = await jobService.createJob(getUserId(req), body);
    return reply.status(201).send(job);
  });

  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await jobService.cancelJob(getUserId(req), id);
    return reply.status(204).send();
  });
}
