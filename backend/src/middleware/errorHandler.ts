import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode < 500 ? error.message : 'Internal server error';

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  reply.status(statusCode).send({ error: message });
}
