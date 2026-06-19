import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";

describe("oauth emulator", () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    server = await createServer({ config: { tokenExpiresInSeconds: 120 } });
  });

  afterEach(async () => {
    await server.app.close();
  });

  it("generates a fake token when Basic Auth is present", async () => {
    const response = await server.app.inject({
      method: "GET",
      url: "/oauth/v1/generate",
      headers: { authorization: "Basic Zm9vOmJhcg==" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ expires_in: "120" });
    expect(response.json().access_token).toMatch(/^daraja-local-token-/);
  });

  it("rejects missing Basic Auth", async () => {
    const response = await server.app.inject({ method: "GET", url: "/oauth/v1/generate" });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_AUTH_HEADER");
  });
});
