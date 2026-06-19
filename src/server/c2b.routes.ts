import type { FastifyInstance } from "fastify";
import type { C2BService } from "../modules/c2b/c2b.service.js";

export async function registerC2BRoutes(app: FastifyInstance, c2b: C2BService) {
  app.post("/mpesa/c2b/v1/registerurl", async (request) => c2b.registerUrl(request.body));
  app.post("/mpesa/c2b/v1/simulate", async (request) => c2b.simulate(request.body));
}
