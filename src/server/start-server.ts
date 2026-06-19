import { createServer } from "./create-server.js";

export async function startServer(options: { host?: string; port?: number } = {}) {
  const { app, config } = await createServer({
    config: {
      host: options.host,
      port: options.port
    }
  });

  const address = await app.listen({
    host: options.host ?? config.host,
    port: options.port ?? config.port
  });

  return { app, address };
}
