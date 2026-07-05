import type { FastifyInstance } from "fastify";
import { AppError } from "../../shared/errors.js";
import { createAccessToken } from "../../shared/id.js";
import type { AppConfig } from "../../shared/config.js";

export async function registerOAuthRoutes(app: FastifyInstance, config: AppConfig) {
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

    // 1. Validate Header Presence and Format
    if (!authorization || !authorization.startsWith("Basic ")) {
      throw new AppError("INVALID_AUTH_HEADER", "Basic authorization header is required", 401);
    }

    // 2. Extract and Decode Base64 Credentials
    const base64Credentials = authorization.split(" ")[1];
    let decodedCredentials: string;
    
    try {
      // Node.js Buffer handles Base64 decoding
      decodedCredentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    } catch (error) {
      throw new AppError("INVALID_AUTH_FORMAT", "Failed to decode credentials", 400);
    }

    // 3. Split into Key and Secret
    const [consumerKey, consumerSecret] = decodedCredentials.split(":");

    if (!consumerKey || !consumerSecret) {
      throw new AppError("INVALID_AUTH_FORMAT", "Credentials must be in 'key:secret' format", 400);
    }

    // 4. Validate against your configured credentials
    // (Replace this check with your actual config lookup or database validation)
    if (consumerKey !== config.consumerKey || consumerSecret !== config.consumerSecret) {
      throw new AppError("INVALID_CREDENTIALS", "Invalid consumer key or secret", 401);
    }

    // 5. Return Token (Safaricom expects access_token and expires_in)
    return {
      access_token: createAccessToken(),
      expires_in: String(config.tokenExpiresInSeconds) // Usually "3599" or "3600"
    };
  });
}   