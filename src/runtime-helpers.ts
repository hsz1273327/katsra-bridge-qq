/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * runtime-helpers.ts — Self-contained runtime utilities for the standalone
 * katsra-bridge-qq plugin (zero host-internal relative imports).
 */

export const MASKED_SECRET = "********";

export function isMaskedSecretValue(value: unknown): value is typeof MASKED_SECRET {
  return typeof value === "string" && value.trim() === MASKED_SECRET;
}

export function maskSecretValue(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? MASKED_SECRET : "";
}

export function createModuleLogger(moduleName: string) {
  const prefix = `[${moduleName}]`;
  return {
    log: (...args: any[]) => console.log(prefix, ...args),
    warn: (...args: any[]) => console.warn(prefix, ...args),
    error: (...args: any[]) => console.error(prefix, ...args),
  };
}

export function debugLog() {
  return {
    log: (scope: string, message: string) => console.log(`[${scope}] ${message}`),
    warn: (scope: string, message: string) => console.warn(`[${scope}] ${message}`),
    error: (scope: string, message: string) => console.error(`[${scope}] ${message}`),
  };
}

const INPUT_MODES = new Set(["buffer", "local_file", "remote_url", "public_url"]);
const FILE_KINDS = new Set(["image", "video", "audio", "document"]);
const DELIVERY_MODES = new Set([
  "native_image",
  "native_video",
  "native_audio",
  "native_document",
  "native_file",
]);

function validateArray(name: string, values: unknown, allowed: Set<string>) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`mediaCapabilities.${name} must be a non-empty array`);
  }
  for (const value of values) {
    if (!allowed.has(value)) {
      throw new Error(`mediaCapabilities.${name} contains unsupported value: ${value}`);
    }
  }
}

function freezeMaxBytes(maxBytes: any) {
  if (!maxBytes) return Object.freeze({});
  const out: Record<string, any> = {};
  for (const [mode, limits] of Object.entries(maxBytes)) {
    out[mode] = Object.freeze({ ...(limits as any) });
  }
  return Object.freeze(out);
}

export function createMediaCapabilities(def: any = {}) {
  if (!def.platform || typeof def.platform !== "string") {
    throw new Error("mediaCapabilities.platform is required");
  }
  validateArray("inputModes", def.inputModes, INPUT_MODES);
  validateArray("supportedKinds", def.supportedKinds, FILE_KINDS);
  if (typeof def.requiresReplyContext !== "boolean") {
    throw new Error("mediaCapabilities.requiresReplyContext must be boolean");
  }
  if (!def.source || typeof def.source !== "string") {
    throw new Error("mediaCapabilities.source is required");
  }
  const deliveryByKind = def.deliveryByKind || {};
  for (const kind of def.supportedKinds) {
    if (!DELIVERY_MODES.has(deliveryByKind[kind])) {
      throw new Error(`mediaCapabilities.deliveryByKind.${kind} is invalid`);
    }
  }
  return Object.freeze({
    ...def,
    inputModes: Object.freeze([...def.inputModes]),
    supportedKinds: Object.freeze([...def.supportedKinds]),
    deliveryByKind: Object.freeze({ ...deliveryByKind }),
    maxBytes: freezeMaxBytes(def.maxBytes),
  });
}

export function webSocketOptionsForUrl(_url: string): Record<string, any> {
  return {};
}

export const BRIDGE_HTTP_TIMEOUT_MS = 30_000;
export const BRIDGE_HTTP_MAX_RETRIES = 2;
export const BRIDGE_HTTP_RETRY_BASE_DELAY_MS = 1000;

export class BridgeHttpError extends Error {
  declare platform: string;
  declare stage: string;
  declare method: string;
  declare host: string;
  declare attempts: number;
  declare timedOut: boolean;

  constructor(
    message: string,
    fields: {
      platform: string;
      stage: string;
      method: string;
      host: string;
      attempts: number;
      timedOut: boolean;
      cause?: unknown;
    },
  ) {
    super(message, fields.cause === undefined ? undefined : { cause: fields.cause });
    this.name = "BridgeHttpError";
    this.platform = fields.platform;
    this.stage = fields.stage;
    this.method = fields.method;
    this.host = fields.host;
    this.attempts = fields.attempts;
    this.timedOut = fields.timedOut;
  }
}

export interface BridgeOutboundRequestOptions {
  stage: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
  idempotent?: boolean;
  maxRetries?: number;
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function createBridgeOutboundHttp({
  platform,
  fetchImpl,
  sleep = defaultSleep,
}: {
  platform: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}) {
  return {
    async request(opts: BridgeOutboundRequestOptions): Promise<Response> {
      const {
        stage,
        url,
        method = "GET",
        headers,
        body,
        timeoutMs = BRIDGE_HTTP_TIMEOUT_MS,
        idempotent = false,
        maxRetries = BRIDGE_HTTP_MAX_RETRIES,
      } = opts;
      const doFetch = fetchImpl || globalThis.fetch;
      const retries = idempotent ? Math.max(0, maxRetries) : 0;
      let host = "";
      try {
        host = new URL(url).host;
      } catch {
        host = "unknown";
      }

      let lastErr: unknown = null;
      let timedOut = false;

      for (let attempt = 1; attempt <= retries + 1; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
        (timer as any).unref?.();
        try {
          const res = await doFetch(url, {
            method,
            headers,
            body,
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (attempt <= retries && isRetryableStatus(res.status)) {
            await sleep(BRIDGE_HTTP_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
            continue;
          }
          return res;
        } catch (err: any) {
          clearTimeout(timer);
          lastErr = err;
          timedOut = err?.name === "AbortError" || err?.name === "TimeoutError";
          if (attempt <= retries) {
            await sleep(BRIDGE_HTTP_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
            continue;
          }
          throw new BridgeHttpError(
            `[${platform}:${stage}] ${method} ${host} failed after ${attempt} attempt(s): ${err?.message || String(err)}`,
            {
              platform,
              stage,
              method,
              host,
              attempts: attempt,
              timedOut,
              cause: err,
            },
          );
        }
      }

      throw lastErr;
    },
  };
}
