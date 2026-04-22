import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, getUserId } from '../middleware/auth';
import * as accountService from '../services/accountService';
import { invoiceQueue } from '../lib/queue';

const createSchema = z.object({
  label: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(1),
});

const updateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
});

export async function accountsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (req, reply) => {
    const accounts = await accountService.listAccounts(getUserId(req));
    return accounts;
  });

  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const account = await accountService.getAccount(getUserId(req), id);
    if (!account) return reply.status(404).send({ error: 'Account not found' });
    return account;
  });

  fastify.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body);
    const account = await accountService.createAccount(getUserId(req), body);
    return reply.status(201).send(account);
  });

  fastify.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateSchema.parse(req.body);
    const account = await accountService.updateAccount(getUserId(req), id, body);
    return account;
  });

  fastify.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await accountService.deleteAccount(getUserId(req), id);
    return reply.status(204).send();
  });

  // Enqueue a quick test-login job
  fastify.post('/:id/test', async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = getUserId(req);
    const account = await accountService.getAccount(userId, id);
    if (!account) return reply.status(404).send({ error: 'Account not found' });

    await invoiceQueue.add('test-login', { accountId: id, userId, test: true });
    return { message: 'Test login queued' };
  });
}
