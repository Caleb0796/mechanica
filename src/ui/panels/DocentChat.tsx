import {
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { MachineModule } from "../../sim/types";
import "../docent/docent.css";
import { classifyDocentProbeResponse } from "../docent/runtime";
import { consumeDocentSse } from "../docent/sse";

const DEV_MOCK = import.meta.env.DEV || import.meta.env.VITE_E2E === "1";

type Lang = "zh" | "en";
type Availability =
  "unknown" | "checking" | "available" | "hidden" | "unavailable";

interface UiMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface ApiMessage {
  role: "user" | "assistant";
  content: string;
}

interface LocalizedText {
  zh: string;
  en: string;
}

interface SuggestionData {
  controversies?: Array<{ topic?: LocalizedText }>;
  schemes?: Array<{
    id?: string;
    name?: LocalizedText;
    title?: LocalizedText;
    scholar?: LocalizedText;
  }>;
}

export interface DocentChatProps {
  module: MachineModule;
  partId?: string | null;
  schemeId?: string;
}

function pageLang(): Lang {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang.toLowerCase().startsWith("zh")
    ? "zh"
    : "en";
}

function copy(lang: Lang) {
  return lang === "zh"
    ? {
        entry: "问馆员",
        checking: "正在连接…",
        title: "Mechanica 馆员",
        close: "关闭",
        placeholder: "询问这台机械…",
        send: "发送",
        unavailable: "馆员暂不可用。",
        retry: "重试一次",
        streaming: "馆员正在查阅馆藏…",
      }
    : {
        entry: "Ask the docent",
        checking: "Connecting…",
        title: "Mechanica docent",
        close: "Close",
        placeholder: "Ask about this machine…",
        send: "Send",
        unavailable: "Docent unavailable.",
        retry: "Retry once",
        streaming: "The docent is consulting the collection…",
      };
}

function suggestedQuestions(module: MachineModule, lang: Lang): string[] {
  const data = module.data as unknown as SuggestionData;
  const questions: string[] = [];
  for (const controversy of data.controversies ?? []) {
    const topic = controversy.topic?.[lang];
    if (topic) {
      questions.push(
        lang === "zh"
          ? `馆藏如何说明“${topic}”这一争议？`
          : `How does the collection frame the “${topic}” controversy?`,
      );
    }
  }
  for (const scheme of data.schemes ?? []) {
    const label =
      scheme.name?.[lang] ??
      scheme.title?.[lang] ??
      scheme.scholar?.[lang] ??
      scheme.id;
    if (label) {
      questions.push(
        lang === "zh"
          ? `“${label}”方案的依据是什么？`
          : `What evidence supports the “${label}” scheme?`,
      );
    }
  }
  const machineName = module.data.names[lang];
  const fallbacks =
    lang === "zh"
      ? [
          `${machineName}有哪些学术争议？`,
          `${machineName}的复原方案如何比较？`,
          `各争议或方案分别依据哪些馆藏来源？`,
        ]
      : [
          `What scholarly controversies concern ${machineName}?`,
          `How do the reconstruction schemes for ${machineName} compare?`,
          `Which collection sources support each controversy or scheme?`,
        ];
  for (const fallback of fallbacks) {
    if (questions.length >= 3) break;
    questions.push(fallback);
  }
  return questions.slice(0, 3);
}

function boundedContent(content: string): string {
  return [...content].slice(0, 500).join("");
}

export function mockDocentReply(
  question: string,
  module: MachineModule,
  lang: Lang,
): string {
  const data = module.data;
  const hit = data.controversies?.find(
    (controversy) =>
      question.includes(controversy.topic[lang]) ||
      question.includes(controversy.topic.zh) ||
      question.includes(controversy.topic.en),
  );
  if (hit) {
    const cite = hit.sourceIds[0] ?? data.sources[0].id;
    return `${hit.detail[lang]} [来源:${cite}]`;
  }
  const principle = data.principle[lang];
  const cite = data.sources[0].id;
  return lang === "zh"
    ? `${principle} 想深入了解，可以点开整机证据档案查看原文与尺寸。[来源:${cite}]`
    : `${principle} For depth, open the machine evidence register for quotes and dimensions. [来源:${cite}]`;
}

export type DocentSegment =
  | { kind: "text"; text: string }
  | { kind: "cite"; id: string; book: string };

export function renderDocentSegments(
  reply: string,
  sources: { id: string; book: string }[],
): DocentSegment[] {
  const segments: DocentSegment[] = [];
  const pattern = /\[来源:([a-z0-9-]+)\]/g;
  let cursor = 0;
  for (const match of reply.matchAll(pattern)) {
    if (match.index! > cursor) {
      segments.push({ kind: "text", text: reply.slice(cursor, match.index) });
    }
    const id = match[1];
    segments.push({
      kind: "cite",
      id,
      book: sources.find((source) => source.id === id)?.book ?? id,
    });
    cursor = match.index! + match[0].length;
  }
  if (cursor < reply.length) {
    segments.push({ kind: "text", text: reply.slice(cursor) });
  }
  return segments;
}

function requestMessages(messages: readonly UiMessage[]): ApiMessage[] {
  return messages
    .filter((message) => message.content.length > 0)
    .map(({ role, content }) => ({ role, content: boundedContent(content) }))
    .slice(-6);
}

function GroundedAnswer({
  text,
  module,
}: {
  text: string;
  module: MachineModule;
}): ReactElement {
  const segments = renderDocentSegments(text, module.data.sources);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return <span key={`${index}:text`}>{segment.text}</span>;
        }
        return (
          <sup
            className="docent-cite"
            key={`${index}:${segment.id}`}
            title={segment.book}
          >
            {segment.book}
          </sup>
        );
      })}
    </>
  );
}

