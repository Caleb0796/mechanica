import { useState } from "react";
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
import {
  createSchemeTransition,
  type SchemeTransitionMetadata,
} from "../compare/model";

interface SchemeSwitcherProps {
  compareActive?: boolean;
  compareSchemeIds?: [string, string];
  module: MachineModule;
  onChange: (schemeId: string | undefined) => void;
  onCompareChange?: (active: boolean) => void;
  onCompareSchemesChange?: (schemeIds: [string, string]) => void;
  onTransition?: (transition: SchemeTransitionMetadata) => void;
  schemeId?: string;
}

export default function SchemeSwitcher({
  compareActive,
  compareSchemeIds,
  module,
  onChange,
  onCompareChange,
  onCompareSchemesChange,
  onTransition,
  schemeId,
}: SchemeSwitcherProps) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const schemes = Object.values(module.schemes ?? {});
  const selectedSchemeId =
    schemeId ?? module.defaultSchemeId ?? schemes[0]?.id ?? "";
  const initialLeft = selectedSchemeId;
  const initialRight =
    schemes.find((scheme) => scheme.id !== initialLeft)?.id ?? initialLeft;
  const [internalCompareActive, setInternalCompareActive] = useState(false);
  const [internalSchemeIds, setInternalSchemeIds] = useState<[string, string]>([
    initialLeft,
    initialRight,
  ]);

  if (schemes.length === 0) return null;

  const chooseScheme = (nextId: string) => {
    onTransition?.(createSchemeTransition(module, selectedSchemeId, nextId));
    onChange(nextId);
  };

  const isCompareActive = compareActive ?? internalCompareActive;
  const comparedSchemeIds = compareSchemeIds ?? internalSchemeIds;
  const toggleCompare = () => {
    const next = !isCompareActive;
    if (compareActive === undefined) setInternalCompareActive(next);
    onCompareChange?.(next);
  };
  const chooseComparedScheme = (side: 0 | 1, nextId: string) => {
    const next: [string, string] = [...comparedSchemeIds];
    const other = side === 0 ? 1 : 0;
    if (next[other] === nextId) next[other] = next[side];
    next[side] = nextId;
    if (compareSchemeIds === undefined) setInternalSchemeIds(next);
    onCompareSchemesChange?.(next);
  };
  const selected = module.schemes?.[selectedSchemeId];

  return (
    <section className="panel">
      <h2>{t("viewer.scheme")}</h2>
      <select
        aria-label={t("viewer.scheme")}
        className="scheme-select"
        onChange={(event) => chooseScheme(event.currentTarget.value)}
        value={selectedSchemeId}
      >
        {schemes.map((scheme) => (
          <option key={scheme.id} value={scheme.id}>
            {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// scheme.scholar[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(scheme.scholar, language)
)} · {scheme.year}
          </option>
        ))}
      </select>
      <p className="panel-copy">
        {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// selected?.summary[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(selected?.summary, language)
) ?? t("viewer.schemeDiff")}
      </p>
      <button
        aria-pressed={isCompareActive}
        data-testid="compare-toggle"
        disabled={schemes.length < 2}
        onClick={toggleCompare}
        type="button"
      >
        {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// language === "en" ? "Compare schemes" : "对比复原方案"
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize({ en: "Compare schemes", zh: "对比复原方案" }, language)
)}
      </button>
      {isCompareActive ? (
        <div className="compare-scheme-pickers">
          {([0, 1] as const).map((side) => (
            <select
              aria-label={
                (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// language === "en"
//                   ? `${side === 0 ? "Left" : "Right"} comparison scheme`
//                   : `${side === 0 ? "左侧" : "右侧"}对比方案`
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize({ en: `${side === 0 ? "Left" : "Right"} comparison scheme`, zh: `${side === 0 ? "左侧" : "右侧"}对比方案` }, language)
)
              }
              className="scheme-select"
              key={side}
              onChange={(event) =>
                chooseComparedScheme(side, event.currentTarget.value)
              }
              value={comparedSchemeIds[side]}
            >
              {schemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// scheme.scholar[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(scheme.scholar, language)
)} · {scheme.year}
                </option>
              ))}
            </select>
          ))}
        </div>
      ) : null}
    </section>
  );
}
