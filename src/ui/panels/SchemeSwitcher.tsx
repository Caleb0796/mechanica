import { useState } from "react";
import { useTranslation } from "react-i18next";

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
            {scheme.scholar[language]} · {scheme.year}
          </option>
        ))}
      </select>
      <p className="panel-copy">
        {selected?.summary[language] ?? t("viewer.schemeDiff")}
      </p>
      <button
        aria-pressed={isCompareActive}
        data-testid="compare-toggle"
        disabled={schemes.length < 2}
        onClick={toggleCompare}
        type="button"
      >
        {language === "en" ? "Compare schemes" : "对比复原方案"}
      </button>
      {isCompareActive ? (
        <div className="compare-scheme-pickers">
          {([0, 1] as const).map((side) => (
            <select
              aria-label={
                language === "en"
                  ? `${side === 0 ? "Left" : "Right"} comparison scheme`
                  : `${side === 0 ? "左侧" : "右侧"}对比方案`
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
                  {scheme.scholar[language]} · {scheme.year}
                </option>
              ))}
            </select>
          ))}
        </div>
      ) : null}
    </section>
  );
}
