// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// import { useTranslation } from "react-i18next";
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
// import { useTranslation, localize, localizeSingle } from "../i18n/requestedTranslation";
// Explanation: Import only the translation operations used by this component.
// Reason: Unused helper imports are unnecessary; their previous declarations remain commented out.
import { useTranslation, localize } from "../i18n/requestedTranslation";

import type { MachineModule } from "../../sim/types";

interface ComparisonTableProps {
  leftSchemeId: string;
  module: MachineModule;
  rightSchemeId: string;
}

interface SchemeColumns {
  critique: string;
  evidence: string;
  mechanism: string;
  scholar: string;
  year: string;
}

function columnsFor(
  module: MachineModule,
  schemeId: string,
  language: "zh" | "en",
): SchemeColumns {
  const patch = module.schemes?.[schemeId];
  const data = module.data.schemes.find((scheme) => scheme.id === schemeId);
  return {
    scholar: (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// patch?.scholar[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(patch?.scholar, language)
) ?? (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// data?.scholar[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(data?.scholar, language)
) ?? schemeId,
    year: String(patch?.year ?? data?.year ?? "—"),
    mechanism: (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// data?.summary[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(data?.summary, language)
) ?? (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// patch?.summary[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(patch?.summary, language)
) ?? "—",
    evidence: (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// data?.evidence[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(data?.evidence, language)
) ?? "—",
    critique: (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// data?.critique?.[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(data?.critique, language)
) ?? "—",
  };
}

export default function ComparisonTable({
  leftSchemeId,
  module,
  rightSchemeId,
}: ComparisonTableProps) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const left = columnsFor(module, leftSchemeId, language);
  const right = columnsFor(module, rightSchemeId, language);
// Explanation: Replace direct two-language heading selection with temporary localization.
// Reason: The target-language comparison view needs the same validation and fallback policy.
//   const labels =
//     language === "en"
//       ? {
//           title: "Reconstruction comparison",
//           scholar: "Scholar",
//           year: "Year",
//           mechanism: "Mechanism difference",
//           evidence: "Evidence",
//           critique: "Main critique",
//         }
//       : {
//           title: "复原方案比较",
//           scholar: "学者",
//           year: "年份",
//           mechanism: "机构差异",
//           evidence: "证据",
//           critique: "主要质疑",
//         };
// 
// Explanation: Replace direct two-language heading selection with temporary localization.
// Reason: The target-language comparison view needs the same validation and fallback policy.
  const labels = {
// Explanation: Resolve the existing bilingual title label.
// Reason: Comparison headings must follow the explicit temporary target.
    title: localize({"en":"Reconstruction comparison","zh":"复原方案比较"}, language),
// Explanation: Resolve the existing bilingual scholar label.
// Reason: Comparison headings must follow the explicit temporary target.
    scholar: localize({"en":"Scholar","zh":"学者"}, language),
// Explanation: Resolve the existing bilingual year label.
// Reason: Comparison headings must follow the explicit temporary target.
    year: localize({"en":"Year","zh":"年份"}, language),
// Explanation: Resolve the existing bilingual mechanism label.
// Reason: Comparison headings must follow the explicit temporary target.
    mechanism: localize({"en":"Mechanism difference","zh":"机构差异"}, language),
// Explanation: Resolve the existing bilingual evidence label.
// Reason: Comparison headings must follow the explicit temporary target.
    evidence: localize({"en":"Evidence","zh":"证据"}, language),
// Explanation: Resolve the existing bilingual critique label.
// Reason: Comparison headings must follow the explicit temporary target.
    critique: localize({"en":"Main critique","zh":"主要质疑"}, language),
// Explanation: Complete the comparison label mapping.
// Reason: Original English and Chinese labels remain the authoritative inputs.
  };
  const rows: Array<[string, keyof SchemeColumns]> = [
    [labels.scholar, "scholar"],
    [labels.year, "year"],
    [labels.mechanism, "mechanism"],
    [labels.evidence, "evidence"],
    [labels.critique, "critique"],
  ];

  return (
    <table className="compare-table">
      <caption>{labels.title}</caption>
      <thead>
        <tr>
          <th scope="col">{labels.title}</th>
          <th scope="col">{left.scholar}</th>
          <th scope="col">{right.scholar}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, key]) => (
          <tr key={key}>
            <th scope="row">{label}</th>
            <td>{left[key]}</td>
            <td>{right[key]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
