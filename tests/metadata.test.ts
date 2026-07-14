import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";

describe("metadata routes", () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    server = await createServer();
  });

  afterEach(async () => {
    await server.app.close();
  });

  it("returns health", async () => {
    const response = await server.app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("returns version metadata", async () => {
    const response = await server.app.inject({ method: "GET", url: "/version" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: "daraja-local", version: "1.0.0" });
  });
});
