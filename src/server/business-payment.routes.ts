import type { FastifyInstance } from "fastify";
import type { BusinessPaymentService } from "../modules/business-payments/business-payment.service.js";

export async function registerBusinessPaymentRoutes(app: FastifyInstance, payments: BusinessPaymentService) {
  app.post("/mpesa/b2c/v1/paymentrequest", async (request) => payments.b2c(request.body));
  app.post("/mpesa/b2b/v1/paymentrequest", async (request) => payments.b2b(request.body));
  app.post("/mpesa/b2caccounttopup/v1/request", async (request) => payments.b2cAccountTopUp(request.body));
}
