// Explanation: Import the temporary translation dependency.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
import { test } from "node:test";
// Explanation: Import the temporary translation dependency.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
import assert from "node:assert/strict";
// Explanation: Import the temporary translation dependency.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
import { readFile } from "node:fs/promises";
// Explanation: Import the temporary translation dependency.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
import { stripTypeScriptTypes } from "node:module";
// Explanation: Import the temporary translation dependency.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
import { pathToFileURL } from "node:url";
// Explanation: Import the temporary translation dependency.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
import { createHash } from "node:crypto";
// Explanation: Import the temporary translation dependency.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
import {
  translateAndValidate,
  protectedContentMatches,
  uncertaintyText,
} from "../src/localization/translation.ts";
// Explanation: Define pair for this operation.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
const pair = {
  en: "Drive {{part}} forward 10 m [来源:source-1]",
  zh: "正向驱动 {{part}} 10 m [来源:source-1]",
};
// Explanation: Define calls for this operation.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
const calls = [];
// Explanation: Define model for this operation.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
const model = async (instructions, input) => {
  // Explanation: Apply the current calls operation in the translation pipeline.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  calls.push({ instructions, input });
  // Explanation: Return the computed translation value or validation outcome.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  return instructions.startsWith("Translate")
    ? {
        items: input.items.map((item) => ({
          id: item.id,
          text: "Avancer {{part}} de 10 m [来源:source-1]",
        })),
      }
    : {
        items: input.items.map((item) => ({
          id: item.id,
          faithful: true,
          sourcesAgree: true,
          targetLanguage: true,
          reason: "ok",
        })),
      };
  // Explanation: Complete the current translation scope or callback.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
};
// Explanation: Check the specified temporary-translation behavior.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
test("one requested target is generated before independent English and Chinese reviews", async () => {
  // Explanation: Apply the current calls operation in the translation pipeline.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  calls.length = 0;
  // Explanation: Define results for this operation.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  const results = await translateAndValidate(
    [{ id: "part", ...pair }],
    "fr",
    model,
    new AbortController().signal,
  );
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.equal(results[0].status, "accepted");
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.equal(calls.length, 3);
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.ok(calls[0].instructions.startsWith("Translate"));
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.ok(calls.slice(1).every((call) => call.input.items[0].candidate));
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.ok(calls.every((call) => call.input.targetLanguage === "fr"));
  // Explanation: Complete the current translation scope or callback.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
});
// Explanation: Check the specified temporary-translation behavior.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
test("uncertain or conflicting cross-validation retains both originals", async () => {
  // Explanation: Define fail for this operation.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  const fail = async (instructions, input) => {
    // Explanation: Define result for this operation.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    const result = await model(instructions, input);
    // Explanation: Guard this operation against an invalid, stale or unresolved translation condition.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    if (instructions.includes("Chinese fidelity"))
      result.items[0].sourcesAgree = false;
    // Explanation: Return the computed translation value or validation outcome.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    return result;
    // Explanation: Complete the current translation scope or callback.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  };
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.equal(
    (
      await translateAndValidate(
        [{ id: "part", ...pair }],
        "fr",
        fail,
        new AbortController().signal,
      )
    )[0].status,
    "uncertain",
  );
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.ok(
    uncertaintyText(pair).includes(
      "Unknown about the correct translation, keeping the English and the Chinese version",
    ),
  );
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.ok(uncertaintyText(pair).includes(pair.en));
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.ok(uncertaintyText(pair).includes(pair.zh));
  // Explanation: Complete the current translation scope or callback.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
});
// Explanation: Check the specified temporary-translation behavior.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
test("changed numbers, placeholders and citations cannot pass", () => {
  // Explanation: Process the relevant translation items without creating persistent artifacts.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  for (const candidate of [
    "Avancer {{wrong}} de 10 m [来源:source-1]",
    "Avancer {{part}} de 11 m [来源:source-1]",
    "Avancer {{part}} de 10 m [来源:invented]",
  ])
    assert.equal(protectedContentMatches(pair, candidate), false);
  // Explanation: Complete the current translation scope or callback.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
});
// Explanation: Check the specified temporary-translation behavior.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
test("missing originals and unsupported targets never generate another language", async () => {
  // Explanation: Apply the current calls operation in the translation pipeline.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  calls.length = 0;
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.equal(
    (
      await translateAndValidate(
        [{ id: "one", en: "Only English" }],
        "fr",
        model,
        new AbortController().signal,
      )
    )[0].status,
    "uncertain",
  );
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.equal(calls.length, 0);
  // Explanation: Wait for this translation or validation operation to complete.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  await assert.rejects(() =>
    translateAndValidate(
      [{ id: "part", ...pair }],
      "en",
      model,
      new AbortController().signal,
    ),
  );
  // Explanation: Wait for this translation or validation operation to complete.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  await assert.rejects(() =>
    translateAndValidate(
      [{ id: "part", ...pair }],
      "zh",
      model,
      new AbortController().signal,
    ),
  );
  // Explanation: Complete the current translation scope or callback.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
});
// Explanation: Define session source for this operation.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
const sessionSource = await readFile(
  new URL("../src/localization/session.ts", import.meta.url),
  "utf8",
);
// Explanation: Define translation url for this operation.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
const translationURL = pathToFileURL(
  new URL(
    "../src/localization/translation.ts",
    import.meta.url,
  ).pathname.replace(/^\/(?=[A-Za-z]:)/, ""),
).href;
// Explanation: Define session js for this operation.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
const sessionJS = stripTypeScriptTypes(sessionSource, { mode: "transform" })
  .replace('"./translation"', JSON.stringify(translationURL))
  .replace("import.meta.env.VITE_TRANSLATION_API_URL", '""');
