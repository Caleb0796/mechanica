// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
import { afterEach, expect, test, vi } from "vitest";
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
// Explanation: Preserve the narrower test import for review.
// Reason: Corrected docent answers need a focused recovery assertion.
// import { translateAndValidate, type JsonModel } from "../../src/localization/translation";
// Explanation: Import the shared docent correction pipeline.
// Reason: Verify fresh checks run on the corrected answer.
import { translateAndValidate, correctValidatedAnswer, type JsonModel } from "../../src/localization/translation";
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
import { clearTranslation, getTranslationState, localize, requestTranslation, selectTranslationLanguage } from "../../src/localization/session";
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
const pair = { id: "meaning", en: "Turn the wheel 10 m", zh: "让车轮转动10 m" };
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
const verdict = (faithful = true, sourcesAgree = true) => ({ items: [{ id: pair.id, faithful, sourcesAgree, targetLanguage: true, reason: faithful ? "ok" : sourcesAgree ? "translation_fixable" : "source_conflict" }] });
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
afterEach(() => { clearTranslation(); vi.unstubAllGlobals(); });
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
function simulation(mode: "accept" | "repair" | "reject-repair" | "conflict" | "bad-number" | "repair-fails" | "bad-correction") {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const calls: Array<{ instructions: string; input: { targetLanguage: string; items: Array<Record<string, unknown>> } }> = [];
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const model: JsonModel = async (instructions, value) => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    const input = value as { targetLanguage: string; items: Array<Record<string, unknown>> };
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    calls.push({ instructions, input });
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    if (instructions.startsWith("Translate")) return { items: [{ id: pair.id, text: mode === "bad-number" ? "Tourner la roue 11 m" : "Tourner la roue 10 m" }] };
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    if (instructions.startsWith("Correct")) {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
      if (mode === "repair-fails") throw new Error("provider_unavailable");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
      return { items: [{ id: pair.id, text: mode === "bad-correction" ? "Faire tourner la roue 11 m" : "Faire tourner la roue 10 m" }] };
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    }
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    if (mode === "conflict") return verdict(false, false);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    if (mode === "accept") return verdict();
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    if (calls.length <= 3 || mode === "reject-repair") return verdict(false);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    return verdict();
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  };
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  return { calls, model };
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
}
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
test("meaning validation accepts harmless wording differences without another generation", async () => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const { model, calls } = simulation("accept");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect((await translateAndValidate([pair], "fr", model, new AbortController().signal))[0].status).toBe("accepted");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls).toHaveLength(3);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls.slice(1).every(call => call.instructions.includes("Minor differences") && call.instructions.includes("factual claims are compatible"))).toBe(true);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
});
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
test("fixable wording gets one target-only correction followed by both fresh reviews", async () => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const { model, calls } = simulation("repair");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const original = JSON.stringify(pair);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const result = await translateAndValidate([pair], "fr", model, new AbortController().signal);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(result[0]).toEqual({ id: pair.id, status: "accepted", text: "Faire tourner la roue 10 m" });
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls).toHaveLength(6);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls[3].instructions.startsWith("Correct")).toBe(true);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls.slice(4).every(call => call.input.items[0].candidate === "Faire tourner la roue 10 m")).toBe(true);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls.every(call => call.input.targetLanguage === "fr")).toBe(true);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(JSON.stringify(pair)).toBe(original);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
});
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
test("a rejected correction stays uncertain and cannot loop into repeated generation", async () => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const { model, calls } = simulation("reject-repair");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const result = await translateAndValidate([pair], "fr", model, new AbortController().signal);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(result[0].status).toBe("uncertain");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(result[0].text).toBeUndefined();
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls).toHaveLength(6);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
});
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
test("genuine source conflicts are never corrected into invented agreement", async () => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const { model, calls } = simulation("conflict");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect((await translateAndValidate([pair], "fr", model, new AbortController().signal))[0].status).toBe("uncertain");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  // Explanation: Preserve the old repair eligibility expectation.
// Reason: Even rejected candidates now receive one correction before fresh validation.
// expect(calls).toHaveLength(3);
// Explanation: Check the revised translation recovery behavior.
// Reason: A correction attempt cannot skip fresh validation.
expect(calls).toHaveLength(6);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
});
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
// Explanation: Preserve the previous expectation for review.
// Reason: Match source-only fallback and bounded API correction requirements.
// test("changed protected numbers never become eligible for wording correction",
// Explanation: Check the revised translation recovery behavior.
// Reason: Match source-only fallback and bounded API correction requirements.
test("damaged protected numbers receive correction and are accepted only after fresh checks", async () => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const { model, calls } = simulation("bad-number");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  // Explanation: Preserve the former immediate rejection expectation.
// Reason: A corrected number can be accepted only after protected checks and both reviewers pass.
// expect((await translateAndValidate([pair], "fr", model, new AbortController().signal))[0].status).toBe("uncertain");
// Explanation: Check the revised translation recovery behavior.
// Reason: Validate repaired protected content before displaying it.
expect((await translateAndValidate([pair], "fr", model, new AbortController().signal))[0].status).toBe("accepted");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  // Explanation: Preserve the old repair eligibility expectation.
// Reason: Even rejected candidates now receive one correction before fresh validation.
// expect(calls).toHaveLength(3);
// Explanation: Check the revised translation recovery behavior.
// Reason: A correction attempt cannot skip fresh validation.
expect(calls).toHaveLength(6);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
});
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
test("failed correction keeps fallback instead of exposing an unchecked candidate", async () => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const { model, calls } = simulation("repair-fails");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect((await translateAndValidate([pair], "fr", model, new AbortController().signal))[0].status).toBe("uncertain");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls).toHaveLength(4);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
});
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
test("even approved correction reviews cannot override protected numeric content", async () => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const { model, calls } = simulation("bad-correction");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect((await translateAndValidate([pair], "fr", model, new AbortController().signal))[0].status).toBe("uncertain");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(calls).toHaveLength(6);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
});
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
test("billing failure shows the actual remedy and stops queued provider requests", async () => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  clearTranslation();
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  const fetchMock = vi.fn(async (_url: unknown, init: RequestInit) => {
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    const body = JSON.parse(String(init.body));
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
    return new Response(JSON.stringify({ results: body.items.map((item: { id: string }) => ({ id: item.id, status: "uncertain", reason: "provider_billing_required" })) }));
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  });
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  vi.stubGlobal("fetch", fetchMock);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  selectTranslationLanguage("fr");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  requestTranslation();
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  for (let index = 0; index < 20; index++) localize({ en: "Wheel " + index, zh: "轮 " + index });
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  await expect.poll(() => getTranslationState().message).toContain("API credit");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(getTranslationState().pending).toBe(0);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  expect(fetchMock).toHaveBeenCalledTimes(1);
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
  // Explanation: Preserve the previous expectation for review.
// Reason: Match source-only fallback and bounded API correction requirements.
// expect(localize({ en: "Wheel 19", zh: "轮 19" })).toContain("English: Wheel 19");
// Explanation: Check the revised translation recovery behavior.
// Reason: Match source-only fallback and bounded API correction requirements.
expect(localize({ en: "Wheel 19", zh: "轮 19" })).toBe("Wheel 19");
// Explanation: Exercise the named meaning-recovery path or assert its protected outcome.
// Reason: Allow harmless source differences while requiring reviewed corrections and actionable provider failures.
});


// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
test("uncertain text keeps each selected source and its popup expires", async () => {
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  vi.useFakeTimers();
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  try {
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init: RequestInit) => { const body = JSON.parse(String(init.body)); return new Response(JSON.stringify({ results: body.items.map((item: { id: string }) => ({ id: item.id, status: "uncertain" })) })); }));
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    selectTranslationLanguage("fr"); requestTranslation();
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    localize(pair, "zh");
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    await vi.advanceTimersByTimeAsync(20);
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    expect(localize(pair, "zh")).toBe(pair.zh);
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    expect(localize(pair, "en")).toBe(pair.en);
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    expect(getTranslationState().message).toContain("unavailable");
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    await vi.advanceTimersByTimeAsync(4600);
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    expect(getTranslationState().message).toBe("");
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  } finally { vi.useRealTimers(); }
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
});
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
test("suspected source disagreement gets reviewer feedback and can recover", async () => {
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  let count = 0;
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  const model: JsonModel = async (instructions, input) => {
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    count++;
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    if (instructions.startsWith("Translate")) return { items: [{ id: pair.id, text: "Tourner la roue 10 m" }] };
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    if (instructions.startsWith("Correct")) { expect(JSON.stringify(input)).toContain("source_conflict"); return { items: [{ id: pair.id, text: "Faire tourner la roue 10 m" }] }; }
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    return verdict(count > 3, count > 3);
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  };
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  expect((await translateAndValidate([pair], "fr", model, new AbortController().signal))[0].status).toBe("accepted");
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  expect(count).toBe(6);
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
});
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
test("reset cancels a pending fallback notice and retains source priority", async () => {
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  vi.useFakeTimers();
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  try {
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    selectTranslationLanguage("fr"); requestTranslation();
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    expect(localize({ zh: "原文" }, "zh")).toBe("原文");
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    clearTranslation();
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    await vi.advanceTimersByTimeAsync(5000);
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    expect(getTranslationState().message).toBe("");
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
    expect(getTranslationState().target).toBe("");
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
  } finally { vi.useRealTimers(); }
// Explanation: Check the revised translation recovery behavior.
// Reason: Exercise selected EN/Chinese fallback, disappearing notices, stale cancellation, and correction after reviewer disagreement.
});

// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
test("docent correction is returned only after both fresh evidence reviews", async () => {
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
  let count = 0;
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
  const model: JsonModel = async (instructions, input) => {
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
    count++;
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
    if (instructions.startsWith("Correct")) return { items: [{ id: "answer", text: "Faire tourner la roue 10 m [来源:wheel]" }] };
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
    const candidate = (input as { items: Array<{ candidate: string }> }).items[0].candidate;
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
    return { items: [{ id: "answer", faithful: candidate.startsWith("Faire"), sourcesAgree: true, targetLanguage: true, reason: "wording" }] };
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
  };
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
  expect(await correctValidatedAnswer(pair, "Tourner la roue 10 m [来源:wheel]", "fr", model, new AbortController().signal)).toBe("Faire tourner la roue 10 m [来源:wheel]");
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
  expect(count).toBe(5);
// Explanation: Verify reviewed docent wording correction.
// Reason: A corrected answer requires fresh checks against both source languages.
});