export function DocentChat({
  module,
  partId,
  schemeId,
}: DocentChatProps): ReactElement | null {
  const lang = pageLang();
  const labels = copy(lang);
  const suggestions = useMemo(
    () => suggestedQuestions(module, lang),
    [lang, module],
  );
  const [availability, setAvailability] = useState<Availability>("unknown");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [failure, setFailure] = useState(false);
  const [retryAvailable, setRetryAvailable] = useState(false);
  const retryMessages = useRef<ApiMessage[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const nextMessageId = useRef(1);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    setAvailability("unknown");
    setOpen(false);
    setMessages([]);
    setStreaming(false);
    setFailure(false);
    setRetryAvailable(false);
    retryMessages.current = null;
  }, [module.spec.slug, partId, schemeId]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (open) inputRef.current?.focus();
      else if (previousFocus.current) {
        (launcherRef.current ?? previousFocus.current).focus();
        previousFocus.current = null;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const closeDocent = (): void => setOpen(false);

  const handleDrawerKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDocent();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const probe = async (): Promise<void> => {
    if (document.activeElement instanceof HTMLElement) {
      previousFocus.current = document.activeElement;
    }
    if (availability === "available") {
      setOpen(true);
      return;
    }
    if (availability === "checking") return;
    setAvailability("checking");
    if (DEV_MOCK) {
      setAvailability("available");
      setOpen(true);
      return;
    }
    try {
      const response = await fetch("/api/docent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Docent-Probe": "1",
        },
        body: JSON.stringify({
          slug: module.spec.slug,
          ...(partId ? { partId } : {}),
          ...(schemeId ? { schemeId } : {}),
          lang,
          messages: [],
        }),
      });
      const outcome = classifyDocentProbeResponse(response);
      if (outcome === "hidden") {
        setAvailability("hidden");
        setOpen(false);
        return;
      }
      if (outcome === "unavailable") throw new Error("docent_probe_failed");
      setAvailability("available");
      setOpen(true);
    } catch {
      setAvailability("unavailable");
      setOpen(true);
      setFailure(true);
    }
  };

  const streamAnswer = async (
    conversation: ApiMessage[],
    isRetry: boolean,
  ): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const assistantId = nextMessageId.current++;
    setMessages((current) => [
      ...current.filter(
        (message) => message.role !== "assistant" || message.content.length > 0,
      ),
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setStreaming(true);
    setFailure(false);
    setRetryAvailable(false);

    const appendDelta = (delta: string): void => {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: message.content + delta }
            : message,
        ),
      );
    };

    try {
      if (DEV_MOCK) {
        const question = conversation.at(-1)?.content ?? "";
        const reply = mockDocentReply(question, module, lang);
        for (let offset = 0; offset < reply.length; offset += 8) {
          await Promise.resolve();
          if (controller.signal.aborted) return;
          appendDelta(reply.slice(offset, offset + 8));
        }
      } else {
        const response = await fetch("/api/docent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: module.spec.slug,
            ...(partId ? { partId } : {}),
            ...(schemeId ? { schemeId } : {}),
            lang,
            messages: conversation,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("docent_request_failed");
        await consumeDocentSse(response, appendDelta);
      }
      setAvailability("available");
    } catch {
      if (controller.signal.aborted) return;
      setMessages((current) =>
        current.filter((message) => message.id !== assistantId),
      );
      setAvailability("unavailable");
      setFailure(true);
      setRetryAvailable(!isRetry);
      retryMessages.current = conversation;
    } finally {
      if (!controller.signal.aborted) setStreaming(false);
    }
  };

  const ask = (question: string): void => {
    const content = boundedContent(question.trim());
    if (!content || streaming) return;
    const userMessage: UiMessage = {
      id: nextMessageId.current++,
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    const conversation = requestMessages(nextMessages);
    retryMessages.current = conversation;
    void streamAnswer(conversation, false);
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    ask(input);
  };

  const retry = (): void => {
    if (!retryAvailable || !retryMessages.current || streaming) return;
    setRetryAvailable(false);
    void streamAnswer(retryMessages.current, true);
  };
  const newestAssistantMessageId = messages.reduce<number | null>(
    (id, message) => (message.role === "assistant" ? message.id : id),
    null,
  );

  if (availability === "hidden") return null;

  return (
    <>
      {!open ? (
        <button
          className="docent-entry"
          disabled={availability === "checking"}
          onClick={() => void probe()}
          ref={launcherRef}
          type="button"
        >
          {availability === "checking" ? labels.checking : labels.entry}
        </button>
      ) : null}
      {open ? (
        <aside
          aria-labelledby="docent-title"
          aria-modal="true"
          className="docent-drawer"
          onKeyDown={handleDrawerKeyDown}
          role="dialog"
        >
          <header className="docent-header">
            <strong id="docent-title">{labels.title}</strong>
            <button
              aria-label={labels.close}
              className="docent-close"
              onClick={closeDocent}
              type="button"
            >
              ×
            </button>
          </header>
          <div className="docent-scroll">
            {messages.length === 0 && !failure ? (
              <div className="docent-suggestions">
                {suggestions.map((question) => (
                  <button
                    className="docent-suggestion"
                    key={question}
                    onClick={() => ask(question)}
                    type="button"
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}
            {messages.map((message) => (
              <p
                aria-live={
                  message.role === "assistant" &&
                  message.id === newestAssistantMessageId
                    ? "polite"
                    : undefined
                }
                className={`docent-message docent-message-${message.role}`}
                key={message.id}
              >
                {message.role === "assistant" ? (
                  <GroundedAnswer module={module} text={message.content} />
                ) : (
                  message.content
                )}
              </p>
            ))}
            {streaming && messages.at(-1)?.content.length === 0 ? (
              <p className="docent-message docent-message-assistant">
                {labels.streaming}
              </p>
            ) : null}
            {failure ? (
              <div className="docent-status" role="status">
                <p>{labels.unavailable}</p>
                {retryAvailable ? (
                  <button
                    className="docent-retry"
                    onClick={retry}
                    type="button"
                  >
                    {labels.retry}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <form className="docent-composer" onSubmit={submit}>
            <input
              className="docent-input"
              data-testid="docent-input"
              disabled={streaming || availability === "unavailable"}
              maxLength={500}
              onChange={(event) => setInput(event.target.value)}
              placeholder={labels.placeholder}
              ref={inputRef}
              value={input}
            />
            <button
              className="docent-send"
              data-testid="docent-send"
              disabled={
                streaming ||
                availability === "unavailable" ||
                input.trim().length === 0
              }
              type="submit"
            >
              {labels.send}
            </button>
          </form>
        </aside>
      ) : null}
    </>
  );
}

export default DocentChat;
