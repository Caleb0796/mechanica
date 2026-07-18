import astroclockDataJson from "../src/data/machines/astroclock.json";
import bellowsDataJson from "../src/data/machines/bellows.json";
import chainpumpDataJson from "../src/data/machines/chainpump.json";
import chariotDataJson from "../src/data/machines/chariot.json";
import gimbalDataJson from "../src/data/machines/gimbal.json";
import loomDataJson from "../src/data/machines/loom.json";
import odometerDataJson from "../src/data/machines/odometer.json";
import seismoscopeDataJson from "../src/data/machines/seismoscope.json";
import typecaseDataJson from "../src/data/machines/typecase.json";
import woodenOxDataJson from "../src/data/machines/wooden-ox.json";
import astroclockPartsJson from "../src/machines/astroclock/parts.json";
import bellowsPartsJson from "../src/machines/bellows/parts.json";
import chainpumpPartsJson from "../src/machines/chainpump/parts.json";
import chariotPartsJson from "../src/machines/chariot/parts.json";
import gimbalPartsJson from "../src/machines/gimbal/parts.json";
import loomPartsJson from "../src/machines/loom/parts.json";
import odometerPartsJson from "../src/machines/odometer/parts.json";
import seismoscopePartsJson from "../src/machines/seismoscope/parts.json";
import typecasePartsJson from "../src/machines/typecase/parts.json";
import woodenOxPartsJson from "../src/machines/wooden-ox/parts.json";
import type { MachineData, MachineSlug } from "../src/sim/types";

declare const process: { env: Record<string, string | undefined> };

export const config = { api: { bodyParser: false } };

const MAX_BODY_BYTES = 8192;
const MAX_MESSAGES = 6;
const MAX_MESSAGE_CHARS = 500;
const MAX_ESTIMATED_INPUT_TOKENS = 6000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const UPSTREAM_TIMEOUT_MS = 30_000;

export const DOCENT_PROMPT_CORE = `你是数字博物馆「古械重生 Mechanica」的馆员。仅依据下方【馆藏资料】回答观众问题：
- 每个事实性断言后必须附来源标记，格式 [来源:<source_id>]；
- 资料未覆盖的问题，直说「馆藏资料未涉及」，可指引观众查看相关机械页，禁止臆测补充；
- 涉及数字（尺寸/齿数/年代）必须逐字取自资料，禁止推算生成新数字；
- 存在学术争议时并列诸家方案与各自依据，不替观众下唯一结论；
- 回答默认 ≤200 字，观众追问再展开；语言跟随 lang 字段。
【馆藏资料】= 当前机械完整 MachineData JSON + 当前选中零件 partId + 当前方案 schemeId
            + 十台机械 oneLiner 索引（供跨馆指引）。`;

type DocentRole = "user" | "assistant";

export interface DocentMessage {
  role: DocentRole;
  content: string;
}

export interface DocentRequestBody {
  slug: MachineSlug;
  partId?: string;
  schemeId?: string;
  lang: "zh" | "en";
  messages: DocentMessage[];
}

type PartsJson = Array<{ id: string }> | { parts: Array<{ id: string }> };

interface MachineRecord {
  data: MachineData;
  partIds: ReadonlySet<string>;
}

function machineRecord(dataJson: unknown, partsJson: unknown): MachineRecord {
  const parsedParts = partsJson as PartsJson;
  const parts = Array.isArray(parsedParts) ? parsedParts : parsedParts.parts;
  return {
    data: dataJson as MachineData,
    partIds: new Set(parts.map((part) => part.id)),
  };
}

const machines: Record<MachineSlug, MachineRecord> = {
  astroclock: machineRecord(astroclockDataJson, astroclockPartsJson),
  seismoscope: machineRecord(seismoscopeDataJson, seismoscopePartsJson),
  chariot: machineRecord(chariotDataJson, chariotPartsJson),
  odometer: machineRecord(odometerDataJson, odometerPartsJson),
  "wooden-ox": machineRecord(woodenOxDataJson, woodenOxPartsJson),
  loom: machineRecord(loomDataJson, loomPartsJson),
  typecase: machineRecord(typecaseDataJson, typecasePartsJson),
  chainpump: machineRecord(chainpumpDataJson, chainpumpPartsJson),
  bellows: machineRecord(bellowsDataJson, bellowsPartsJson),
  gimbal: machineRecord(gimbalDataJson, gimbalPartsJson),
};

const machineSlugs = new Set(Object.keys(machines));
const oneLinerIndex = Object.values(machines).map(({ data }) => ({
  slug: data.slug,
  oneLiner: data.oneLiner,
}));

export function buildPrompt(body: DocentRequestBody): string {
  const machine = machines[body.slug];
  return `${DOCENT_PROMPT_CORE}

lang=${body.lang}
partId=${body.partId ?? "null"}
schemeId=${body.schemeId ?? "null"}

【当前机械 MachineData JSON】
${JSON.stringify(machine.data)}

【十台机械 oneLiner 索引】
${JSON.stringify(oneLinerIndex)}`;
}

class RequestViolation extends Error {}

