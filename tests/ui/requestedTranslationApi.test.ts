// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
// Explanation: Preserve the original test imports.
// Reason: The provider timeout check also needs controlled timers.
// import { afterEach, beforeEach, expect, test } from "vitest";
// Explanation: Import controlled timers with the existing test helpers.
// Reason: Timeout behavior can be checked without waiting fifty seconds or making paid calls.
import { afterEach, beforeEach, expect, test, vi } from "vitest";
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
import translateHandler from "../../api/translate";
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
import docentHandler from "../../api/docent";
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
import odometer from "../../src/data/machines/odometer.json";
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
import { UNKNOWN_TRANSLATION } from "../../src/localization/translation";
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
const env = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined> };
  }
).process.env;
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
const keys = [
  "OPENAI_API_KEY",
  "DOCENT_ACCEPT_APPROX_LIMITS",
  "DOCENT_DAILY_BUDGET",
  "TRANSLATION_DAILY_BUDGET",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
let saved: Record<string, string | undefined>;
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
const originalFetch = globalThis.fetch;
// Explanation: Verify safe classification of provider credit, credential and access failures.
// Reason: Users need actionable error codes without exposing raw provider responses.
test("translation API: provider setup failures return safe actionable codes without raw errors", async () => {
  // Explanation: Verify safe classification of provider credit, credential and access failures.
  // Reason: Users need actionable error codes without exposing raw provider responses.
  for (const [status, code, expected] of [
    [429, "credit_balance_exhausted", "provider_billing_required"],
    [401, "invalid_api_key", "provider_authentication_failed"],
    [403, "permission_denied", "provider_access_denied"],
    [404, "model_not_found", "provider_model_unavailable"],
    [429, "rate_limit_exceeded", "provider_rate_limited"],
  ] as const) {
    // Explanation: Verify safe classification of provider credit, credential and access failures.
    // Reason: Users need actionable error codes without exposing raw provider responses.
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ error: { code, message: "PRIVATE_UPSTREAM_ERROR" } }),
        { status },
      )) as typeof fetch;
    // Explanation: Verify safe classification of provider credit, credential and access failures.
    // Reason: Users need actionable error codes without exposing raw provider responses.
    const reply = await invoke(translateHandler, translationBody);
    // Explanation: Verify safe classification of provider credit, credential and access failures.
    // Reason: Users need actionable error codes without exposing raw provider responses.
    expect(reply.json().results[0].reason).toBe(expected);
    // Explanation: Verify safe classification of provider credit, credential and access failures.
    // Reason: Users need actionable error codes without exposing raw provider responses.
    expect(reply.text()).not.toContain("PRIVATE_UPSTREAM_ERROR");
    // Explanation: Verify safe classification of provider credit, credential and access failures.
    // Reason: Users need actionable error codes without exposing raw provider responses.
  }
  // Explanation: Verify safe classification of provider credit, credential and access failures.
  // Reason: Users need actionable error codes without exposing raw provider responses.
});
// Explanation: Check the server's bounded translation timeout.
// Reason: A stalled provider must resolve to uncertainty without returning unchecked text.
test("translation API: provider timeout resolves to uncertainty", async () => {
  // Explanation: Replace wall-clock timers with a controlled test clock.
  // Reason: The timeout should be deterministic and fast.
  vi.useFakeTimers();
  // Explanation: Ensure the normal clock is restored even when an assertion fails.
  // Reason: Later tests must retain their usual timer behavior.
  try {
    // Explanation: Simulate a provider that responds only to cancellation.
    // Reason: The server timeout must abort a stalled generation request.
    globalThis.fetch = (async (_url, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("timed_out")),
          { once: true },
        ),
      )) as typeof fetch;
    // Explanation: Start a valid translation request against the actual handler.
    // Reason: This verifies timeout handling across the complete API path.
    const pending = invoke(translateHandler, translationBody);
    // Explanation: Advance through the server's fifty-second deadline.
    // Reason: No real waiting or external provider access is needed.
    await vi.advanceTimersByTimeAsync(50_001);
    // Explanation: Await the handler's fallback response after cancellation.
    // Reason: A timeout must complete the request rather than leave it hanging.
    const reply = await pending;
    // Explanation: Require an uncertainty result for the timed-out source pair.
    // Reason: Unreviewed generation must never be shown as accepted translation.
    expect(reply.json().results).toEqual([
      { id: "a", status: "uncertain", reason: "service_unavailable" },
    ]);
    // Explanation: Restore the ordinary clock after checking the timeout.
    // Reason: Other tests and cleanup must not inherit fake timers.
  } finally {
    vi.useRealTimers();
  }
  // Explanation: Finish the provider timeout test.
  // Reason: The fallback assertion covers the bounded failure path.
});
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
let address = 100;
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
class Request {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  method = "POST";
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  headers = { "x-forwarded-for": "192.0.2." + address++ };
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  constructor(readonly raw: string) {}
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  on() {}
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  async *[Symbol.asyncIterator]() {
    yield this.raw;
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
}
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
class Reply {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  statusCode = 0;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  writableEnded = false;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  headersSent = false;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  headers = new Map<string, string>();
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  chunks: string[] = [];
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  setHeader(key: string, value: string) {
    this.headers.set(key.toLowerCase(), value);
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  on() {}
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  off() {}
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  write(chunk: string) {
    this.headersSent = true;
    this.chunks.push(chunk);
    return true;
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  end(chunk = "") {
    this.headersSent = true;
    this.writableEnded = true;
    if (chunk) this.chunks.push(chunk);
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  text() {
    return this.chunks.join("");
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  json() {
    return JSON.parse(this.text());
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
}
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
beforeEach(() => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  saved = Object.fromEntries(keys.map((key) => [key, env[key]]));
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  for (const key of keys) delete env[key];
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  env.OPENAI_API_KEY = "local-test-placeholder";
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  env.DOCENT_ACCEPT_APPROX_LIMITS = "1";
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  env.DOCENT_DAILY_BUDGET = "500";
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  env.TRANSLATION_DAILY_BUDGET = "500";
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
afterEach(() => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  for (const key of keys) {
    if (saved[key] === undefined) delete env[key];
    else env[key] = saved[key];
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = originalFetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
async function invoke(
  handler: typeof translateHandler | typeof docentHandler,
  body: unknown,
  method = "POST",
) {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const request = new Request(
    typeof body === "string" ? body : JSON.stringify(body),
  );
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  request.method = method;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const reply = new Reply();
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  await handler(request as never, reply as never);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  return reply;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
}
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
const pair = { id: "a", en: "Drive 10 m", zh: "驱动10 m" };
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
const translationBody = { language: "fr", items: [pair] };
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
const paragraph =
  "Un personnage frappe le tambour à chaque li. [来源:songshi-waiguan]";
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
const docentBody = {
  slug: "odometer",
  lang: "en",
  targetLanguage: "fr",
  messages: [{ role: "user", content: "How does it measure distance?" }],
};
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
function completed(value: unknown) {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  return new Response(
    JSON.stringify({
      status: "completed",
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(value) }] },
      ],
    }),
    { status: 200 },
  );
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
}
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
function stream(text: string, finish = true) {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  return new Response(
    "data: " +
      JSON.stringify({ type: "response.output_text.delta", delta: text }) +
      "\n\n" +
      (finish ? 'data: {"type":"response.completed"}\n\n' : ""),
    { headers: { "Content-Type": "text/event-stream" } },
  );
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
}
// Explanation: Execute the API test setup, response simulation or assertion below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
function review(input: { items: Array<{ id: string }> }, accepted = true) {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  return {
    items: input.items.map((item) => ({
      id: item.id,
      faithful: accepted,
      sourcesAgree: accepted,
      targetLanguage: true,
      reason: accepted ? "ok" : "uncertain",
    })),
  };
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
}
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
test("translation API: method, malformed body, oversized body and duplicate IDs are rejected", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(
    (await invoke(translateHandler, translationBody, "GET")).statusCode,
  ).toBe(405);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  for (const body of [
    "{",
    "x".repeat(131073),
    { ...translationBody, items: [pair, pair] },
  ]) {
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    const reply = await invoke(translateHandler, body);
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    expect(reply.statusCode).toBe(400);
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    expect(reply.headers.get("cache-control")).toContain("no-store");
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
test("translation API: missing configuration fails closed without a provider call", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  delete env.OPENAI_API_KEY;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  let calls = 0;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = (async () => {
    calls++;
    throw new Error("unexpected provider call");
  }) as typeof fetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect((await invoke(translateHandler, translationBody)).statusCode).toBe(
    503,
  );
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(calls).toBe(0);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
test("translation API: incomplete generation becomes uncertainty without unchecked text", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ status: "incomplete", output: [] }),
    )) as typeof fetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const reply = await invoke(translateHandler, translationBody);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.statusCode).toBe(200);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.json().results).toEqual([
    { id: "a", status: "uncertain", reason: "service_unavailable" },
  ]);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
test("translation API: one disagreeing review prevents candidate acceptance", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const calls: Record<string, unknown>[] = [];
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = (async (_url, init) => {
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    const payload = JSON.parse(String(init?.body));
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    calls.push(payload);
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    const input = JSON.parse(payload.input);
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    return completed(
      payload.instructions.startsWith("Translate")
        ? { items: [{ id: "a", text: "Avancer 10 m" }] }
        : review(input, calls.length !== 3),
    );
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  }) as typeof fetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const reply = await invoke(translateHandler, translationBody);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  // Explanation: Preserve the old immediate-rejection call count.
  // Reason: A failed review now triggers one correction and both fresh reviews.
  // expect(calls).toHaveLength(3);
  // Explanation: Verify the bounded correction call count.
  // Reason: Correction must not skip independent validation.
  expect(calls).toHaveLength(6);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.json().results[0].status).toBe("uncertain");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(calls.every((call) => call.store === false)).toBe(true);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
test("translated docent: only target generation occurs and no answer is sent before both reviews", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const calls: Record<string, unknown>[] = [];
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const releases: Array<() => void> = [];
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = (async (_url, init) => {
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    const payload = JSON.parse(String(init?.body));
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    calls.push(payload);
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    if (payload.stream) return stream(paragraph);
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    await new Promise<void>((resolve) => releases.push(resolve));
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    return completed(review(JSON.parse(payload.input)));
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  }) as typeof fetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const request = new Request(JSON.stringify(docentBody));
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const reply = new Reply();
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const pending = docentHandler(request as never, reply as never);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  await expect.poll(() => releases.length).toBe(2);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.chunks).toHaveLength(0);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  releases.forEach((release) => release());
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  await pending;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(calls).toHaveLength(3);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(String(calls[0].instructions)).toContain("lang=fr");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(
    calls
      .slice(1)
      .every((call) => JSON.parse(String(call.input)).targetLanguage === "fr"),
  ).toBe(true);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(calls.every((call) => call.store === false)).toBe(true);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).toContain(paragraph);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).toContain("event: done");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.headers.get("cache-control")).toContain("no-store");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
