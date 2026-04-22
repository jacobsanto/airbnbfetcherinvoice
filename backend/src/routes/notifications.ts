import { FastifyInstance } from 'fastify';
import { authenticate, getUserId } from '../middleware/auth';
import * as notificationService from '../services/notificationService';

export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (req) => {
    const query = req.query as Record<string, string>;
    const unreadOnly = query.is_read === 'false';
    return notificationService.listNotifications(getUserId(req), unreadOnly);
  });

  fastify.put('/:id/read', async (req, reply) => {
    const { id } = req.params as { id: string };
    await notificationService.markRead(getUserId(req), id);
    return reply.status(204).send();
  });

  fastify.put('/read-all', async (req, reply) => {
    await notificationService.markAllRead(getUserId(req));
    return reply.status(204).send();
  });
}
