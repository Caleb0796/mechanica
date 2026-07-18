export type DocentSseEvent =
  | { kind: "delta"; delta: string }
  | { kind: "done" }
  | { kind: "error"; code: string };

export function parseDocentSseBlock(block: string): DocentSseEvent | null {
  const normalized = block.replace(/\r\n/g, "\n");
  const eventName =
    normalized
      .split("\n")
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim() ?? "message";
  const data = normalized
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;

  let payload: { type?: unknown; delta?: unknown; code?: unknown };
  try {
    payload = JSON.parse(data) as {
      type?: unknown;
      delta?: unknown;
      code?: unknown;
    };
  } catch {
    return null;
  }
  if (
    (eventName === "response.output_text.delta" ||
      payload.type === "response.output_text.delta") &&
    typeof payload.delta === "string"
  ) {
    return { kind: "delta", delta: payload.delta };
  }
  if (eventName === "done") return { kind: "done" };
  if (eventName === "error") {
    return {
      kind: "error",
      code: typeof payload.code === "string" ? payload.code : "stream_error",
    };
  }
  return null;
}

export async function consumeDocentSse(
  response: Response,
  onDelta: (delta: string) => void,
): Promise<void> {
  if (!response.body) throw new Error("docent_stream_missing");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    buffer = buffer.replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const event = parseDocentSseBlock(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      if (event?.kind === "delta") onDelta(event.delta);
      if (event?.kind === "done") completed = true;
      if (event?.kind === "error") throw new Error(event.code);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
  if (buffer.trim()) {
    const event = parseDocentSseBlock(buffer);
    if (event?.kind === "delta") onDelta(event.delta);
    if (event?.kind === "done") completed = true;
    if (event?.kind === "error") throw new Error(event.code);
  }
  if (!completed) throw new Error("docent_stream_incomplete");
}