// Explanation: Preserve the earlier test title.
// Reason: The latest requirement uses source-only fallback with a temporary notice.
// test("translated docent: failed source review displays both existing evidence versions", async () => {
// Explanation: Name the current fallback behavior accurately.
// Reason: Reviewers should see what the test actually verifies.
test("translated docent: unrepaired source review retains selected English evidence", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  let count = 0;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = (async (_url, init) => {
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    const payload = JSON.parse(String(init?.body));
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    count++;
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    return payload.stream
      ? stream(paragraph)
      : completed(review(JSON.parse(payload.input), count !== 3));
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  }) as typeof fetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const reply = await invoke(docentHandler, docentBody);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  // Explanation: Preserve the old inline bilingual warning expectation.
  // Reason: Fallback now uses response metadata and only the selected original language.
  // // Explanation: Preserve the old inline bilingual warning expectation.
  // Reason: Fallback now uses response metadata and only the selected original language.
  // // Explanation: Preserve the old inline bilingual warning expectation.
  // Reason: Fallback now uses response metadata and only the selected original language.
  //   expect(reply.text()).toContain(UNKNOWN_TRANSLATION);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Fallback warnings belong in a temporary browser notice.
  expect(reply.text()).not.toContain(UNKNOWN_TRANSLATION);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Fallback warnings belong in a temporary browser notice.
  expect(reply.headers.get("x-translation-unavailable")).toBe("1");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Fallback warnings belong in a temporary browser notice.
  expect(reply.text()).not.toContain(UNKNOWN_TRANSLATION);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Fallback warnings belong in a temporary browser notice.
  expect(reply.headers.get("x-translation-unavailable")).toBe("1");
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Fallback warnings belong in a temporary browser notice.
  expect(reply.text()).not.toContain(UNKNOWN_TRANSLATION);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Fallback warnings belong in a temporary browser notice.
  expect(reply.headers.get("x-translation-unavailable")).toBe("1");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).toContain(odometer.sources[0].translation.en);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  // Explanation: Preserve the previous bilingual fallback assertion.
  // Reason: Only the selected English evidence belongs in this response.
  // expect(reply.text()).toContain(odometer.sources[0].translation.zh);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Do not mix Chinese into an English fallback.
  expect(reply.text()).not.toContain(odometer.sources[0].translation.zh);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).not.toContain(paragraph);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
