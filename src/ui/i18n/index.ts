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

function storedLanguage(): SupportedLanguage | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const language = localStorage.getItem("mechanica-lang");
    return language === "en" || language === "zh" ? language : undefined;
  } catch {
    return undefined;
  }
}

export const initialLanguage = storedLanguage() ?? detectBrowserLanguage();

void i18n.use(initReactI18next).init({
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  lng: initialLanguage,
  resources: { en: { translation: en }, zh: { translation: zh } },
  supportedLngs: ["en", "zh"],
});

export default i18n;
