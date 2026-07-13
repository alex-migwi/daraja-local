import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/shared/config.js";

describe("configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses environment values when overrides are undefined", () => {
    vi.stubEnv("DARAJA_LOCAL_HOST", "localhost");
    vi.stubEnv("DARAJA_LOCAL_PORT", "3000");
    vi.stubEnv("DARAJA_LOCAL_TOKEN_EXPIRES_IN", "120");
    vi.stubEnv("DARAJA_LOCAL_CALLBACK_TIMEOUT_MS", "2500");

    expect(loadConfig({ host: undefined, port: undefined })).toMatchObject({
      host: "localhost",
      port: 3000,
      tokenExpiresInSeconds: 120,
      callbackTimeoutMs: 2500,
    });
  });

  it.each([
    [{ host: " " }, "host: must not be empty"],
    [{ port: 0 }, "port: must be at least 1"],
    [{ port: 65_536 }, "port: must not exceed 65535"],
    [{ port: 1.5 }, "port: must be an integer"],
    [{ tokenExpiresInSeconds: 0 }, "tokenExpiresInSeconds: must be greater than 0"],
    [{ callbackTimeoutMs: -1 }, "callbackTimeoutMs: must be greater than 0"],
  ] as const)("rejects invalid overrides", (overrides, message) => {
    expect(() => loadConfig(overrides)).toThrow(`Invalid configuration: ${message}`);
  });

  it("reports invalid numeric environment values", () => {
    vi.stubEnv("DARAJA_LOCAL_PORT", "not-a-port");

    expect(() => loadConfig()).toThrow("Invalid configuration: port: must be a number");
  });
});
