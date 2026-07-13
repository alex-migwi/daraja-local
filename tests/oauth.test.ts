import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server/create-server.js";
import { AccessTokenService } from "../src/modules/oauth/access-token.service.js";
import { validStkRequest } from "./helpers.js";

describe("oauth emulator", () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    server = await createServer({
      config: {
        tokenExpiresInSeconds: 120,
        consumerKey: "foo",
        consumerSecret: "bar"
      }
    });
  });

  afterEach(async () => {
    await server.app.close();
  });

  it("generates a fake token for valid client credentials", async () => {
    const response = await server.app.inject({
      method: "GET",
      url: "/oauth/v1/generate?grant_type=client_credentials",
      headers: { authorization: "Basic Zm9vOmJhcg==" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ expires_in: "120" });
    expect(response.json().access_token).toMatch(/^daraja-local-token-/);
  });

  it("rejects missing Basic Auth", async () => {
    const response = await server.app.inject({
      method: "GET",
      url: "/oauth/v1/generate?grant_type=client_credentials"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_AUTH_HEADER");
  });

  it("rejects malformed Basic credentials", async () => {
    const response = await server.app.inject({
      method: "GET",
      url: "/oauth/v1/generate?grant_type=client_credentials",
      headers: { authorization: "Basic not-base64" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_AUTH_FORMAT");
  });

  it("does not ignore additional credential segments", async () => {
    const credentials = Buffer.from("foo:bar:extra").toString("base64");
    const response = await server.app.inject({
      method: "GET",
      url: "/oauth/v1/generate?grant_type=client_credentials",
      headers: { authorization: `Basic ${credentials}` }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a protected request without a Bearer token", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      payload: validStkRequest()
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_ACCESS_TOKEN");
  });

  it("rejects an unknown Bearer token", async () => {
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers: { authorization: "Bearer unknown" },
      payload: validStkRequest()
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_ACCESS_TOKEN");
  });

  it("accepts an issued Bearer token", async () => {
    const oauth = await server.app.inject({
      method: "GET",
      url: "/oauth/v1/generate?grant_type=client_credentials",
      headers: { authorization: "Basic Zm9vOmJhcg==" }
    });
    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers: { authorization: `Bearer ${oauth.json().access_token}` },
      payload: validStkRequest()
    });

    expect(response.statusCode).toBe(200);
  });

  it("rejects an expired Bearer token", async () => {
    let now = 0;
    await server.app.close();
    server = await createServer({
      config: {
        tokenExpiresInSeconds: 1,
        consumerKey: "foo",
        consumerSecret: "bar"
      },
      tokens: new AccessTokenService(() => now)
    });
    const oauth = await server.app.inject({
      method: "GET",
      url: "/oauth/v1/generate?grant_type=client_credentials",
      headers: { authorization: "Basic Zm9vOmJhcg==" }
    });
    now = 1000;

    const response = await server.app.inject({
      method: "POST",
      url: "/mpesa/stkpush/v1/processrequest",
      headers: { authorization: `Bearer ${oauth.json().access_token}` },
      payload: validStkRequest()
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_ACCESS_TOKEN");
  });
});
