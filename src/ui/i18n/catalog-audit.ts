import en from "./en.json";
import zh from "./zh.json";

export type CatalogAuditIssueType =
  "missing-key" | "non-string-leaf" | "empty-translation";

export interface CatalogAuditIssue {
  type: CatalogAuditIssueType;
  language: string;
  key: string;
  valueType?: string;
}

export interface CatalogAuditReport {
  valid: boolean;
  issues: CatalogAuditIssue[];
  missingKeys: CatalogAuditIssue[];
  nonStringLeaves: CatalogAuditIssue[];
  emptyTranslations: CatalogAuditIssue[];
}

export const bundledCatalogs = { en, zh } as const;

function valueType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function collectCatalog(
  language: string,
  value: unknown,
  path: string,
  terminalKeys: Set<string>,
  nonStringLeaves: CatalogAuditIssue[],
  emptyTranslations: CatalogAuditIssue[],
): void {
  if (typeof value === "string") {
    terminalKeys.add(path);
    if (value.trim().length === 0) {
      emptyTranslations.push({
        type: "empty-translation",
        language,
        key: path,
      });
    }
    return;
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (entries.length > 0) {
      for (const [key, child] of entries) {
        collectCatalog(
          language,
          child,
          path ? `${path}.${key}` : key,
          terminalKeys,
          nonStringLeaves,
          emptyTranslations,
        );
      }
      return;
    }
  }

  const key = path || "<root>";
  terminalKeys.add(key);
  nonStringLeaves.push({
    type: "non-string-leaf",
    language,
    key,
    valueType: valueType(value),
  });
}

export function auditCatalogs(
  catalogs: Readonly<Record<string, unknown>>,
): CatalogAuditReport {
  const keysByLanguage = new Map<string, Set<string>>();
  const nonStringLeaves: CatalogAuditIssue[] = [];
  const emptyTranslations: CatalogAuditIssue[] = [];

  for (const [language, catalog] of Object.entries(catalogs)) {
    const terminalKeys = new Set<string>();
    collectCatalog(
      language,
      catalog,
      "",
      terminalKeys,
      nonStringLeaves,
      emptyTranslations,
    );
    keysByLanguage.set(language, terminalKeys);
  }

  const allKeys = new Set<string>();
  for (const keys of keysByLanguage.values()) {
    for (const key of keys) allKeys.add(key);
  }

  const missingKeys: CatalogAuditIssue[] = [];
  for (const [language, keys] of keysByLanguage) {
    for (const key of [...allKeys].sort()) {
      if (!keys.has(key)) {
        missingKeys.push({ type: "missing-key", language, key });
      }
    }
  }

  const issues = [...missingKeys, ...nonStringLeaves, ...emptyTranslations];
  return {
    valid: issues.length === 0,
    issues,
    missingKeys,
    nonStringLeaves,
    emptyTranslations,
  };
}

export function auditBundledCatalogs(): CatalogAuditReport {
  return auditCatalogs(bundledCatalogs);
}
