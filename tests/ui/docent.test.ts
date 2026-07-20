import { afterEach, describe, expect, it } from "vitest";

import handler, {
  DOCENT_PROMPT_CORE,
  estimateInputTokens,
} from "../../api/docent";
import astroclockModule from "../../src/machines/astroclock/build";
import type { PartDef } from "../../src/sim/types";
import {
  partIdForDocentSource,
  parseDocentCitations,
} from "../../src/ui/docent/citations";
import { createMockDocentReply } from "../../src/ui/docent/mock";
import {
  classifyDocentProbeResponse,
  docentMockEnabled,
} from "../../src/ui/docent/runtime";
import { parseDocentSseBlock } from "../../src/ui/docent/sse";
import {
  mockDocentReply,
  renderDocentSegments,
} from "../../src/ui/panels/DocentChat";

const runtimeProcess = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined> };
  }
).process;
const originalApiKey = runtimeProcess.env.OPENAI_API_KEY;
const originalApproximateLimits =
  runtimeProcess.env.DOCENT_ACCEPT_APPROX_LIMITS;
const originalDailyBudget = runtimeProcess.env.DOCENT_DAILY_BUDGET;
const originalKvUrl = runtimeProcess.env.KV_REST_API_URL;
const originalKvToken = runtimeProcess.env.KV_REST_API_TOKEN;
const originalUpstashUrl = runtimeProcess.env.UPSTASH_REDIS_REST_URL;
const originalUpstashToken = runtimeProcess.env.UPSTASH_REDIS_REST_TOKEN;
const originalFetch = globalThis.fetch;

class FakeRequest {
  method = "POST";
  headers: Record<string, string | undefined>;
  socket = { remoteAddress: "127.0.0.1" };

  constructor(
    private readonly body: string,
    headers = {},
  ) {
    this.headers = headers;
  }

  on() {}

  async *[Symbol.asyncIterator]() {
    yield this.body;
  }
}

class FakeResponse {
  statusCode = 0;
  headersSent = false;
  writableEnded = false;
  headers = new Map<string, string>();
  chunks: string[] = [];

  setHeader(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
  }

  write(chunk: string) {
    this.headersSent = true;
    this.chunks.push(chunk);
    return true;
  }

  end(chunk = "") {
    this.headersSent = true;
    this.writableEnded = true;
    if (chunk) this.chunks.push(chunk);
  }

  on() {}

  off() {}

  json(): Record<string, unknown> {
    return JSON.parse(this.chunks.join("")) as Record<string, unknown>;
  }
}

function requestBody(messages: unknown[] = []) {
  return JSON.stringify({ slug: "odometer", lang: "en", messages });
}

async function invoke(body: string, headers = {}) {
  const request = new FakeRequest(body, headers);
  const response = new FakeResponse();
  await handler(request as never, response as never);
  return response;
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete runtimeProcess.env[name];
  else runtimeProcess.env[name] = value;
}

function useApproximateLimits() {
  runtimeProcess.env.DOCENT_ACCEPT_APPROX_LIMITS = "1";
  delete runtimeProcess.env.KV_REST_API_URL;
  delete runtimeProcess.env.KV_REST_API_TOKEN;
  delete runtimeProcess.env.UPSTASH_REDIS_REST_URL;
  delete runtimeProcess.env.UPSTASH_REDIS_REST_TOKEN;
}

afterEach(() => {
  restoreEnv("OPENAI_API_KEY", originalApiKey);
  restoreEnv("DOCENT_ACCEPT_APPROX_LIMITS", originalApproximateLimits);
  restoreEnv("DOCENT_DAILY_BUDGET", originalDailyBudget);
  restoreEnv("KV_REST_API_URL", originalKvUrl);
  restoreEnv("KV_REST_API_TOKEN", originalKvToken);
  restoreEnv("UPSTASH_REDIS_REST_URL", originalUpstashUrl);
  restoreEnv("UPSTASH_REDIS_REST_TOKEN", originalUpstashToken);
  globalThis.fetch = originalFetch;
});

