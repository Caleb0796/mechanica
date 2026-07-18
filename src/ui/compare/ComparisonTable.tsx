import { useTranslation } from "react-i18next";

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
    scholar: patch?.scholar[language] ?? data?.scholar[language] ?? schemeId,
    year: String(patch?.year ?? data?.year ?? "—"),
    mechanism: data?.summary[language] ?? patch?.summary[language] ?? "—",
    evidence: data?.evidence[language] ?? "—",
    critique: data?.critique?.[language] ?? "—",
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
  const labels =
    language === "en"
      ? {
          title: "Reconstruction comparison",
          scholar: "Scholar",
          year: "Year",
          mechanism: "Mechanism difference",
          evidence: "Evidence",
          critique: "Main critique",
        }
      : {
          title: "复原方案比较",
          scholar: "学者",
          year: "年份",
          mechanism: "机构差异",
          evidence: "证据",
          critique: "主要质疑",
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
