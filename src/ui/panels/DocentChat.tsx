// Explanation: Read the active in-memory target and original source language separately.
// Reason: Temporary translation must not turn Chinese or English into a different API source preference.
// Explanation: Preserve the previous implementation for review.
// Reason: Docent fallback shares the existing temporary translation popup.
// import { getTranslationState } from "../../localization/session";
// Explanation: Apply translation correction and source-only fallback.
// Reason: Docent fallback shares the existing temporary translation popup.
import {
  getTranslationState,
  notifyTranslationUnavailable,
} from "../../localization/session";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TFunction } from "i18next";
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// import { useTranslation } from "react-i18next";
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
// import { useTranslation, localize, localizeSingle } from "../i18n/requestedTranslation";
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
import { useTranslation, localize } from "../i18n/requestedTranslation";

import type { MachineModule } from "../../sim/types";
import "../docent/docent.css";
import { classifyDocentProbeResponse } from "../docent/runtime";
import { consumeDocentSse } from "../docent/sse";
import i18n from "../i18n";

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

// Explanation: Keep docent source-language detection independent of the translated page.
// Reason: The document may now have a third-language tag.
// function pageLang(): Lang {
//   if (typeof document === "undefined") return "en";
//   return document.documentElement.lang.toLowerCase().startsWith("zh")
//     ? "zh"
//     : "en";
// }
//
// Explanation: Keep docent source-language detection independent of the translated page.
// Reason: The document may now have a third-language tag.
function pageLang(): Lang {
  // Explanation: Use the original i18next language instead of the translated document attribute.
  // Reason: The temporary target is a separate request field.
  return i18n.resolvedLanguage === "zh" ? "zh" : "en";
  // Explanation: Complete original-language detection.
  // Reason: Existing bilingual records stay indexed by English or Chinese.
}

function suggestedQuestions(
  module: MachineModule,
  lang: Lang,
  t: TFunction,
): string[] {
  const data = module.data as unknown as SuggestionData;
  const questions: string[] = [];
  for (const controversy of data.controversies ?? []) {
    const topic =
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      // controversy.topic?.[lang]
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      localize(controversy.topic, lang);
    if (topic) {
      questions.push(t("docent.controversyQuestion", { topic }));
    }
  }
  for (const scheme of data.schemes ?? []) {
    const label =
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      // scheme.name?.[lang]
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      localize(scheme.name, lang) ??
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      // scheme.title?.[lang]
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      localize(scheme.title, lang) ??
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      // scheme.scholar?.[lang]
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      localize(scheme.scholar, lang) ??
      scheme.id;
    if (label) {
      questions.push(t("docent.schemeQuestion", { scheme: label }));
    }
  }
  const machineName =
    // Explanation: Resolve the original bilingual text through the active translation session.
    // Reason: Display validated target text or retain the original versions when validation is uncertain.
    // module.data.names[lang]
    // Explanation: Resolve the original bilingual text through the active translation session.
    // Reason: Display validated target text or retain the original versions when validation is uncertain.
    localize(module.data.names, lang);
  const fallbacks = [
    t("docent.fallbackControversies", { machine: machineName }),
    t("docent.fallbackSchemes", { machine: machineName }),
    t("docent.fallbackSources"),
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
      question.includes(
        // Explanation: Resolve the original bilingual text through the active translation session.
        // Reason: Display validated target text or retain the original versions when validation is uncertain.
        // controversy.topic[lang]
        // Explanation: Resolve the original bilingual text through the active translation session.
        // Reason: Display validated target text or retain the original versions when validation is uncertain.
        localize(controversy.topic, lang),
      ) ||
      question.includes(controversy.topic.zh) ||
      question.includes(controversy.topic.en),
  );
  if (hit) {
    const cite = hit.sourceIds[0] ?? data.sources[0].id;
    return `${
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      // hit.detail[lang]
      // Explanation: Resolve the original bilingual text through the active translation session.
      // Reason: Display validated target text or retain the original versions when validation is uncertain.
      localize(hit.detail, lang)
    } [来源:${cite}]`;
  }
  const principle =
    // Explanation: Resolve the original bilingual text through the active translation session.
    // Reason: Display validated target text or retain the original versions when validation is uncertain.
    // data.principle[lang]
    // Explanation: Resolve the original bilingual text through the active translation session.
    // Reason: Display validated target text or retain the original versions when validation is uncertain.
    localize(data.principle, lang);
  const cite = data.sources[0].id;
  const t = i18n.getFixedT(lang);
  return t("docent.mockDepth", { cite, principle });
}

