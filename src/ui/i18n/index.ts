import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import zh from "./zh.json";

export type SupportedLanguage = "en" | "zh";

export function detectBrowserLanguage(
  browserLanguage?: string,
): SupportedLanguage {
  const language =
    browserLanguage ??
    (typeof navigator === "undefined" ? undefined : navigator.language);
  return language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export const initialLanguage = detectBrowserLanguage();

void i18n.use(initReactI18next).init({
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  lng: initialLanguage,
  resources: { en: { translation: en }, zh: { translation: zh } },
  supportedLngs: ["en", "zh"],
});

export default i18n;