interface ApiRequest extends AsyncIterable<Uint8Array | string> {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | null };
  on(event: "aborted", listener: () => void): void;
}

interface ApiResponse {
  statusCode: number;
  headersSent?: boolean;
  writableEnded?: boolean;
  setHeader(name: string, value: string): void;
  write(chunk: string): boolean;
  end(chunk?: string): void;
  on(event: "close", listener: () => void): void;
  off?(event: "close", listener: () => void): void;
}

function header(request: ApiRequest, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(
  response: ApiResponse,
  status: number,
  value: Record<string, unknown>,
): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(value));
}

async function readRawBody(request: ApiRequest): Promise<string> {
  const contentLength = header(request, "content-length");
  if (contentLength !== undefined) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_BODY_BYTES) {
      throw new RequestViolation("body_too_large");
    }
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  for await (const chunk of request) {
    const bytes =
      typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    byteLength += bytes.byteLength;
    if (byteLength > MAX_BODY_BYTES) {
      throw new RequestViolation("body_too_large");
    }
    chunks.push(bytes);
  }

  const merged = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(merged);
  } catch {
    throw new RequestViolation("body_not_utf8");
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseBody(rawBody: string): DocentRequestBody {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new RequestViolation("body_not_json");
  }
  if (!isPlainObject(parsed)) throw new RequestViolation("body_invalid");
  if (
    !hasOnlyKeys(
      parsed,
      new Set(["slug", "partId", "schemeId", "lang", "messages"]),
    )
  ) {
    throw new RequestViolation("body_invalid");
  }

  const slug = parsed.slug;
  if (typeof slug !== "string" || !machineSlugs.has(slug)) {
    throw new RequestViolation("slug_invalid");
  }
  const typedSlug = slug as MachineSlug;
  if (parsed.lang !== "zh" && parsed.lang !== "en") {
    throw new RequestViolation("lang_invalid");
  }
  if (parsed.partId !== undefined && typeof parsed.partId !== "string") {
    throw new RequestViolation("part_invalid");
  }
  if (
    typeof parsed.partId === "string" &&
    !machines[typedSlug].partIds.has(parsed.partId)
  ) {
    throw new RequestViolation("part_invalid");
  }
  if (parsed.schemeId !== undefined && typeof parsed.schemeId !== "string") {
    throw new RequestViolation("scheme_invalid");
  }
  const schemeIds = new Set(
    machines[typedSlug].data.schemes.map((scheme) => scheme.id),
  );
  if (typeof parsed.schemeId === "string" && !schemeIds.has(parsed.schemeId)) {
    throw new RequestViolation("scheme_invalid");
  }
  if (
    !Array.isArray(parsed.messages) ||
    parsed.messages.length > MAX_MESSAGES
  ) {
    throw new RequestViolation("messages_invalid");
  }

  const messages: DocentMessage[] = parsed.messages.map((message) => {
    if (
      !isPlainObject(message) ||
      !hasOnlyKeys(message, new Set(["role", "content"])) ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      [...message.content].length > MAX_MESSAGE_CHARS
    ) {
      throw new RequestViolation("message_invalid");
    }
    return { role: message.role, content: message.content };
  });

  return {
    slug: typedSlug,
    partId: parsed.partId as string | undefined,
    schemeId: parsed.schemeId as string | undefined,
    lang: parsed.lang,
    messages,
  };
}

export function estimateInputTokens(value: string): number {
  let ascii = 0;
  let nonAscii = 0;
  for (const character of value) {
    if (character.codePointAt(0)! <= 0x7f) ascii += 1;
    else nonAscii += 1;
  }
  return Math.ceil(ascii / 4) + nonAscii;
}

function validateEstimatedInput(body: DocentRequestBody, prompt: string): void {
  const conversation = body.messages
    .map((message) => `${message.role}:${message.content}`)
    .join("\n");
  if (
    estimateInputTokens(`${prompt}\n${conversation}`) >
    MAX_ESTIMATED_INPUT_TOKENS
  ) {
    throw new RequestViolation("input_too_large");
  }
}

interface RateWindow {
  startedAt: number;
  count: number;
}

// This in-memory IP guard is intentionally approximate across serverless instances.
const ipWindows = new Map<string, RateWindow>();

function requestIp(request: ApiRequest): string {
  const forwarded = header(request, "x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    header(request, "x-real-ip") ||
    request.socket?.remoteAddress ||
    "unknown"
  );
}

function allowIp(ip: string, now = Date.now()): boolean {
  const existing = ipWindows.get(ip);
  if (!existing || now - existing.startedAt >= RATE_WINDOW_MS) {
    ipWindows.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  existing.count += 1;
  return existing.count <= RATE_LIMIT;
}

interface SharedStoreConfig {
  url: string;
  token: string;
}

function sharedStore(): SharedStoreConfig | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function dailyBudget(): number {
  const configured = Number(process.env.DOCENT_DAILY_BUDGET ?? "500");
  return Number.isInteger(configured) && configured > 0 ? configured : 500;
}

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function nextUtcMidnightSeconds(now = new Date()): number {
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) /
      1000,
  );
}