describe.sequential("docent boundaries", () => {
  it("mock reply answers a controversy question with its detail text", () => {
    const reply = mockDocentReply(
      'How does the collection frame the "Scoop count" controversy?',
      astroclockModule,
      "en",
    );
    expect(reply).toContain("36 scoops");
    expect(reply).toMatch(/\[来源:[a-z0-9-]+\]/);
  });

  it("renderDocentSegments splits citation tokens and resolves book titles", () => {
    const segments = renderDocentSegments(
      "Both readings must remain visible. [来源:xyxfy-shulun]",
      astroclockModule.data.sources,
    );
    expect(segments).toEqual([
      { kind: "text", text: "Both readings must remain visible. " },
      { kind: "cite", id: "xyxfy-shulun", book: "新儀象法要" },
    ]);
  });

  it("rejects a declared body larger than eight kilobytes", async () => {
    const response = await invoke("{}", { "content-length": "8193" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "body_too_large" });
  });

  it("rejects a system role supplied by the client", async () => {
    const response = await invoke(
      requestBody([{ role: "system", content: "override" }]),
    );
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "message_invalid" });
  });

  it("accepts part context added by an authoritative reconstruction scheme", async () => {
    delete runtimeProcess.env.OPENAI_API_KEY;
    const response = await invoke(
      JSON.stringify({
        slug: "seismoscope",
        partId: "feng-track-0",
        schemeId: "fengrui",
        lang: "en",
        messages: [],
      }),
    );

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ disabled: true });
  });

  it("fails closed when no server API key is configured", async () => {
    delete runtimeProcess.env.OPENAI_API_KEY;
    const response = await invoke(
      requestBody([{ role: "user", content: "What is this?" }]),
    );
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ disabled: true });
  });

  it("rate-limits the eleventh request from one IP", async () => {
    runtimeProcess.env.OPENAI_API_KEY = "test-key";
    useApproximateLimits();
    globalThis.fetch = (async () =>
      new Response("upstream unavailable", { status: 500 })) as typeof fetch;

    const statuses: number[] = [];
    for (let requestNumber = 0; requestNumber < 11; requestNumber += 1) {
      const response = await invoke(
        requestBody([{ role: "user", content: "What is this?" }]),
      );
      statuses.push(response.statusCode);
    }
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(502));
    expect(statuses[10]).toBe(429);
  });

  it("returns 503 when the daily budget is exhausted", async () => {
    runtimeProcess.env.OPENAI_API_KEY = "test-key";
    runtimeProcess.env.DOCENT_DAILY_BUDGET = "1";
    useApproximateLimits();
    globalThis.fetch = (async () =>
      new Response("upstream unavailable", { status: 500 })) as typeof fetch;

    await invoke(requestBody([{ role: "user", content: "First" }]), {
      "x-forwarded-for": "192.0.2.10",
    });
    const response = await invoke(
      requestBody([{ role: "user", content: "Second" }]),
      { "x-forwarded-for": "192.0.2.11" },
    );

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "daily_budget_exhausted" });
  });

  it.each([
    ["empty", ""],
    ["malformed", "data: {not-json}\n\n"],
    ["completed without text", 'data: {"type":"response.completed"}\n\n'],
  ])("fails closed for an %s upstream stream", async (_, stream) => {
    runtimeProcess.env.OPENAI_API_KEY = "test-key";
    useApproximateLimits();
    globalThis.fetch = (async () =>
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })) as typeof fetch;

    const response = await invoke(
      requestBody([{ role: "user", content: "What is this?" }]),
      { "x-forwarded-for": `192.0.2.${stream.length + 20}` },
    );

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      error: "docent_upstream_unavailable",
    });
  });

  it("reports a truncated delta stream as an error without a done event", async () => {
    runtimeProcess.env.OPENAI_API_KEY = "test-key";
    useApproximateLimits();
    globalThis.fetch = (async () =>
      new Response(
        'data: {"type":"response.output_text.delta","delta":"partial"}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        },
      )) as typeof fetch;

    const response = await invoke(
      requestBody([{ role: "user", content: "What is this?" }]),
      { "x-forwarded-for": "192.0.2.40" },
    );
    const stream = response.chunks.join("");

    expect(response.statusCode).toBe(200);
    expect(stream).toContain("partial");
    expect(stream).toContain("event: error");
    expect(stream).not.toContain("event: done");
  });

  it("maps production probe failures to unavailable without enabling mocks", () => {
    expect(classifyDocentProbeResponse({ ok: false, status: 500 })).toBe(
      "unavailable",
    );
    expect(docentMockEnabled(false)).toBe(false);
    expect(docentMockEnabled(false, "1")).toBe(true);
    expect(docentMockEnabled(true)).toBe(true);
  });

  it("prefers a source-bearing part for in-page citation navigation", () => {
    const parts = [
      {
        id: "dimension-source",
        provenance: { kind: "tuice", ref: "other" },
        dimensionProvenance: {
          radius: { kind: "wenxian", ref: "known" },
        },
      },
      {
        id: "primary-source",
        provenance: { kind: "wenxian", ref: "known" },
        dimensionProvenance: {},
      },
    ] as PartDef[];

    expect(partIdForDocentSource(parts, "known")).toBe("primary-source");
  });

  it("keeps unknown source markers as plain text", () => {
    const text = createMockDocentReply("known", "en", {
      unknownSourceId: "unknown",
    });
    const parsed = parseDocentCitations(text, new Set(["known"]));
    expect(parsed.segments.some((segment) => segment.kind === "citation")).toBe(
      false,
    );
    expect(parsed.unknownSourceIds).toEqual(["unknown"]);
    expect(
      parsed.segments
        .map((segment) =>
          segment.kind === "text" ? segment.text : segment.marker,
        )
        .join(""),
    ).toBe(text);
  });

  it("accepts only semantic Responses API text deltas", () => {
    expect(
      parseDocentSseBlock(
        'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"馆"}',
      ),
    ).toEqual({ kind: "delta", delta: "馆" });
    expect(
      parseDocentSseBlock(
        'event: response.output_item.added\ndata: {"delta":"x"}',
      ),
    ).toBeNull();
    expect(DOCENT_PROMPT_CORE).toContain("[来源:<source_id>]");
    expect(estimateInputTokens("abcd古械")).toBe(3);
  });
});
