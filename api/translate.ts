// Explanation: Import the temporary translation dependency.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
import {
  isTargetLanguage,
  translateAndValidate,
  type JsonModel,
  type TranslationItem,
} from "../src/localization/translation";
// Explanation: Apply the current declare operation in the translation pipeline.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
declare const process: { env: Record<string, string | undefined> };
// Explanation: Define config for this operation.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
export const config = { api: { bodyParser: false }, maxDuration: 60 };
// Explanation: Define request for this operation.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
interface Request extends AsyncIterable<Uint8Array | string> {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: "aborted", listener: () => void): void;
  socket?: { remoteAddress?: string | null };
}
// Explanation: Define response for this operation.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
interface Response {
  statusCode: number;
  writableEnded?: boolean;
  setHeader(name: string, value: string): void;
  end(value?: string): void;
  on(event: "close", listener: () => void): void;
  off?(event: "close", listener: () => void): void;
}
// Explanation: Define windows for this operation.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
const windows = new Map<string, { start: number; count: number }>();
// Explanation: Define daily for this operation.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
let daily = { day: "", count: 0 };
// Explanation: Define allow for the translation pipeline.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
function allow(request: Request): boolean {
  // Explanation: Define now for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const now = Date.now();
  // Explanation: Process the relevant translation items without creating persistent artifacts.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  for (const [key, value] of windows)
    if (now - value.start >= 60_000) windows.delete(key);
  // Explanation: Define forwarded for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const forwarded = request.headers["x-forwarded-for"];
  // Explanation: Define ip for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(",")[0]
      ?.trim() ||
    request.socket?.remoteAddress ||
    "unknown";
  // Explanation: Define window for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const window = windows.get(ip) || { start: now, count: 0 };
  // Explanation: Apply the current window operation in the translation pipeline.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  window.count += 1;
  // Explanation: Record the current translation mapping in memory.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  windows.set(ip, window);
  // Explanation: Define day for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const day = new Date().toISOString().slice(0, 10);
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (daily.day !== day) daily = { day, count: 0 };
  // Explanation: Define configured for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const configured = Number(process.env.TRANSLATION_DAILY_BUDGET || "500");
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (
    window.count > 30 ||
    daily.count >=
      (Number.isFinite(configured) && configured > 0 ? configured : 500)
  )
    return false;
  // Explanation: Apply the current daily operation in the translation pipeline.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  daily.count += 1;
  // Explanation: Return the computed translation value or validation outcome.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  return true;
  // Explanation: Complete the current translation scope or callback.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
}
// Explanation: Define parse translation body for the translation pipeline.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
export function parseTranslationBody(raw: string): {
  language: string;
  items: TranslationItem[];
} {
  // Explanation: Define value for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const value = JSON.parse(raw) as Record<string, unknown>;
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (
    !value ||
    typeof value !== "object" ||
    !isTargetLanguage(value.language) ||
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > 16
  )
    throw new Error("request_invalid");
  // Explanation: Define items for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const items = value.items.map((item: unknown) => {
    // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    if (!item || typeof item !== "object") throw new Error("item_invalid");
    // Explanation: Define record for this operation.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    const record = item as Record<string, unknown>;
    // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    if (
      typeof record.id !== "string" ||
      record.id.length > 25_000 ||
      !record.id
    )
      throw new Error("item_invalid");
    // Explanation: Process the relevant translation items without creating persistent artifacts.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    for (const key of ["en", "zh", "context"])
      if (
        record[key] !== undefined &&
        (typeof record[key] !== "string" ||
          (record[key] as string).length > 12_000)
      )
        throw new Error("item_invalid");
    // Explanation: Return the computed translation value or validation outcome.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    return {
      id: record.id,
      en: record.en as string | undefined,
      zh: record.zh as string | undefined,
      context: record.context as string | undefined,
    };
    // Explanation: Complete the current translation scope or callback.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  });
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error("duplicate_item");
  // Explanation: Return the computed translation value or validation outcome.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  return { language: value.language, items };
  // Explanation: Complete the current translation scope or callback.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
}
// Explanation: Define send for the translation pipeline.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
function send(response: Response, status: number, value: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.end(JSON.stringify(value));
}
// Explanation: Apply the current  operation in the translation pipeline.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
// Explanation: Expose the stateless model adapter for validated docent output.
// Reason: Both API routes must use the same temporary structured-output contract.
// const model: JsonModel = async
// Explanation: Expose the stateless model adapter for validated docent output.
// Reason: Both API routes must use the same temporary structured-output contract.
export const translationModel: JsonModel = async (
  instructions,
  input,
  schema,
  signal,
) => {
  // Explanation: Define response for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:
        process.env.TRANSLATION_MODEL || process.env.OPENAI_MODEL || "gpt-5.6",
      store: false,
      instructions,
      input: JSON.stringify(input),
      max_output_tokens: 12_000,
      text: {
        format: {
          type: "json_schema",
          name: "temporary_translation",
          strict: true,
          schema,
        },
      },
    }),
    signal,
  });
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  // Explanation: Preserve the superseded implementation for review.
  // Reason: Billing and authentication failures must not be disguised as translation disagreement or leak raw provider errors.
  //   if (!response.ok) throw new Error("upstream_unavailable");
  // Explanation: Classify provider failures into safe actionable reason codes.
  // Reason: Billing and authentication failures must not be disguised as translation disagreement or leak raw provider errors.
  if (!response.ok) {
    // Explanation: Classify provider failures into safe actionable reason codes.
    // Reason: Billing and authentication failures must not be disguised as translation disagreement or leak raw provider errors.
    const failure = (await response.json().catch(() => ({}))) as {
      error?: { code?: unknown };
    };
    // Explanation: Classify provider failures into safe actionable reason codes.
    // Reason: Billing and authentication failures must not be disguised as translation disagreement or leak raw provider errors.
    const code = failure.error?.code;
    // Explanation: Classify provider failures into safe actionable reason codes.
    // Reason: Billing and authentication failures must not be disguised as translation disagreement or leak raw provider errors.
    const billingCodes = [
      "credit_balance_exhausted",
      "insufficient_quota",
      "organization_spend_limit_exceeded",
      "project_spend_limit_exceeded",
      "organization_usage_limit_exceeded",
    ];
    // Explanation: Classify provider failures into safe actionable reason codes.
    // Reason: Billing and authentication failures must not be disguised as translation disagreement or leak raw provider errors.
    const reason =
      typeof code === "string" && billingCodes.includes(code)
        ? "provider_billing_required"
        : response.status === 401
          ? "provider_authentication_failed"
          : response.status === 403
            ? "provider_access_denied"
            : response.status === 404
              ? "provider_model_unavailable"
              : response.status === 429
                ? "provider_rate_limited"
                : "service_unavailable";
    // Explanation: Classify provider failures into safe actionable reason codes.
    // Reason: Billing and authentication failures must not be disguised as translation disagreement or leak raw provider errors.
    throw new Error(reason);
    // Explanation: Classify provider failures into safe actionable reason codes.
    // Reason: Billing and authentication failures must not be disguised as translation disagreement or leak raw provider errors.
  }
  // Explanation: Define payload for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const payload = (await response.json()) as {
    status?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (payload.status !== "completed") throw new Error("upstream_incomplete");
  // Explanation: Define text for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("");
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (!text) throw new Error("upstream_empty");
  // Explanation: Return the computed translation value or validation outcome.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  return JSON.parse(text);
  // Explanation: Complete the current translation scope or callback.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
};
// Explanation: Apply the current export operation in the translation pipeline.
// Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
export default async function handler(
  request: Request,
  response: Response,
): Promise<void> {
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    send(response, 405, { error: "method_not_allowed" });
    return;
  }
  // Explanation: Define body for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  let body: ReturnType<typeof parseTranslationBody>;
  // Explanation: Handle translation-provider failures without accepting unchecked text.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  try {
    // Explanation: Define chunks for this operation.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    const chunks: Uint8Array[] = [];
    // Explanation: Define length for this operation.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    let length = 0;
    // Explanation: Process the relevant translation items without creating persistent artifacts.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    for await (const chunk of request) {
      // Explanation: Define bytes for this operation.
      // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
      const bytes =
        typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
      // Explanation: Apply the current length operation in the translation pipeline.
      // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
      length += bytes.byteLength;
      // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
      // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
      if (length > 131_072) throw new Error("body_too_large");
      // Explanation: Apply the current chunks operation in the translation pipeline.
      // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
      chunks.push(bytes);
      // Explanation: Complete the current translation scope or callback.
      // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    }
    // Explanation: Define merged for this operation.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    const merged = new Uint8Array(length);
    // Explanation: Define offset for this operation.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    let offset = 0;
    // Explanation: Process the relevant translation items without creating persistent artifacts.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    // Explanation: Apply the current body operation in the translation pipeline.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    body = parseTranslationBody(
      new TextDecoder("utf-8", { fatal: true }).decode(merged),
    );
    // Explanation: Complete the current translation scope or callback.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  } catch {
    send(response, 400, { error: "request_invalid" });
    return;
  }
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (!process.env.OPENAI_API_KEY) {
    send(response, 503, { error: "translation_not_configured" });
    return;
  }
  // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  if (!allow(request)) {
    send(response, 429, { error: "rate_limited" });
    return;
  }
  // Explanation: Define controller for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const controller = new AbortController();
  // Explanation: Define timeout for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const timeout = setTimeout(() => controller.abort(), 50_000);
  // Explanation: Define disconnect for this operation.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  const disconnect = () => {
    if (!response.writableEnded) controller.abort();
  };
  // Explanation: Apply the current request operation in the translation pipeline.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  request.on("aborted", disconnect);
  // Explanation: Apply the current response operation in the translation pipeline.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  response.on("close", disconnect);
  // Explanation: Handle translation-provider failures without accepting unchecked text.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  try {
    // Explanation: Define results for this operation.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    const results =
      await // Explanation: Use the shared stateless provider adapter.
      // Reason: No translation text should be cached or persisted by either route.
      // translateAndValidate(body.items, body.language, model, controller.signal)
      // Explanation: Use the shared stateless provider adapter.
      // Reason: No translation text should be cached or persisted by either route.
      translateAndValidate(
        body.items,
        body.language,
        translationModel,
        controller.signal,
      );
    // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    if (!response.writableEnded) send(response, 200, { results });
    // Explanation: Complete the current translation scope or callback.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    // Explanation: Preserve the superseded implementation for review.
    // Reason: The browser needs an actionable reason without receiving credentials or raw error text.
    //   } catch {
    // Explanation: Capture the translation failure for safe classification.
    // Reason: The browser needs an actionable reason without receiving credentials or raw error text.
  } catch (error) {
    // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
    // Explanation: Preserve the superseded implementation for review.
    // Reason: Users need to know when credit, credentials or model access prevents generation.
    //     if (!response.writableEnded) send(response, 200, { results: body.items.map(item => ({ id: item.id, status: "uncertain", reason: "service_unavailable" })) });
    // Explanation: Return a safe failure code with each unaccepted item.
    // Reason: Users need to know when credit, credentials or model access prevents generation.
    const knownReasons = [
      "provider_billing_required",
      "provider_authentication_failed",
      "provider_access_denied",
      "provider_model_unavailable",
      "provider_rate_limited",
    ];
    // Explanation: Return a safe failure code with each unaccepted item.
    // Reason: Users need to know when credit, credentials or model access prevents generation.
    const reason =
      error instanceof Error && knownReasons.includes(error.message)
        ? error.message
        : "service_unavailable";
    // Explanation: Return a safe failure code with each unaccepted item.
    // Reason: Users need to know when credit, credentials or model access prevents generation.
    if (!response.writableEnded)
      send(response, 200, {
        results: body.items.map((item) => ({
          id: item.id,
          status: "uncertain",
          reason,
        })),
      });
    // Explanation: Complete the current translation scope or callback.
    // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
  } finally {
    clearTimeout(timeout);
    response.off?.("close", disconnect);
  }
  // Explanation: Complete the current translation scope or callback.
  // Reason: Perform generation and two post-translation reviews on the server without storing text or exposing API credentials.
}
