import { describe, expect, it, vi } from "vitest";
import BridgeQQPlugin, { qqBridgeProvider } from "../src/index.ts";
import { MASKED_SECRET } from "../src/runtime-helpers.ts";

describe("qqBridgeProvider contract", () => {
  it("declares required bridge metadata and secret config schema", () => {
    expect(qqBridgeProvider.id).toBe("qq");
    expect(qqBridgeProvider.connectionMode).toBe("websocket");
    expect(qqBridgeProvider.configSchema.map((f) => f.key)).toEqual(["appID", "appSecret"]);
    expect(qqBridgeProvider.configSchema[1]?.type).toBe("secret");
    expect(qqBridgeProvider.ownerSessionKey("u123", "katsura")).toBe("qq_dm_u123@katsura");
  });

  it("preserves existing secret when incoming config carries masked placeholder", () => {
    const normalized = qqBridgeProvider.normalizeConfig(
      { enabled: true, appID: "10001", appSecret: MASKED_SECRET },
      { appSecret: "real-secret-value" },
    );
    expect(normalized.appSecret).toBe("real-secret-value");
    expect(normalized.token).toBeUndefined();

    const meta = qqBridgeProvider.extractStatusMeta(normalized);
    expect(meta).toEqual({
      configured: true,
      appID: "10001",
      appSecret: MASKED_SECRET,
      hasAppSecret: true,
    });
  });

  it("registers and unregisters provider via EventBus during plugin lifecycle", async () => {
    const requests: Array<{ event: string; payload: unknown }> = [];
    const disposables: Array<() => void> = [];

    const plugin = new BridgeQQPlugin();
    plugin.ctx = {
      bus: {
        request: vi.fn(async (event: string, payload: unknown) => {
          requests.push({ event, payload });
          return { ok: true };
        }),
      },
      log: { warn: vi.fn() },
    };
    plugin.register = (fn: () => void) => disposables.push(fn);

    await plugin.onload();
    expect(requests).toHaveLength(1);
    expect(requests[0].event).toBe("bridge:register-provider");
    expect((requests[0].payload as any).provider.id).toBe("qq");

    expect(disposables).toHaveLength(1);
    disposables[0]();
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual({
      event: "bridge:unregister-provider",
      payload: { platformId: "qq" },
    });
  });
});
