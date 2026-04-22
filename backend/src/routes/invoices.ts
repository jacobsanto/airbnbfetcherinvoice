import { FastifyInstance } from 'fastify';
import { authenticate, getUserId } from '../middleware/auth';
import * as invoiceService from '../services/invoiceService';

export async function invoicesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', async (req) => {
    const query = req.query as Record<string, string>;
    return invoiceService.listInvoices(getUserId(req), {
      account_id: query.account_id,
      year: query.year ? Number(query.year) : undefined,
      month: query.month ? Number(query.month) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
    });
  });

  fastify.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const invoice = await invoiceService.getInvoice(getUserId(req), id);
    if (!invoice) return reply.status(404).send({ error: 'Invoice not found' });
    return invoice;
  });

  fastify.get('/:id/download', async (req, reply) => {
    const { id } = req.params as { id: string };
    return invoiceService.getInvoiceDownloadUrl(getUserId(req), id);
  });
}