// Explanation: Define session for this operation.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
const session = await import(
  "data:text/javascript;base64," + Buffer.from(sessionJS).toString("base64")
);
// Explanation: Define settle for this operation.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
// Explanation: Check the specified temporary-translation behavior.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
test("selector stays empty initially and selection alone makes no request", async () => {
  // Explanation: Define original fetch for this operation.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  const originalFetch = globalThis.fetch;
  // Explanation: Define requests for this operation.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  let requests = 0;
  // Explanation: Apply the current globalThis operation in the translation pipeline.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  globalThis.fetch = async () => {
    requests += 1;
    throw new Error("unexpected_request");
  };
  // Explanation: Handle translation-provider failures without accepting unchecked text.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  try {
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.getTranslationState().selected, "");
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.localize(pair, "en");
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.selectTranslationLanguage("fr");
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.localize(pair, "en");
    // Explanation: Wait for this translation or validation operation to complete.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    await settle();
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(requests, 0);
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.getTranslationState().target, "");
    // Explanation: Complete the current translation scope or callback.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  } finally {
    session.clearTranslation();
    globalThis.fetch = originalFetch;
  }
  // Explanation: Complete the current translation scope or callback.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
});
// Explanation: Check the specified temporary-translation behavior.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
test("explicit translation, duplicate feedback, empty reset and stale-result cancellation", async () => {
  // Explanation: Define original fetch for this operation.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  const originalFetch = globalThis.fetch;
  // Explanation: Define requests for this operation.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  const requests = [];
  // Explanation: Apply the current globalThis operation in the translation pipeline.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  globalThis.fetch = (url, options) =>
    new Promise((resolve) => requests.push({ options, resolve }));
  // Explanation: Handle translation-provider failures without accepting unchecked text.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  try {
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.selectTranslationLanguage("fr");
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.requestTranslation();
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.localize(pair, "en");
    // Explanation: Wait for this translation or validation operation to complete.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    await settle();
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(requests.length, 1);
    // Explanation: Define request for this operation.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    const request = JSON.parse(requests[0].options.body);
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(request.language, "fr");
    // Explanation: Apply the current requests0 operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    requests[0].resolve({
      ok: true,
      json: async () => ({
        results: request.items.map((item) => ({
          id: item.id,
          status: "accepted",
          text: "Texte validé",
        })),
      }),
    });
    // Explanation: Wait for this translation or validation operation to complete.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    await settle();
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.localize(pair, "en"), "Texte validé");
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.requestTranslation();
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.getTranslationState().message, "Already translated");
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(requests.length, 1);
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.selectTranslationLanguage("");
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.localize(pair, "en"), "Texte validé");
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.requestTranslation();
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.getTranslationState().target, "");
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.localize(pair, "en"), pair.en);
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.selectTranslationLanguage("de");
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.requestTranslation();
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.localize(pair, "en");
    // Explanation: Wait for this translation or validation operation to complete.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    await settle();
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(JSON.parse(requests[1].options.body).language, "de");
    // Explanation: Apply the current session operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    session.clearTranslation();
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(requests[1].options.signal.aborted, true);
    // Explanation: Apply the current requests1 operation in the translation pipeline.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    requests[1].resolve({
      ok: true,
      json: async () => ({
        results: [
          {
            id: JSON.stringify([pair.en, pair.zh, ""]),
            status: "accepted",
            text: "Stale text",
          },
        ],
      }),
    });
    // Explanation: Wait for this translation or validation operation to complete.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    await settle();
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.getTranslationState().selected, "");
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    assert.equal(session.localize(pair, "en"), pair.en);
    // Explanation: Complete the current translation scope or callback.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  } finally {
    session.clearTranslation();
    globalThis.fetch = originalFetch;
  }
  // Explanation: Complete the current translation scope or callback.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
});
// Explanation: Check the specified temporary-translation behavior.
// Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
// Explanation: Preserve the original byte-oriented test name.
// Reason: Windows Git checkouts may change line endings without changing catalog content.
// test("both immutable catalogs retain their original bytes", async () => {
// Explanation: Check catalog content against the original baseline with portable line endings.
// Reason: Protected catalogs must remain unchanged while valid Windows checkouts must pass.
test("both immutable catalogs retain their original content across Git line endings", async () => {
  // Explanation: Process the relevant translation items without creating persistent artifacts.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  for (const [language, expected] of Object.entries({
    en: "0b9c2c5cde78dbf14864b8601085af2d13c12ce24cff2464e106a949a6ccd4ac",
    zh: "657e00fa8aedd3782365a3a3cd5b9913607141dfdc34fa612ba683c49edf06da",
  })) {
    // Explanation: Define bytes for this operation.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    const bytes = await readFile(
      new URL("../src/ui/i18n/" + language + ".json", import.meta.url),
    );
    // Explanation: Assert the expected translation state or invariant.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
    // Explanation: Preserve the original raw-byte hash assertion.
    // Reason: Git converts LF to CRLF on this Windows checkout.
    //     assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
    // Explanation: Normalize only CRLF before comparing the original catalog hash.
    // Reason: Every other catalog character remains protected by the exact baseline hash.
    assert.equal(
      createHash("sha256")
        .update(bytes.toString("utf8").replace(/\r\n/g, "\n"))
        .digest("hex"),
      expected,
    );
    // Explanation: Complete the current translation scope or callback.
    // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  }
  // Explanation: Assert the expected translation state or invariant.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
  assert.doesNotMatch(
    sessionSource,
    /localStorage|sessionStorage|indexedDB|writeFile|CacheStorage/,
  );
  // Explanation: Complete the current translation scope or callback.
  // Reason: Verify the translation rules without paid API calls, dependency installation, or generated translation files.
});

// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
test("changing an applied target cancels old work and requests only the replacement", async () => {
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const originalFetch = globalThis.fetch;
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const requests = [];
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  globalThis.fetch = (url, options) =>
    new Promise((resolve) => requests.push({ options, resolve }));
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  try {
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    session.selectTranslationLanguage("fr");
    session.requestTranslation();
    session.localize(pair, "en");
    await settle();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    session.selectTranslationLanguage("de");
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.equal(requests.length, 1);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    session.requestTranslation();
    session.localize(pair, "en");
    await settle();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.equal(requests[0].options.signal.aborted, true);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.equal(JSON.parse(requests[1].options.body).language, "de");
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    requests[0].resolve({
      ok: true,
      json: async () => ({
        results: [{ id: "item-0", status: "accepted", text: "Old French" }],
      }),
    });
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    requests[1].resolve({
      ok: true,
      json: async () => ({
        results: [{ id: "item-0", status: "accepted", text: "Geprüfter Text" }],
      }),
    });
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    await settle();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.equal(session.localize(pair, "en"), "Geprüfter Text");
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  } finally {
    session.clearTranslation();
    globalThis.fetch = originalFetch;
  }
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
});
// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
test("failed provider responses retain sources and never expose unchecked text", async () => {
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const originalFetch = globalThis.fetch;
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  globalThis.fetch = async () => ({ ok: false });
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  try {
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    session.selectTranslationLanguage("fr");
    session.requestTranslation();
    session.localize(pair, "en");
    await settle();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    // Explanation: Preserve the previous expectation for review.
    // Reason: Match source-only fallback and bounded API correction requirements.
    // assert.equal(session.localize(pair, "en"), uncertaintyText(pair));
    // Explanation: Check the revised translation recovery behavior.
    // Reason: Match source-only fallback and bounded API correction requirements.
    assert.equal(session.localize(pair, "en"), pair.en);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  } finally {
    session.clearTranslation();
    globalThis.fetch = originalFetch;
  }
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
});
// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
const apiSource = await readFile(
  new URL("../api/translate.ts", import.meta.url),
  "utf8",
);
// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
const apiJS = stripTypeScriptTypes(apiSource, { mode: "transform" }).replace(
  '"../src/localization/translation"',
  JSON.stringify(translationURL),
);
// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
const api = await import(
  "data:text/javascript;base64," + Buffer.from(apiJS).toString("base64")
);
// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
async function invokeApi(body) {
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const request = {
    method: "POST",
    headers: {},
    on: () => {},
    async *[Symbol.asyncIterator]() {
      yield JSON.stringify(body);
    },
  };
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const headers = {};
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  let data;
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const response = {
    statusCode: 200,
    setHeader: (name, value) => {
      headers[name] = value;
    },
    end: (value) => {
      data = JSON.parse(value);
      response.writableEnded = true;
    },
    on: () => {},
    off: () => {},
  };
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  await api.default(request, response);
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  return { status: response.statusCode, headers, data };
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
}
// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
test("API validates input and rejects Chinese or English as temporary targets", async () => {
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  assert.throws(() =>
    api.parseTranslationBody(
      JSON.stringify({ language: "zh", items: [{ id: "x", ...pair }] }),
    ),
  );
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  assert.throws(() =>
    api.parseTranslationBody(
      JSON.stringify({ language: "fr", items: [{ id: "x", en: {} }] }),
    ),
  );
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const response = await invokeApi({
    language: "en",
    items: [{ id: "x", ...pair }],
  });
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  assert.equal(response.status, 400);
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  assert.match(response.headers["Cache-Control"], /no-store/);
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
});
// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
test("API performs generation and both reviews with response storage disabled", async () => {
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const originalFetch = globalThis.fetch;
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const originalKey = process.env.OPENAI_API_KEY;
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const requests = [];
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  process.env.OPENAI_API_KEY = "test-only-placeholder";
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  globalThis.fetch = async (url, options) => {
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    const body = JSON.parse(options.body);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    requests.push(body);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    const result = await model(body.instructions, JSON.parse(body.input));
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    return {
      ok: true,
      json: async () => ({
        status: "completed",
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(result) }] },
        ],
      }),
    };
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  };
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  try {
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    const response = await invokeApi({
      language: "fr",
      items: [{ id: "x", ...pair }],
    });
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.equal(response.status, 200);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.equal(response.data.results[0].status, "accepted");
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.equal(requests.length, 3);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.ok(
      requests.every(
        (body) =>
          body.store === false &&
          JSON.parse(body.input).targetLanguage === "fr",
      ),
    );
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
    assert.match(response.headers["Cache-Control"], /no-store/);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
});
// Explanation: Implement the temporary translation operation below.
// Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
test("source-language buttons reset the selector before changing Chinese or English", async () => {
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const source = await readFile(
    new URL("../src/ui/App.tsx", import.meta.url),
    "utf8",
  );
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  const choose = source.slice(
    source.indexOf("const chooseLanguage ="),
    source.indexOf("return (", source.indexOf("const chooseLanguage =")),
  );
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  assert.ok(
    choose.indexOf("clearTranslation()") <
      choose.indexOf("i18n.changeLanguage(nextLanguage)"),
  );
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
  assert.match(source, /useBaseTranslation\(\)/);
  // Explanation: Implement the temporary translation operation below.
  // Reason: Exercise target replacement, failure handling, API validation and highest-priority source-language reset without paid provider calls.
});

