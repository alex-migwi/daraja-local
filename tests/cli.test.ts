import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requestJsonMock, startServerMock } = vi.hoisted(() => ({
  requestJsonMock: vi.fn(),
  startServerMock: vi.fn()
}));

vi.mock("../src/cli/http-client.js", () => ({
  requestJson: requestJsonMock
}));

vi.mock("../src/server/start-server.js", () => ({
  startServer: startServerMock
}));

const originalArgv = process.argv;
const originalExitCode = process.exitCode;

async function runCli(...args: string[]) {
  process.argv = ["node", "daraja-local", ...args];
  await import("../src/cli/index.js");
}

describe("CLI", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("starts the server with the requested host and port", async () => {
    startServerMock.mockResolvedValue({ address: "http://0.0.0.0:9090" });

    await runCli("start", "--host", "0.0.0.0", "--port", "9090");

    await vi.waitFor(() => {
      expect(startServerMock).toHaveBeenCalledWith({ host: "0.0.0.0", port: 9090 });
      expect(console.log).toHaveBeenCalledWith("Daraja Local listening at http://0.0.0.0:9090");
    });
  });

  it("lists transactions from the configured server", async () => {
    vi.stubEnv("DARAJA_LOCAL_URL", "http://emulator.test");
    requestJsonMock.mockResolvedValue([{ id: "txn-1" }]);

    await runCli("transactions");

    await vi.waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("http://emulator.test/simulator/transactions");
      expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ id: "txn-1" }], null, 2));
    });
  });

  it.each(["approve", "fail", "timeout"] as const)("sends the %s STK action", async (action) => {
    requestJsonMock.mockResolvedValue({ accepted: true });

    await runCli(action, "ws_CO_123", "--base-url", "http://emulator.test");

    await vi.waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        `http://emulator.test/simulator/stk/ws_CO_123/${action}`,
        { method: "POST", body: "{}" }
      );
      expect(console.log).toHaveBeenCalledWith(JSON.stringify({ accepted: true }, null, 2));
    });
  });

  it.each([
    ["approve-payment", "approve"],
    ["fail-payment", "fail"],
    ["timeout-payment", "timeout"]
  ] as const)("sends the %s business-payment action", async (command, action) => {
    requestJsonMock.mockResolvedValue({ accepted: true });

    await runCli(command, "AG_123", "--base-url", "http://emulator.test");

    await vi.waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        `http://emulator.test/simulator/payments/AG_123/${action}`,
        { method: "POST", body: "{}" }
      );
      expect(console.log).toHaveBeenCalledWith(JSON.stringify({ accepted: true }, null, 2));
    });
  });

  it.each([
    [new Error("request failed"), "request failed"],
    ["unknown failure", "unknown failure"]
  ])("reports command failures and sets a failing exit code", async (error, message) => {
    requestJsonMock.mockRejectedValue(error);

    await runCli("transactions");

    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(message);
      expect(process.exitCode).toBe(1);
    });
  });
});
