import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors.js";
import type { AppConfig } from "../../shared/config.js";
import type { AccessTokenService } from "./access-token.service.js";

export async function registerOAuthRoutes(
  app: FastifyInstance,
  config: AppConfig,
  tokens: AccessTokenService
) {
  app.get("/oauth/v1/generate", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          grant_type: { type: "string", enum: ["client_credentials"] }
        },
        required: ["grant_type"]
      }
    }
  }, async (request) => {
    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith("Basic ")) {
      throw new AppError("INVALID_AUTH_HEADER", "Basic authorization header is required", 401);
    }

    const [consumerKey, consumerSecret] = decodeCredentials(authorization.slice("Basic ".length));

    if (consumerKey !== config.consumerKey || consumerSecret !== config.consumerSecret) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid consumer key or secret", 401);
    }

    return {
      access_token: tokens.issue(config.tokenExpiresInSeconds),
      expires_in: String(config.tokenExpiresInSeconds)
    };
  });
}

function decodeCredentials(encoded: string): [string, string] {
  const validBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!validBase64.test(encoded)) {
    throw new AppError("INVALID_AUTH_FORMAT", "Credentials must be valid Base64", 400);
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 1 || separator === decoded.length - 1) {
    throw new AppError("INVALID_AUTH_FORMAT", "Credentials must be in 'key:secret' format", 400);
  }

  return [decoded.slice(0, separator), decoded.slice(separator + 1)];
}