// Explanation: Implement the temporary translation operation below.
// Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
test("single-source pages finish without provider requests or endless loading", async () => {
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
  const originalFetch = globalThis.fetch;
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
  let requests = 0;
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
  globalThis.fetch = async () => {
    requests += 1;
    throw new Error("unexpected_request");
  };
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
  try {
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
    session.selectTranslationLanguage("fr");
    session.requestTranslation();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
    // Explanation: Preserve the previous expectation for review.
    // Reason: Match source-only fallback and bounded API correction requirements.
    // assert.match(session.localize({ en: "English-only cover paragraph" }, "en"), /Original Chinese unavailable/);
    // Explanation: Check the revised translation recovery behavior.
    // Reason: Match source-only fallback and bounded API correction requirements.
    assert.equal(
      session.localize({ en: "English-only cover paragraph" }, "en"),
      "English-only cover paragraph",
    );
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
    await settle();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
    assert.equal(requests, 0);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
    // Explanation: Preserve the old no-notice assertion.
    // Reason: Missing source pairs now show a temporary notice.
    // assert.equal(session.getTranslationState().message, "");
    // Explanation: Check the revised translation recovery behavior.
    // Reason: Missing originals retain readable content and signal the temporary fallback.
    assert.match(session.getTranslationState().message, /unavailable/);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
  } finally {
    session.clearTranslation();
    globalThis.fetch = originalFetch;
  }
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify that missing bilingual evidence produces immediate uncertainty without a paid request or unfinished loading indicator.
});

