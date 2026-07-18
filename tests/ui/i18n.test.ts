import { describe, expect, it } from "vitest";

import {
  auditBundledCatalogs,
  auditCatalogs,
} from "../../src/ui/i18n/catalog-audit";
import { detectBrowserLanguage } from "../../src/ui/i18n";

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
});
