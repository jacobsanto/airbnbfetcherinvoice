import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUserId } from '../middleware/auth';
import * as scheduleService from '../services/scheduleService';

const upsertSchema = z.object({
  account_id: z.string().uuid(),
  enabled: z.boolean().default(true),
  run_day: z.number().int().min(1).max(28).default(1),
});

export async function schedulesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (req) => {
    return scheduleService.listSchedules(getUserId(req));
  });

  fastify.put('/', async (req, reply) => {
    const body = upsertSchema.parse(req.body);
    const schedule = await scheduleService.upsertSchedule(
      getUserId(req),
      body.account_id,
      body.enabled,
      body.run_day
    );
    return reply.status(200).send(schedule);
  });

  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await scheduleService.deleteSchedule(getUserId(req), id);
    return reply.status(204).send();
  });
}