// Explanation: Implement the temporary translation operation below.
// Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
const reactStubURL =
  "data:text/javascript;base64," +
  Buffer.from(
    "export const useMemo = fn => fn(); export const useSyncExternalStore = (subscribe, snapshot) => snapshot();",
  ).toString("base64");
// Explanation: Implement the temporary translation operation below.
// Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
const baseStubURL =
  "data:text/javascript;base64," +
  Buffer.from(
    "export const useTranslation = () => globalThis.__requestedTranslationTestBase;",
  ).toString("base64");
// Explanation: Implement the temporary translation operation below.
// Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
const sessionURL =
  "data:text/javascript;base64," + Buffer.from(sessionJS).toString("base64");
// Explanation: Implement the temporary translation operation below.
// Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
const hookSource = await readFile(
  new URL("../src/ui/i18n/requestedTranslation.ts", import.meta.url),
  "utf8",
);
// Explanation: Implement the temporary translation operation below.
// Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
const hookJS = stripTypeScriptTypes(hookSource, { mode: "transform" })
  .replace('"react"', JSON.stringify(reactStubURL))
  .replace('"react-i18next"', JSON.stringify(baseStubURL))
  .replaceAll('"../../localization/session"', JSON.stringify(sessionURL));
// Explanation: Implement the temporary translation operation below.
// Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
const hook = await import(
  "data:text/javascript;base64," + Buffer.from(hookJS).toString("base64")
);
// Explanation: Implement the temporary translation operation below.
// Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
test("stale text callbacks use the current target and uncertain interpolation keeps original names", async () => {
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
  const originalFetch = globalThis.fetch;
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
  const requests = [];
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
  globalThis.__requestedTranslationTestBase = {
    t: () => "Original text",
    i18n: {
      resolvedLanguage: "en",
      getResource: (language) =>
        language === "en" ? "Drive {{part}} forward" : "{{part}}：正向驱动",
    },
  };
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
  const captured = hook.useTranslation();
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
  globalThis.fetch = (url, options) =>
    new Promise((resolve) => requests.push({ options, resolve }));
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
  try {
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    session.selectTranslationLanguage("fr");
    session.requestTranslation();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    const part = { en: "Wheel", zh: "轮" };
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    captured.t("viewer.driveForward", { part: session.localize(part, "en") });
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    await settle();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    assert.equal(requests.length, 1);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    const body = JSON.parse(requests[0].options.body);
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    requests[0].resolve({
      ok: true,
      json: async () => ({
        results: body.items.map((item) =>
          item.en === "Wheel"
            ? { id: item.id, status: "accepted", text: "Roue" }
            : { id: item.id, status: "uncertain" },
        ),
      }),
    });
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    await settle();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    const display = captured.t("viewer.driveForward", {
      part: session.localize(part, "en"),
    });
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    // Explanation: Preserve the previous expectation for review.
    // Reason: Match source-only fallback and bounded API correction requirements.
    // assert.ok(display.includes("English: Drive Wheel forward"));
    // Explanation: Check the revised translation recovery behavior.
    // Reason: Match source-only fallback and bounded API correction requirements.
    assert.equal(display, "Drive Wheel forward");
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    // Explanation: Preserve the previous expectation for review.
    // Reason: Match source-only fallback and bounded API correction requirements.
    // assert.ok(display.includes("中文: 轮：正向驱动"));
    // Explanation: Check the revised translation recovery behavior.
    // Reason: Match source-only fallback and bounded API correction requirements.
    assert.ok(!display.includes("中文:"));
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    assert.ok(!display.includes("Roue"));
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    session.clearTranslation();
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
    assert.equal(captured.t("viewer.driveForward"), "Original text");
    // Explanation: Implement the temporary translation operation below.
    // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
  } finally {
    session.clearTranslation();
    globalThis.fetch = originalFetch;
    delete globalThis.__requestedTranslationTestBase;
  }
  // Explanation: Implement the temporary translation operation below.
  // Reason: Verify reversible interpolation and callbacks retained by long-running demonstrations without installing React or making live provider calls.
});
