import type { FastifyInstance } from "fastify";

export async function registerMetadataRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/version", async () => ({ name: "daraja-local", version: "1.0.0" }));
}
