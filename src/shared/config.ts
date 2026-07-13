import { z } from "zod";

export type AppConfig = {
  host: string;
  port: number;
  tokenExpiresInSeconds: number;
  callbackTimeoutMs: number;
  consumerKey: string;
  consumerSecret: string;
};

const appConfigSchema = z.object({
  host: z.string().trim().min(1, "must not be empty"),
  port: z.number({ invalid_type_error: "must be a number" })
    .int("must be an integer")
    .min(1, "must be at least 1")
    .max(65_535, "must not exceed 65535"),
  tokenExpiresInSeconds: z.number({ invalid_type_error: "must be a number" })
    .int("must be an integer")
    .positive("must be greater than 0"),
  callbackTimeoutMs: z.number({ invalid_type_error: "must be a number" })
    .int("must be an integer")
    .positive("must be greater than 0"),
  consumerKey: z.string().min(1, "must not be empty"),
  consumerSecret: z.string().min(1, "must not be empty")
});

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const environment = loadEnvironmentConfig();
  const config = {
    host: overrides.host ?? environment.host,
    port: overrides.port ?? environment.port,
    tokenExpiresInSeconds: overrides.tokenExpiresInSeconds ?? environment.tokenExpiresInSeconds,
    callbackTimeoutMs: overrides.callbackTimeoutMs ?? environment.callbackTimeoutMs,
    consumerKey: overrides.consumerKey ?? environment.consumerKey,
    consumerSecret: overrides.consumerSecret ?? environment.consumerSecret
  };

  const result = appConfigSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }

  return result.data;
}

function loadEnvironmentConfig(): AppConfig {
  return {
    host: process.env.DARAJA_LOCAL_HOST ?? "127.0.0.1",
    port: Number(process.env.DARAJA_LOCAL_PORT ?? 8080),
    tokenExpiresInSeconds: Number(process.env.DARAJA_LOCAL_TOKEN_EXPIRES_IN ?? 3599),
    callbackTimeoutMs: Number(process.env.DARAJA_LOCAL_CALLBACK_TIMEOUT_MS ?? 5000),
    consumerKey: process.env.CONSUMER_KEY ?? "consumer_key",
    consumerSecret: process.env.CONSUMER_SECRET ?? "consumer_secret"
  };
}
