// Explanation: Import the temporary translation dependency.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
import { isTargetLanguage, uncertaintyText, type SourcePair, type TranslationItem, type TranslationResult } from "./translation";
// Explanation: Define session state for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
export interface SessionState { selected: string; target: string; revision: number; pending: number; message: string }
// Explanation: Define state for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
let state: SessionState = { selected: "", target: "", revision: 0, pending: 0, message: "" };
// Explanation: Define listeners for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
const listeners = new Set<() => void>();
// Explanation: Define sources for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
const sources = new Map<string, TranslationItem>();
// Explanation: Associate source pairs with short identifiers inside the current session.
// Reason: Repeating full paragraphs as request identifiers wastes provider input and response capacity.
const sourceIds = new Map<string, string>();
// Explanation: Define results for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
const results = new Map<string, TranslationResult>();
// Explanation: Associate rendered strings with their original bilingual wording in memory.
// Reason: Interpolated fallback paragraphs and stored captions need the exact source-language names.
const displaySources = new Map<string, SourcePair>();
// Explanation: Define queue for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
const queue = new Set<string>();
// Explanation: Define controller for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
let controller: AbortController | undefined;
// Explanation: Define generation for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
let generation = 0;
// Explanation: Define pumping for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
let pumping = false;
// Explanation: Define scheduled for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
let scheduled = false;
// Explanation: Define message timer for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
let messageTimer: ReturnType<typeof setTimeout> | undefined;
// Explanation: Define get translation state for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
export const getTranslationState = () => state;
// Explanation: Define subscribe translation for the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
export function subscribeTranslation(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
// Explanation: Define publish for the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
function publish(patch: Partial<SessionState> = {}): void { state = { ...state, ...patch, revision: state.revision + 1 }; listeners.forEach(listener => listener()); }
// Explanation: Define select translation language for the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
export function selectTranslationLanguage(selected: string): void { if (selected === "" || isTargetLanguage(selected)) publish({ selected }); }
// Explanation: Define clear translation for the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
export function clearTranslation(): void {
// Explanation: Apply the current generation operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  generation += 1;
// Explanation: Apply the current controller operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  controller?.abort();
// Explanation: Apply the current controller operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  controller = undefined;
// Explanation: Cancel the previous translation-related timer.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  clearTimeout(messageTimer);
// Explanation: Clear the memory-only translation data for this scope.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  results.clear();
// Explanation: Discard remembered rendered strings when a translation session ends.
// Reason: Temporary target text must not survive the source-language override.
  displaySources.clear();
// Explanation: Clear the memory-only translation data for this scope.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  queue.clear();
// Explanation: Clear the memory-only translation data for this scope.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  sources.clear();
// Explanation: Discard the source-to-identifier mapping during a reset.
// Reason: No translation session data may survive cancellation.
  sourceIds.clear();
// Explanation: Apply the current pumping operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  pumping = false;
// Explanation: Notify the interface about the current translation-session state.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  publish({ selected: "", target: "", pending: 0, message: "" });
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
}
// Explanation: Define request translation for the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
export function requestTranslation(): void {
// Explanation: Define selected for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  const selected = state.selected;
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  if (!selected) { clearTranslation(); return; }
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  if (selected === state.target) {
// Explanation: Cancel the previous translation-related timer.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    clearTimeout(messageTimer);
// Explanation: Notify the interface about the current translation-session state.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    publish({ message: state.pending > 0 ? "Translating…" : "Already translated" });
// Explanation: Notify the interface about the current translation-session state.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    messageTimer = setTimeout(() => publish({ message: "" }), 2500);
// Explanation: Apply the current return operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    return;
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  }
// Explanation: Apply the current clearTranslation operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  clearTranslation();
// Explanation: Apply the current controller operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  controller = new AbortController();
// Explanation: Notify the interface about the current translation-session state.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
// Explanation: Start the explicitly requested target session and settle pages with no translatable pairs.
// Reason: The English-only cover must not stay in a loading state after its uncertainty labels are displayed.
//   publish({ selected, target: selected, message: "Translating…" });
// Explanation: Start the explicitly requested target session and settle pages with no translatable pairs.
// Reason: The English-only cover must not stay in a loading state after its uncertainty labels are displayed.
  publish({ selected, target: selected, message: "Translating…" });
// Explanation: Implement the temporary translation operation below.
// Reason: Finish the status message when a page contains only single-source uncertainty fallbacks and needs no provider request.
const ownGeneration = generation;
// Explanation: Implement the temporary translation operation below.
// Reason: Finish the status message when a page contains only single-source uncertainty fallbacks and needs no provider request.
  setTimeout(() => {
// Explanation: Implement the temporary translation operation below.
// Reason: Finish the status message when a page contains only single-source uncertainty fallbacks and needs no provider request.
    if (ownGeneration === generation && !pumping && queue.size === 0 && state.pending === 0 && state.message === "Translating…") publish({ message: "" });
// Explanation: Implement the temporary translation operation below.
// Reason: Finish the status message when a page contains only single-source uncertainty fallbacks and needs no provider request.
  }, 0);

// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
}
// Explanation: Define schedule for the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
function schedule(): void {
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  if (scheduled) return;
// Explanation: Apply the current scheduled operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  scheduled = true;
// Explanation: Apply the current queueMicrotask operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  queueMicrotask(() => { scheduled = false; void pump(); });
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
}
// Explanation: Define pump for the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
async function pump(): Promise<void> {
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  if (pumping || !state.target || !controller || queue.size === 0) return;
// Explanation: Apply the current pumping operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  pumping = true;
// Explanation: Define own generation for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  const ownGeneration = generation;
// Explanation: Define signal for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  const signal = controller.signal;
// Explanation: Define language for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  const language = state.target;
// Explanation: Handle translation-provider failures without accepting unchecked text.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  try {
// Explanation: Apply the current while operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    while (queue.size > 0 && ownGeneration === generation && !signal.aborted) {
// Explanation: Define ids for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      const ids = [...queue].slice(0, 16);
// Explanation: Apply the current ids operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      ids.forEach(id => queue.delete(id));
// Explanation: Notify the interface about the current translation-session state.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      publish({ pending: ids.length + queue.size, message: "Translating and cross-validating…" });
// Explanation: Define batch for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      let batch: TranslationResult[];
// Explanation: Handle translation-provider failures without accepting unchecked text.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      try {
// Explanation: Define response for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        const response = await fetch(import.meta.env.VITE_TRANSLATION_API_URL || "/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ language, items: ids.map(id => sources.get(id)) }), signal: AbortSignal.any([signal, AbortSignal.timeout(55_000)]) });
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        if (!response.ok) throw new Error("translation_service_unavailable");
// Explanation: Define payload for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        const payload: unknown = await response.json();
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        if (!payload || typeof payload !== "object" || !Array.isArray((payload as { results?: unknown }).results)) throw new Error("translation_result_invalid");
// Explanation: Apply the current batch operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        batch = (payload as { results: TranslationResult[] }).results;
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      } catch {
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        if (signal.aborted || ownGeneration !== generation) return;
// Explanation: Apply the current batch operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        batch = ids.map(id => ({ id, status: "uncertain", reason: "service_unavailable" }));
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      }
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      if (ownGeneration !== generation || signal.aborted) return;
// Explanation: Process the relevant translation items without creating persistent artifacts.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      for (const id of ids) {
// Explanation: Define result for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        const result = batch.find(item => item?.id === id);
// Explanation: Record the current translation mapping in memory.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        results.set(id, result?.status === "accepted" && typeof result.text === "string" && result.text.trim() ? result : { id, status: "uncertain", reason: result?.reason || "cross_validation_inconclusive" });
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      }
// Explanation: Notify the interface about the current translation-session state.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      publish({ pending: queue.size });
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      if (batch.some(item => item?.reason === "service_unavailable")) {
// Explanation: Process the relevant translation items without creating persistent artifacts.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        for (const id of queue) results.set(id, { id, status: "uncertain", reason: "service_unavailable" });
// Explanation: Clear the memory-only translation data for this scope.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        queue.clear();
// Explanation: Notify the interface about the current translation-session state.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        publish({ pending: 0, message: "Translation unavailable; original text retained." });
// Explanation: Apply the current return operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
        return;
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
      }
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    }
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    if (ownGeneration === generation) publish({ pending: 0, message: "" });
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  } finally { if (ownGeneration === generation) pumping = false; }
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
}
// Explanation: Apply the current  operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
// Explanation: Return text for a complete source object and allow absent optional objects.
// Reason: Existing exhibit fields have both required and optional bilingual values.
export function localize(pair: SourcePair, language?: "en" | "zh"): string;
// Explanation: Preserve undefined for optional source values.
// Reason: Existing fallback expressions must continue to work.
export function localize(pair: SourcePair | undefined, language?: "en" | "zh"): string | undefined;
// Explanation: Resolve a bilingual source through the active session.
// Reason: Generated text must stay separate from immutable source data.
export function localize(pair: SourcePair | undefined, language: "en" | "zh" = "en"): string | undefined {
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  if (!pair) return undefined;
// Explanation: Define original for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  const original = pair[language] ?? pair.en ?? pair.zh ?? "";
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  if (!state.target || !original.trim()) return original;
// Explanation: Associate original labels with both source readings before interpolation.
// Reason: Bilingual fallback values must use original part names instead of translated names.
  rememberDisplaySource(original, pair);
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  if (!pair.en?.trim() || !pair.zh?.trim()) return uncertaintyText(pair);
// Explanation: Apply the current  operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
// Explanation: Separate source deduplication from provider-facing identifiers.
// Reason: Full source text is already sent once as the translation input.
//   const id = JSON.stringify([pair.en, pair.zh, pair.context || ""]);
// Explanation: Separate source deduplication from provider-facing identifiers.
// Reason: Full source text is already sent once as the translation input.
  const key = JSON.stringify([pair.en, pair.zh, pair.context || ""]);
// Explanation: Use a short session-local identifier for each distinct source pair.
// Reason: Provider output must contain only concise identifiers and the selected-language text.
  const id = sourceIds.get(key) || "item-" + sourceIds.size;
// Explanation: Remember this source identifier in memory only.
// Reason: Repeated renders should reuse validated text without new requests.
  sourceIds.set(key, id);
// Explanation: Define existing for this operation.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  const existing = results.get(id);
// Explanation: Apply the current  operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
// Explanation: Remember the source wording for resolved display text.
// Reason: Interpolation and event captions must preserve original readings across validation updates.
//   if (existing) return existing.status === "accepted" ? existing.text : uncertaintyText(pair);
// Explanation: Remember the source wording for resolved display text.
// Reason: Interpolation and event captions must preserve original readings across validation updates.
  if (existing) {
// Explanation: Resolve the accepted result or bilingual fallback for this source pair.
// Reason: Uncertain generated wording must never be displayed as accepted text.
    const display = existing.status === "accepted" ? existing.text! : uncertaintyText(pair);
// Explanation: Retain the original pair for this rendered value inside the session.
// Reason: Nested parameters and captions must remain reversible.
    rememberDisplaySource(display, pair);
// Explanation: Return the validated text or exact source fallback.
// Reason: The display layer must not trigger a second translation of its own output.
    return display;
// Explanation: Complete handling of a previously resolved source item.
// Reason: Repeated renders reuse the same in-memory result.
  }
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  if (!sources.has(id)) {
// Explanation: Record the current translation mapping in memory.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    sources.set(id, { id, ...pair });
// Explanation: Apply the current queue operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    queue.add(id);
// Explanation: Apply the current schedule operation in the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
    schedule();
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  }
// Explanation: Return the computed translation value or validation outcome.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
  return original;
// Explanation: Complete the current translation scope or callback.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
}
// Explanation: Define localize single for the translation pipeline.
// Reason: Run only the explicitly requested language in memory and discard stale work when Chinese, English or an empty target is applied.
export function localizeSingle(text: string | undefined, language: "en" | "zh" = "en"): string { return text ? localize({ [language]: text }, language) || "" : ""; }

