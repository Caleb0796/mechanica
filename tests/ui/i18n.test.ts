import { describe, expect, it } from "vitest";

import {
  auditBundledCatalogs,
  auditCatalogs,
} from "../../src/ui/i18n/catalog-audit";
import i18n, {
  detectBrowserLanguage,
  storedLanguage,
} from "../../src/ui/i18n";

describe("interface catalogs", () => {
  it("has matching non-empty string leaves in English and Chinese", () => {
    const report = auditBundledCatalogs();
    expect(report.issues).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it("reports missing keys and non-string leaves", () => {
    const report = auditCatalogs({
      en: { viewer: { title: "Mechanica", count: 10 } },
      zh: { viewer: { title: "古械重生", extra: "额外" } },
    });
    expect(
      report.missingKeys.map((issue) => `${issue.language}:${issue.key}`),
    ).toEqual(["en:viewer.extra", "zh:viewer.count"]);
    expect(report.nonStringLeaves).toHaveLength(1);
  });

  it("uses Chinese only for a Chinese browser locale", () => {
    expect(detectBrowserLanguage("zh-CN")).toBe("zh");
    expect(detectBrowserLanguage("en-US")).toBe("en");
    expect(detectBrowserLanguage("fr-FR")).toBe("en");
  });

  it("switches copy in both directions", async () => {
    await i18n.changeLanguage("zh");
    expect(i18n.t("app.language")).toBe("语言");

    await i18n.changeLanguage("en");
    expect(i18n.t("app.language")).toBe("Language");
  });

  it("restores the exact persisted language on reload", () => {
    const previousLocalStorage = globalThis.localStorage;
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
      },
    });

    values.set("mechanica-lang", "zh");
    expect(storedLanguage()).toBe("zh");
    values.set("mechanica-lang", "en");
    expect(storedLanguage()).toBe("en");

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previousLocalStorage,
    });
  });
});
