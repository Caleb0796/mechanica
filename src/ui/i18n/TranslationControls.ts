// Explanation: Import the temporary translation dependency.
// Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
import { createElement, useEffect, useSyncExternalStore } from "react";
// Explanation: Import the temporary translation dependency.
// Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
import { TARGET_CODES } from "../../localization/translation";
// Explanation: Import the temporary translation dependency.
// Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
import {
  getTranslationState,
  subscribeTranslation,
  selectTranslationLanguage,
  requestTranslation,
} from "../../localization/session";
// Explanation: Define english names for this operation.
// Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
const englishNames = new Intl.DisplayNames(["en"], { type: "language" });
// Explanation: Define languages for this operation.
// Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
const languages = TARGET_CODES.map((code) => ({
  code,
  name: englishNames.of(code) || code,
})).sort((left, right) => left.name.localeCompare(right.name));
// Explanation: Apply the current export operation in the translation pipeline.
// Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
export default function TranslationControls() {
  // Explanation: Define state for this operation.
  // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
  const state = useSyncExternalStore(
    subscribeTranslation,
    getTranslationState,
    getTranslationState,
  );
  // Explanation: Apply the current useEffect operation in the translation pipeline.
  // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
  useEffect(() => {
    // Explanation: Apply the current document operation in the translation pipeline.
    // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
    document.documentElement.dataset.translation = state.target ? "active" : "";
    // Explanation: Complete the current translation scope or callback.
    // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
  }, [state.target]);
  // Explanation: Return the computed translation value or validation outcome.
  // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
  return createElement(
    "div",
    {
      className: "translation-controls",
      "data-testid": "translation-controls",
    },
    // Explanation: Apply the current createElement operation in the translation pipeline.
    // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
    createElement(
      "select",
      {
        "aria-label": "Translation language",
        "data-testid": "translation-language",
        value: state.selected,
        onChange: (event: { currentTarget: { value: string } }) =>
          selectTranslationLanguage(event.currentTarget.value),
      },
      // Explanation: Apply the current createElement operation in the translation pipeline.
      // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
      createElement("option", { value: "" }, ""),
      // Explanation: Apply the current  operation in the translation pipeline.
      // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
      ...languages.map((language) =>
        createElement(
          "option",
          { key: language.code, value: language.code },
          language.name,
        ),
      ),
    ),
    // Explanation: Apply the current createElement operation in the translation pipeline.
    // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
    createElement(
      "button",
      {
        type: "button",
        "data-testid": "translate-button",
        onClick: requestTranslation,
      },
      "translate",
    ),
    // Explanation: Apply the current createElement operation in the translation pipeline.
    // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
    // Explanation: Preserve the earlier status-element prefix.
    // Reason: Implementation comments must occupy their own lines.
    // createElement("span", { role: "status", "aria-live": "polite",
    // Explanation: Create the accessible translation status or popup.
    // Reason: Screen readers need polite announcements without changed paragraph text.
    createElement(
      "span",
      {
        role: "status",
        "aria-live": "polite",
        // Reason: Temporary notices should appear as a popup without changing the language controls or paragraph content.
        // // Explanation: Preserve the superseded translation implementation.
        // Reason: Temporary notices should appear as a popup without changing language controls or paragraph content.
        // // Explanation: Preserve the superseded translation implementation.
        // Reason: Temporary notices should appear as a popup without changing language controls or paragraph content.
        // className: "translation-status"
        // Explanation: Apply the reviewed translation recovery and display behavior.
        // Reason: Temporary notices should appear as a popup without changing language controls or paragraph content.
        // Explanation: Disable incomplete duplicate invocation arguments.
        // Reason: The complete reviewed invocation below supplies these arguments once.
        // className: "translation-status" + (state.message && !state.message.startsWith("Translating") ? " translation-notice" : "")
        // Explanation: Apply the reviewed translation recovery and display behavior.
        // Reason: Temporary notices should appear as a popup without changing language controls or paragraph content.
        // Explanation: Disable incomplete duplicate invocation arguments.
        // Reason: The complete reviewed invocation below supplies these arguments once.
        // className: "translation-status" + (state.message && !state.message.startsWith("Translating") ? " translation-notice" : "")
        // Explanation: Apply the reviewed translation recovery and display behavior.
        // Reason: Temporary notices should appear as a popup without changing the language controls or paragraph content.
        className:
          "translation-status" +
          (state.message && !state.message.startsWith("Translating")
            ? " translation-notice"
            : ""),
      },
      state.message,
    ),
  );
  // Explanation: Complete the current translation scope or callback.
  // Reason: Keep the initially empty selector and explicit Translate action independent of the higher-priority Chinese and English controls.
}