// Explanation: Define remember display source for the translation pipeline.
// Reason: Keep interpolated originals exact and refresh already-displayed captions without storing translations outside memory.
export function rememberDisplaySource(display: string, pair: SourcePair): void { displaySources.set(display, pair); }
// Explanation: Define original display value for the translation pipeline.
// Reason: Keep interpolated originals exact and refresh already-displayed captions without storing translations outside memory.
export function originalDisplayValue(value: unknown, language: "en" | "zh"): unknown { return typeof value === "string" ? displaySources.get(value)?.[language] ?? value : value; }
// Explanation: Define localize rendered for the translation pipeline.
// Reason: Keep interpolated originals exact and refresh already-displayed captions without storing translations outside memory.
export function localizeRendered(text: string): string {
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Keep interpolated originals exact and refresh already-displayed captions without storing translations outside memory.
  if (!state.target || !text) return text;
// Explanation: Define pair for this operation.
// Reason: Keep interpolated originals exact and refresh already-displayed captions without storing translations outside memory.
  const pair = displaySources.get(text);
// Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
// Reason: Keep interpolated originals exact and refresh already-displayed captions without storing translations outside memory.
  if (pair) return localize(pair, "en");
// Explanation: Return the computed translation value or validation outcome.
// Reason: Keep interpolated originals exact and refresh already-displayed captions without storing translations outside memory.
  return text.split(" · ").map(part => { const source = displaySources.get(part); return source ? localize(source, "en") : part; }).join(" · ");
// Explanation: Complete the current translation scope or callback.
// Reason: Keep interpolated originals exact and refresh already-displayed captions without storing translations outside memory.
}