export type DocentSegment =
  { kind: "text"; text: string } | { kind: "cite"; id: string; book: string };

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
            data-testid="docent-citation"
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
  const { t } = useTranslation();
  const lang = pageLang();
  // Explanation: Read the explicitly active temporary target for this answer.
  // Reason: Generation must use only the language requested through the Translate button.
  const targetLanguage = getTranslationState().target;
  const labels = {
    checking: t("docent.checking"),
    close: t("docent.close"),
    entry: t("docent.title"),
    placeholder: t("docent.placeholder"),
    retry: t("docent.retry"),
    send: t("docent.send"),
    streaming: t("docent.thinking"),
    title: t("docent.title"),
    unavailable: t("docent.unavailable"),
  };
  const suggestions = useMemo(
    () => suggestedQuestions(module, lang, t),
    [lang, module, t],
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
    // Explanation: Cancel pending answers and clear translated conversation on language changes.
    // Reason: Source-language buttons and empty translation requests must clear every translated answer.
    //   }, [module.spec.slug, partId, schemeId]);
    // Explanation: Cancel pending answers and clear translated conversation on language changes.
    // Reason: Source-language buttons and empty translation requests must clear every translated answer.
  }, [module.spec.slug, partId, schemeId, targetLanguage, lang]);

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
    // Explanation: Keep the original mock for source-language development only.
    // Reason: Temporary target answers must use real post-generation validation.
    //     if (DEV_MOCK) {
    // Explanation: Keep the original mock for source-language development only.
    // Reason: Temporary target answers must use real post-generation validation.
    if (DEV_MOCK && !targetLanguage) {
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
          // Explanation: Include the temporary target only during an explicitly requested session.
          // Reason: The backend must never infer or translate another language.
          ...(targetLanguage ? { targetLanguage } : {}),
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
      // Explanation: Ignore answer text from an aborted or superseded temporary-language request.
      // Reason: Chinese, English and empty-target resets must override even a late streaming callback.
      if (
        controller.signal.aborted ||
        getTranslationState().target !== targetLanguage
      )
        return;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: message.content + delta }
            : message,
        ),
      );
    };

    try {
      // Explanation: Keep the original mock for source-language development only.
      // Reason: Temporary target answers must use real post-generation validation.
      //     if (DEV_MOCK) {
      // Explanation: Keep the original mock for source-language development only.
      // Reason: Temporary target answers must use real post-generation validation.
      if (DEV_MOCK && !targetLanguage) {
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
            // Explanation: Forward the active temporary target with the answer request.
            // Reason: Completed target-language paragraphs must pass backend validation before display.
            ...(targetLanguage ? { targetLanguage } : {}),
            // Explanation: Disable the duplicate temporary-target field.
            // Reason: The request already contains this field immediately above.
            //           ...(targetLanguage ? { targetLanguage } : {}),
            messages: conversation,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("docent_request_failed");
        // Explanation: Preserve the previous implementation for review.
        // Reason: Notify only after the selected-language answer is displayed and ignore stale or cancelled requests.
        // await consumeDocentSse(response, appendDelta);
        // Explanation: Apply translation correction and source-only fallback.
        // Reason: Notify only after the selected-language answer is displayed and ignore stale or cancelled requests.
        await consumeDocentSse(response, appendDelta);
        // Explanation: Apply translation correction and source-only fallback.
        // Reason: Notify only after the selected-language answer is displayed and ignore stale or cancelled requests.
        if (
          response.headers.get("X-Translation-Unavailable") === "1" &&
          !controller.signal.aborted &&
          getTranslationState().target === targetLanguage
        )
          notifyTranslationUnavailable();
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
