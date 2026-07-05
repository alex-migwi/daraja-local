#!/usr/bin/env node
import { Command } from "commander";
import { startServer } from "../server/start-server.js";
import { requestJson } from "./http-client.js";

const program = new Command();

program.name("daraja-local").description("Local Safaricom Daraja emulator").version("0.1.0");

program
  .command("start")
  .description("Start the Daraja Local server")
  .option("--host <host>", "Host to bind", process.env.DARAJA_LOCAL_HOST ?? "127.0.0.1")
  .option("--port <port>", "Port to bind", process.env.DARAJA_LOCAL_PORT ?? "8080")
  .action(async (options) => {
    const { address } = await startServer({ host: options.host, port: Number(options.port) });
    console.log(`Daraja Local listening at ${address}`);
  });

program
  .command("transactions")
  .description("List transactions")
  .option("--base-url <url>", "Daraja Local URL", process.env.DARAJA_LOCAL_URL ?? "http://127.0.0.1:8080")
  .action(async (options) => {
    console.log(JSON.stringify(await requestJson(`${options.baseUrl}/simulator/transactions`), null, 2));
  });

for (const command of ["approve", "fail", "timeout"] as const) {
  program
    .command(`${command} <checkoutRequestId>`)
    .description(`${command} an STK transaction`)
    .option("--base-url <url>", "Daraja Local URL", process.env.DARAJA_LOCAL_URL ?? "http://127.0.0.1:8080")
    .action(async (checkoutRequestId: string, options) => {
      const data = await requestJson(`${options.baseUrl}/simulator/stk/${checkoutRequestId}/${command}`, {
        method: "POST",
        body: JSON.stringify({})
      });
      console.log(JSON.stringify(data, null, 2));
    });
}

for (const command of ["approve-payment", "fail-payment", "timeout-payment"] as const) {
  const action = command.replace("-payment", "");
  program
    .command(`${command} <conversationId>`)
    .description(`${action} a B2C, B2B, or account top-up transaction`)
    .option("--base-url <url>", "Daraja Local URL", process.env.DARAJA_LOCAL_URL ?? "http://127.0.0.1:8080")
    .action(async (conversationId: string, options) => {
      const data = await requestJson(`${options.baseUrl}/simulator/payments/${conversationId}/${action}`, {
        method: "POST",
        body: JSON.stringify({})
      });
      console.log(JSON.stringify(data, null, 2));
    });
}

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
