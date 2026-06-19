import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors.js";
import { createAccessToken } from "../../shared/id.js";
import type { AppConfig } from "../../shared/config.js";

export async function registerOAuthRoutes(app: FastifyInstance, config: AppConfig) {
  app.get("/oauth/v1/generate", async (request) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Basic ")) {
      throw new AppError("INVALID_AUTH_HEADER", "Basic authorization header is required", 401);
    }

    return {
      access_token: createAccessToken(),
      expires_in: String(config.tokenExpiresInSeconds)
    };
  });
}
