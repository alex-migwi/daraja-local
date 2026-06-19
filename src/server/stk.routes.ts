import type { FastifyInstance } from "fastify";
import type { StkService } from "../modules/stk/stk.service.js";

export async function registerStkRoutes(app: FastifyInstance, stk: StkService) {
  app.post("/mpesa/stkpush/v1/processrequest", async (request) => stk.push(request.body));
  app.post("/mpesa/stkpushquery/v1/query", async (request) => stk.query(request.body));
}