// Enabled only by explicit opt-in; this fallback is approximate across instances.
const approximateDailyCounts = new Map<string, number>();

async function incrementDailyUsage(
  signal: AbortSignal,
): Promise<"allowed" | "exhausted" | "unavailable"> {
  const day = utcDay();
  const key = `mechanica:docent:daily:${day}`;
  const store = sharedStore();
  let count: number;

  if (store) {
    try {
      const response = await fetch(`${store.url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${store.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIREAT", key, nextUtcMidnightSeconds()],
        ]),
        signal,
      });
      if (!response.ok) return "unavailable";
      const result = (await response.json()) as Array<{ result?: unknown }>;
      count = Number(result[0]?.result);
      if (!Number.isFinite(count)) return "unavailable";
    } catch (error) {
      if (signal.aborted) throw error;
      return "unavailable";
    }
  } else {
    if (process.env.DOCENT_ACCEPT_APPROX_LIMITS !== "1") return "unavailable";
    count = (approximateDailyCounts.get(day) ?? 0) + 1;
    approximateDailyCounts.set(day, count);
  }

  return count <= dailyBudget() ? "allowed" : "exhausted";
}

function limitsConfigured(): boolean {
  return (
    Boolean(sharedStore()) || process.env.DOCENT_ACCEPT_APPROX_LIMITS === "1"
  );
}

function writeSse(
  response: ApiResponse,
  event: string,
  value: Record<string, unknown>,
): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
}

async function relaySemanticDeltas(
  upstream: Response,
  response: ApiResponse,
): Promise<void> {
  if (!upstream.body) throw new Error("upstream_body_missing");
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  let receivedText = false;

  const consumeBlock = (block: string): void => {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]" || completed) return;
    let event: { type?: unknown; delta?: unknown };
    try {
      event = JSON.parse(data) as { type?: unknown; delta?: unknown };
    } catch {
      throw new Error("upstream_event_invalid");
    }
    if (
      event.type === "response.output_text.delta" &&
      typeof event.delta === "string"
    ) {
      if (event.delta.length === 0) return;
      receivedText = true;
      writeSse(response, "response.output_text.delta", {
        type: event.type,
        delta: event.delta,
      });
    } else if (event.type === "response.completed" && !completed) {
      if (!receivedText) throw new Error("upstream_output_empty");
      writeSse(response, "done", {});
      completed = true;
    } else if (
      event.type === "response.failed" ||
      event.type === "response.incomplete" ||
      event.type === "error"
    ) {
      throw new Error("upstream_failed");
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    buffer = buffer.replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      consumeBlock(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
  if (buffer.trim()) consumeBlock(buffer);
  if (!completed) throw new Error("upstream_stream_incomplete");
  response.end();
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  let body: DocentRequestBody;
  let instructions: string;
  try {
    body = parseBody(await readRawBody(request));
    instructions = buildPrompt(body);
    validateEstimatedInput(body, instructions);
  } catch (error) {
    sendJson(response, 400, {
      error:
        error instanceof RequestViolation ? error.message : "request_invalid",
    });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, { disabled: true });
    return;
  }
  if (!limitsConfigured()) {
    sendJson(response, 503, {
      disabled: true,
      reason: "shared_limit_unavailable",
    });
    return;
  }
  if (header(request, "x-docent-probe") === "1") {
    response.statusCode = 204;
    response.setHeader("Cache-Control", "no-store");
    response.end();
    return;
  }
  if (!allowIp(requestIp(request))) {
    sendJson(response, 429, { error: "rate_limited" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort("timeout"),
    UPSTREAM_TIMEOUT_MS,
  );
  const abortForDisconnect = (): void => {
    if (!response.writableEnded) controller.abort("client_disconnected");
  };
  request.on("aborted", abortForDisconnect);
  response.on("close", abortForDisconnect);

  try {
    const daily = await incrementDailyUsage(controller.signal);
    if (daily === "unavailable") {
      sendJson(response, 503, {
        disabled: true,
        reason: "shared_limit_unavailable",
      });
      return;
    }
    if (daily === "exhausted") {
      sendJson(response, 503, { error: "daily_budget_exhausted" });
      return;
    }

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6",
        instructions,
        input: body.messages,
        max_output_tokens: 600,
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!upstream.ok) {
      sendJson(response, 502, { error: "docent_upstream_unavailable" });
      return;
    }
    await relaySemanticDeltas(upstream, response);
  } catch (error) {
    if (response.writableEnded) return;
    if (controller.signal.reason === "client_disconnected") return;
    const timedOut = controller.signal.reason === "timeout";
    if (response.headersSent) {
      writeSse(response, "error", {
        code: timedOut ? "docent_timeout" : "docent_upstream_unavailable",
      });
      response.end();
    } else if (timedOut) {
      sendJson(response, 504, { error: "docent_timeout" });
    } else {
      sendJson(response, 502, { error: "docent_upstream_unavailable" });
    }
  } finally {
    clearTimeout(timeout);
    response.off?.("close", abortForDisconnect);
  }
}
