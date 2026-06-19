import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export function registerErrorHandler(app: {
  setErrorHandler: (
    handler: (error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => void
  ) => void;
}) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    reply.status(error.statusCode ?? 500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "Unexpected server error"
      }
    });
  });
}
