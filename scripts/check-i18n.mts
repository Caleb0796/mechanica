import { auditBundledCatalogs } from "../src/ui/i18n/catalog-audit";

declare const process: { exitCode?: number };

const report = auditBundledCatalogs();

if (!report.valid) {
  console.error(JSON.stringify(report.issues, null, 2));
  process.exitCode = 1;
} else {
  console.log("i18n catalogs: 0 issues");
}
