import {
  type FormEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { applySchemePatch } from "../../sim/graph";
import type { MachineModule } from "../../sim/types";
import {
  partIdForDocentSource,
  parseDocentCitations,
  type DocentCitationSegment,
  type DocentTextSegment,
} from "../docent/citations";
import "../docent/docent.css";
import { classifyDocentProbeResponse } from "../docent/runtime";
import { consumeDocentSse } from "../docent/sse";
import { useUiStore } from "../store";

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

function mockDocentReply(sourceId: string, lang: Lang): string {
  return lang === "zh"
    ? `这是基于当前机械馆藏资料的开发环境讲解。[来源:${sourceId}]`
    : `This development response is grounded in the current machine record. [来源:${sourceId}]`;
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
  schemeId,
}: {
  text: string;
  module: MachineModule;
  schemeId?: string;
}): ReactElement {
  const setSelectedPartId = useUiStore((state) => state.setSelectedPartId);
  const activeParts = useMemo(
    () =>
      applySchemePatch(
        module.spec,
        schemeId ? module.schemes?.[schemeId] : undefined,
      ).parts,
    [module, schemeId],
  );
  const sourceById = useMemo(
    () => new Map(module.data.sources.map((source) => [source.id, source])),
    [module],
  );
  const parsed = useMemo(
    () => parseDocentCitations(text, new Set(sourceById.keys())),
    [sourceById, text],
  );
  const warned = useRef(new Set<string>());

  useEffect(() => {
    for (const sourceId of parsed.unknownSourceIds) {
      const key = `${module.spec.slug}:${sourceId}`;
      if (!warned.current.has(key)) {
        warned.current.add(key);
        console.warn(`Docent returned unknown source id: ${sourceId}`);
      }
    }
  }, [module.spec.slug, parsed.unknownSourceIds]);

  const navigateToSource = (sourceId: string): void => {
    const sourcePartId = partIdForDocentSource(activeParts, sourceId);
    if (!sourcePartId) return;
    setSelectedPartId(sourcePartId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById(
          `part-inspector-source-${sourceId}`,
        );
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        target?.focus({ preventScroll: true });
      });
    });
  };

  return (
    <>
      {parsed.segments.map(
        (segment: DocentTextSegment | DocentCitationSegment, index: number) => {
          if (segment.kind === "text") {
            return <span key={`${index}:text`}>{segment.text}</span>;
          }
          const source = sourceById.get(segment.sourceId);
          return (
            <a
              className="docent-citation"
              data-testid="docent-citation"
              href={`#part-inspector-source-${segment.sourceId}`}
              key={`${index}:${segment.sourceId}`}
              onClick={(event) => {
                event.preventDefault();
                navigateToSource(segment.sourceId);
              }}
              title={`${source?.book ?? segment.sourceId}${
                source?.chapter ? ` · ${source.chapter}` : ""
              }`}
            >
              {segment.marker}
            </a>
          );
        },
      )}
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
  const nextMessageId = useRef(1);

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

  const probe = async (): Promise<void> => {
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
        const sourceId = module.data.sources[0]?.id;
        if (!sourceId) throw new Error("docent_source_missing");
        const reply = mockDocentReply(sourceId, lang);
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

  if (availability === "hidden") return null;

  return (
    <>
      {!open ? (
        <button
          className="docent-entry"
          disabled={availability === "checking"}
          onClick={() => void probe()}
          type="button"
        >
          {availability === "checking" ? labels.checking : labels.entry}
        </button>
      ) : null}
      {open ? (
        <aside aria-label={labels.title} className="docent-drawer">
          <header className="docent-header">
            <strong>{labels.title}</strong>
            <button
              aria-label={labels.close}
              className="docent-close"
              onClick={() => setOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>
          <div aria-live="polite" className="docent-scroll">
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
                className={`docent-message docent-message-${message.role}`}
                key={message.id}
              >
                {message.role === "assistant" ? (
                  <GroundedAnswer
                    module={module}
                    schemeId={schemeId}
                    text={message.content}
                  />
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