test("translated docent: unknown citation never exposes generated text or calls reviewers", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  let calls = 0;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = (async () => {
    calls++;
    return stream("Unchecked [来源:missing-source]");
  }) as typeof fetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const reply = await invoke(docentHandler, docentBody);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  // Explanation: Retain the old warning assertion for review.
  // Reason: Warnings now use metadata rather than paragraph text.
  //   expect(reply.text()).toContain(UNKNOWN_TRANSLATION);
  // Explanation: Verify the selected-source fallback metadata.
  // Reason: The browser uses it for the temporary popup.
  expect(reply.text()).not.toContain(UNKNOWN_TRANSLATION);
  // Explanation: Verify the safe temporary fallback signal.
  // Reason: No warning belongs in the answer text.
  expect(reply.headers.get("x-translation-unavailable")).toBe("1");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).not.toContain("Unchecked");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(calls).toBe(1);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
// Explanation: Preserve the earlier test title.
// Reason: The latest requirement uses source-only fallback with a temporary notice.
// test("translated docent: uncited paragraph retains bilingual principle evidence", async () => {
// Explanation: Name the current fallback behavior accurately.
// Reason: Reviewers should see what the test actually verifies.
test("translated docent: uncited paragraph retains selected English principle evidence", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = (async () =>
    stream("Uncited target text")) as typeof fetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const reply = await invoke(docentHandler, docentBody);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  // Explanation: Retain the old warning assertion for review.
  // Reason: Warnings now use metadata rather than paragraph text.
  //   expect(reply.text()).toContain(UNKNOWN_TRANSLATION);
  // Explanation: Verify the selected-source fallback metadata.
  // Reason: The browser uses it for the temporary popup.
  expect(reply.text()).not.toContain(UNKNOWN_TRANSLATION);
  // Explanation: Verify the safe temporary fallback signal.
  // Reason: No warning belongs in the answer text.
  expect(reply.headers.get("x-translation-unavailable")).toBe("1");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).toContain(odometer.principle.en);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  // Explanation: Preserve the previous bilingual fallback assertion.
  // Reason: Only the selected English evidence belongs in this response.
  // expect(reply.text()).toContain(odometer.principle.zh);
  // Explanation: Check the revised translation recovery behavior.
  // Reason: Do not mix Chinese into an English fallback.
  expect(reply.text()).not.toContain(odometer.principle.zh);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).not.toContain("Uncited target text");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
test("translated docent: truncated target stream never sends partial generated content", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  globalThis.fetch = (async () =>
    stream("Unchecked partial target", false)) as typeof fetch;
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  const reply = await invoke(docentHandler, docentBody);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.statusCode).toBe(502);
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).not.toContain("Unchecked partial target");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  expect(reply.text()).not.toContain("event: done");
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
// Explanation: Check the API behavior named below.
// Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
test("translated docent: Chinese, English and unsupported temporary targets are rejected", async () => {
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  for (const targetLanguage of ["en", "zh", "unsupported"]) {
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
    expect(
      (await invoke(docentHandler, { ...docentBody, targetLanguage }))
        .statusCode,
    ).toBe(400);
    // Explanation: Execute the API test setup, response simulation or assertion below.
    // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
  }
  // Explanation: Execute the API test setup, response simulation or assertion below.
  // Reason: Verify translation validation and preserve existing docent behavior without paid provider requests.
});
