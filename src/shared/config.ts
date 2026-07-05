export type AppConfig = {
  host: string;
  port: number;
  tokenExpiresInSeconds: number;
  callbackTimeoutMs: number;
  consumerKey?: string;
  consumerSecret?: string;
};

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const config = {
    host: process.env.DARAJA_LOCAL_HOST ?? "127.0.0.1",
    port: Number(process.env.DARAJA_LOCAL_PORT ?? 8080),
    tokenExpiresInSeconds: Number(process.env.DARAJA_LOCAL_TOKEN_EXPIRES_IN ?? 3599),
    callbackTimeoutMs: Number(process.env.DARAJA_LOCAL_CALLBACK_TIMEOUT_MS ?? 5000),
    consumerKey: process.env.CONSUMER_KEY ?? "consumer_key",
    consumerSecret: process.env.CONSUMER_SECRET ?? "consumer_secret",
  };

  for (const [key, value] of Object.entries(overrides) as [keyof AppConfig, AppConfig[keyof AppConfig]][]) {
    if (value !== undefined) {
      config[key] = value as never;
    }
  }

  return config;
}
