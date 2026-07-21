import { afterEach, describe, expect, it } from "vitest";

import handler from "../../api/docent";

const runtimeProcess = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined> };
  }
).process;
const originalApiKey = runtimeProcess.env.OPENAI_API_KEY;

class MockRequest {
  method = "POST";
  socket = { remoteAddress: "127.0.0.1" };

  constructor(
    private readonly body: string,
    readonly headers: Record<string, string> = {},
  ) {}

  on() {}

  async *[Symbol.asyncIterator]() {
    yield this.body;
  }
}

class MockResponse {
  statusCode = 0;
  headersSent = false;
  writableEnded = false;
  readonly chunks: string[] = [];

  setHeader() {}

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

async function invoke(body: string, headers: Record<string, string> = {}) {
  const response = new MockResponse();
  await handler(new MockRequest(body, headers) as never, response as never);
  return response;
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete runtimeProcess.env[name];
  else runtimeProcess.env[name] = value;
}

afterEach(() => {
  restoreEnv("OPENAI_API_KEY", originalApiKey);
});

describe("docent serverless entrypoint", () => {
  it("returns the disabled probe shape when no API key is configured", async () => {
    delete runtimeProcess.env.OPENAI_API_KEY;

    const response = await invoke(
      JSON.stringify({
        slug: "astroclock",
        lang: "en",
        messages: [],
      }),
      { "x-docent-probe": "1" },
    );

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ disabled: true });
  });

  it("rejects an invalid request body before checking configuration", async () => {
    const response = await invoke("not-json");

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "body_not_json" });
  });
});
