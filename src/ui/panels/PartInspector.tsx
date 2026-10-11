// Explanation: Read whether a temporary translation session is active.
// Reason: Original primary quotations must retain their existing rendering when translation is off.
import { getTranslationState } from "../../localization/session";
import { useEffect, useRef } from "react";
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
// import { useTranslation } from "react-i18next";
// Explanation: Use the translation-aware React hook and original-text resolvers.
// Reason: Apply the explicitly requested target without changing English or Chinese source catalogs.
import { useTranslation, localize, localizeSingle } from "../i18n/requestedTranslation";

import type {
  MachineModule,
  MachineSpec,
  PartDef,
  Quantity,
} from "../../sim/types";
import { useUiStore } from "../store";
import { humanizeDimLabel } from "./partDimLabels";

type Lang = "zh" | "en";

interface PartInspectorProps {
  module: MachineModule;
  spec: MachineSpec;
}

function metricLabel(quantity: Quantity) {
  if (quantity.unit === "m") return `${quantity.value.toFixed(3)} m`;
  if (quantity.unit === "rad") return `${quantity.value.toFixed(3)} rad`;
  return `${quantity.value} ${quantity.unit}`;
}

function geometryNumbers(
  value: unknown,
  prefix = "",
): Array<{ path: string; value: number }> {
  if (typeof value === "number") return [{ path: prefix, value }];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      geometryNumbers(entry, `${prefix}.${index}`),
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) =>
    geometryNumbers(entry, prefix ? `${prefix}.${key}` : key),
  );
}

function dimensionUnit(part: PartDef, path: string): string {
  if (/(^|\.)(teeth|spokes|segments|count)$/i.test(path)) return "count";
  if (path.endsWith("Deg")) return "°";
  if (path.startsWith("joint.limits.")) {
    return part.joint?.kind === "prismatic" ? "m" : "rad";
  }
  return "m";
}

function geometryDimensions(part: PartDef, language: Lang) {
  const numbers = geometryNumbers(part.geometry);
  if (part.joint?.limits) {
    numbers.push(
      { path: "joint.limits.0", value: part.joint.limits[0] },
      { path: "joint.limits.1", value: part.joint.limits[1] },
    );
  }
  return numbers
    .filter(({ path }) => path !== "")
    .map(({ path, value }) => ({
      label: humanizeDimLabel(part.geometry.type, path, language),
      value: `${Number.isInteger(value) ? value : value.toFixed(3)} ${dimensionUnit(part, path)}`,
      provenance:
        part.dimensionProvenance[path] ?? part.dimensionProvenance["@rest"],
    }));
}

const NOTE_ZH: Record<string, string> = {
  "Geometry is an illustrative reconstruction where the classical text gives no measurement.":
    "古籍未记载此尺寸，几何为示意复原参数。",
  "Derived from the recorded 2.090 m diameter and 600 tooth slots.":
    "由记载的 2.090 m 直径与六百牙推算。",
  "Half of the recorded 3.432 m diameter.": "取记载直径 3.432 m 之半。",
  "The main reading records seventy-two spokes paired into thirty-six receiving cells.":
    "主流读法为七十二辐，两辐夹持一壶，共三十六壶。",
  "Variant reading retained alongside the main thirty-six-scoop reconstruction.":
    "异文读法，与三十六壶主方案并存展示。",
};

const BOOK_EN: Record<string, string> = {
  新儀象法要: "Xin Yi Xiang Fa Yao",
};

// Explanation: Resolve existing provenance-note translations as source pairs.
// Reason: Unknown note counterparts must not be invented during cross-validation.
// const localizedNote = (note: string, language: Lang) =>
//   language === "zh" ? (NOTE_ZH[note] ?? note) : note;
// Explanation: Resolve existing provenance-note translations as source pairs.
// Reason: Unknown note counterparts must not be invented during cross-validation.
const localizedNote = (note: string, language: Lang) => localize({ en: note, zh: NOTE_ZH[note] }, language);

function sourceBook(
  module: MachineModule,
  reference: string,
  language: Lang,
): string {
  return referenceIds(reference)
    .map((id) => {
      const book = module.data.sources.find((source) => source.id === id)?.book;
      if (!book) return id;
      // Explanation: Resolve the existing bilingual historical book title.
// Reason: Book display wording should use validated temporary translation while identifiers stay unchanged.
// return language === "en" ? (BOOK_EN[book] ?? book) : book;
// Explanation: Resolve the existing bilingual historical book title.
// Reason: Book display wording should use validated temporary translation while identifiers stay unchanged.
return localize({ en: BOOK_EN[book], zh: book }, language);
    })
    .join(" + ");
}

function referenceIds(reference: string): string[] {
  return reference
    .split("+")
    .map((item) => item.trim())
    .filter(Boolean);
}

function MachineEvidenceRecord({
  module,
  spec,
}: {
  module: MachineModule;
  spec: MachineSpec;
}) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const copy = {
    basis: t("inspector.basis"),
    controversies: t("inspector.machineControversies"),
    dimensions: t("inspector.authoritativeDimensions"),
    engineering: t("inspector.engineeringProvenance"),
    inventors: t("inspector.inventors"),
    schemes: t("inspector.reconstructionEvidence"),
    sources: t("inspector.completeSources"),
    title: t("inspector.machineEvidenceTitle"),
  };

  return (
    <details data-testid="machine-evidence-register">
      <summary className="panel-link">
        <span aria-level={3} role="heading">
          {copy.title}
        </span>
      </summary>
      <p className="panel-copy">
        {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// module.data.era[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(module.data.era, language)
)} · {copy.inventors}:{" "}
        {module.data.inventors
          .map((inventor) => (
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// inventor[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(inventor, language)
))
          .join(" · ")}
      </p>
      <p className="panel-copy">{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// module.data.principle[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(module.data.principle, language)
)}</p>

      <h4>{copy.dimensions}</h4>
      <dl className="record-list" lang={language}>
        {module.data.dimensions.map((dimension) => {
          const metric = Array.isArray(dimension.meters)
            ? `${dimension.meters[0]}–${dimension.meters[1]} m`
            : `${dimension.meters} m`;
          const source = module.data.sources.find(
            (candidate) => candidate.id === dimension.sourceId,
          );
          return (
            <div
              data-machine-dimension={dimension.sourceId}
              key={`${dimension.label.en}-${dimension.ancient}`}
            >
              <dt>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// dimension.label[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(dimension.label, language)
)}</dt>
              <dd>
                <span className="dim-value">
                  {dimension.ancient} · {metric}
                </span>
                <span className="dim-note">
                  {t(`inspector.${dimension.confidence}`)} ·{" "}
                  {source
                    ? language === "en"
                      ? (BOOK_EN[source.book] ?? source.book)
                      : source.book
                    : dimension.sourceId}{" "}
                  · {copy.basis}: {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// dimension.basis
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localizeSingle(dimension.basis, /[\p{Script=Han}]/u.test(dimension.basis) ? "zh" : "en")
)}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>

      {module.data.schemes.length > 0 ? (
        <div>
          <h4>{copy.schemes}</h4>
          {module.data.schemes.map((scheme) => (
            <div
              className="panel-copy"
              data-machine-scheme={scheme.id}
              key={scheme.id}
            >
              <strong>
                {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// scheme.scholar[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(scheme.scholar, language)
)} · {scheme.year}
              </strong>
              <p>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// scheme.evidence[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(scheme.evidence, language)
)}</p>
              {scheme.critique ? <p>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// scheme.critique[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(scheme.critique, language)
)}</p> : null}
              {module.schemes?.[scheme.id]?.notes ? (
                <p>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// module.schemes[scheme.id].notes?.[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(module.schemes[scheme.id].notes, language)
)}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {spec.expectedRatios?.length ||
      spec.constraints.some(
        (constraint) =>
          "provenance" in constraint && Boolean(constraint.provenance),
      ) ? (
        <div>
          <h4>{copy.engineering}</h4>
          <dl className="record-list">
            {spec.expectedRatios?.map((ratio) => (
              <div key={`${ratio.from}-${ratio.to}`}>
                <dt>
                  {ratio.from} → {ratio.to}
                </dt>
                <dd>
                  {ratio.ratio}
                  <small>{ratio.sourceRef}</small>
                </dd>
              </div>
            ))}
            {spec.constraints.flatMap((constraint, index) =>
              "provenance" in constraint && constraint.provenance
                ? [
                    <div key={`${constraint.type}-${index}`}>
                      <dt>{constraint.type}</dt>
                      <dd>
                        {(
// Explanation: Resolve the engineering evidence category during an active translation session.
// Reason: Raw provenance identifiers should not bypass translated display labels while their stored values remain unchanged.
// constraint.provenance.kind
// Explanation: Resolve the engineering evidence category during an active translation session.
// Reason: Raw provenance identifiers should not bypass translated display labels while their stored values remain unchanged.
getTranslationState().target ? t(`inspector.${constraint.provenance.kind}`) : constraint.provenance.kind
)} ·{" "}
                        {constraint.provenance.ref}
                        {constraint.provenance.note ? (
                          <small data-evidence-text>
                            {localizedNote(
                              constraint.provenance.note,
                              language,
                            )}
                          </small>
                        ) : null}
                      </dd>
                    </div>,
                  ]
                : [],
            )}
          </dl>
        </div>
      ) : null}

      <h4>{copy.sources}</h4>
      {module.data.sources.map((source) => (
        <details data-machine-source={source.id} key={source.id}>
          <summary>
            {source.book}
            {source.chapter ? ` · ${source.chapter}` : ""}
          </summary>
          <p className="panel-copy" data-evidence-text lang="zh">
            {source.quote}
          </p>
          {source.translation ? (
            <p className="panel-copy">{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// source.translation[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(source.translation, language)
)}</p>
          ) : null}
          <a
            className="panel-link"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            {t("inspector.openSource")}
          </a>
        </details>
      ))}

      {module.data.controversies.length > 0 ? (
        <div>
          <h4>{copy.controversies}</h4>
          {module.data.controversies.map((controversy) => (
            <div
              className="panel-copy"
              data-machine-controversy={controversy.topic.en}
              key={controversy.topic.en}
            >
              <strong>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// controversy.topic[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(controversy.topic, language)
)}</strong>
              <p>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// controversy.detail[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(controversy.detail, language)
)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </details>
  );
}

export default function PartInspector({ module, spec }: PartInspectorProps) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const selectedPartId = useUiStore((state) => state.selectedPartId);
  const part = spec.parts.find((candidate) => candidate.id === selectedPartId);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!part) return;
    const frame = requestAnimationFrame(() => {
      panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      panel.current?.animate(
        [
          { boxShadow: "0 0 0 rgba(217, 184, 109, 0)" },
          { boxShadow: "0 0 2rem rgba(217, 184, 109, 0.38)" },
          { boxShadow: "0 0 0 rgba(217, 184, 109, 0)" },
        ],
        { duration: 650, easing: "ease-out" },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [part]);

  if (!part) {
    return (
      <section
        className="panel"
        data-selected-part-id=""
        data-testid="part-inspector"
        ref={panel}
      >
        <h2>{t("inspector.title")}</h2>
        <p className="panel-empty">{t("inspector.empty")}</p>
        <MachineEvidenceRecord module={module} spec={spec} />
      </section>
    );
  }

  const sourceRefs = new Set([
    ...referenceIds(part.provenance.ref),
    ...Object.values(part.dimensionProvenance).flatMap((provenance) =>
      referenceIds(provenance.ref),
    ),
    ...(part.dimensionNotes ?? []).flatMap((quantity) =>
      referenceIds(quantity.provenance.ref),
    ),
    ...module.data.dimensions
      .filter((dimension) =>
        (part.dimensionNotes ?? []).some(
          (quantity) =>
            quantity.ancient && quantity.ancient === dimension.ancient,
        ),
      )
      .map((dimension) => dimension.sourceId),
  ]);
  const sources = module.data.sources.filter((candidate) =>
    sourceRefs.has(candidate.id),
  );
  const dimensions = geometryDimensions(part, language);
  const hasDirectDimensionEvidence = dimensions.some(
    (dimension) =>
      dimension.provenance && dimension.provenance.kind !== "tuice",
  );
  const partSchemes = module.data.schemes.filter((scheme) =>
    part.schemeTags?.includes(scheme.id),
  );
  const controversies = module.data.controversies.filter((controversy) =>
    controversy.sourceIds.some((sourceId) => sourceRefs.has(sourceId)),
  );

  return (
    <section
      className="panel"
      data-selected-part-id={part.id}
      data-testid="part-inspector"
      ref={panel}
    >
      <h2>{t("inspector.title")}</h2>
      <h3 className="part-name">{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// part.name[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(part.name, language)
)}</h3>
      <span className="provenance-badge">
        {t(`inspector.${part.provenance.kind}`)} ·{" "}
        {sourceBook(module, part.provenance.ref, language)}
      </span>
      {part.provenance.note ? (
        <p className="panel-copy" data-evidence-text>
          {localizedNote(part.provenance.note, language)}
        </p>
      ) : null}

      {dimensions.length > 0 ? (
        <dl className="record-list" lang={language}>
          {dimensions.map((dimension) => (
            <div key={dimension.label}>
              <dt>{dimension.label}</dt>
              <dd>
                <span className="dim-value">{dimension.value}</span>
                {dimension.provenance ? (
                  <span className="dim-note">
                    {t(`inspector.${dimension.provenance.kind}`)} ·{" "}
                    {sourceBook(
                      module,
                      dimension.provenance.ref,
                      language,
                    )}
                    {dimension.provenance.note ? (
                      <span data-evidence-text>
                        {" "}
                        ·{" "}
                        {localizedNote(
                          dimension.provenance.note,
                          language,
                        )}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {part.dimensionNotes && part.dimensionNotes.length > 0 ? (
        <dl className="record-list" lang={language}>
          {part.dimensionNotes.map((quantity, index) => (
            <div key={`${quantity.provenance.ref}-${index}`}>
              <dt>
                {t("inspector.dimensions")} · {quantity.ancient}
              </dt>
              <dd>
                <span className="dim-value">{metricLabel(quantity)}</span>
                <span className="dim-note">
                  {t(`inspector.${quantity.provenance.kind}`)} ·{" "}
                  {sourceBook(module, quantity.provenance.ref, language)}
                  {quantity.provenance.note ? (
                    <span data-evidence-text>
                      {" "}
                      ·{" "}
                      {localizedNote(quantity.provenance.note, language)}
                    </span>
                  ) : null}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : !hasDirectDimensionEvidence ? (
        <p className="panel-empty" data-evidence-gap="ancient-dimension">
          {t("inspector.noAncient")}
        </p>
      ) : null}

      {sources.length > 0 ? (
        <div>
          <h4>{t("inspector.source")}</h4>
          {sources.map((source) => (
            <div
              data-source-id={source.id}
              id={`part-inspector-source-${source.id}`}
              key={source.id}
              tabIndex={-1}
            >
              {/* Explanation: Preserve the original primary quotation. */}
{/* Reason: Historical wording must remain available verbatim. */}
{/* <p className="panel-copy">{source.quote}</p> */}
{/* Explanation: Display the available bilingual source reading through the temporary layer. */}
{/* Reason: Requested translations must be checked against both existing source readings. */}
              <p className="panel-copy">{getTranslationState().target ? localize(source.translation || { zh: source.quote }, language) : source.quote}</p>
              <a
                className="panel-link"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                {t("inspector.openSource")}
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="panel-empty" data-evidence-gap="part-source">
          {t("inspector.noPartQuote")}
        </p>
      )}

      {partSchemes.length > 0 ? (
        <div>
          <h4>{t("inspector.reconstructionEvidence")}</h4>
          {partSchemes.map((scheme) => (
            <div
              className="panel-copy"
              data-part-scheme={scheme.id}
              key={scheme.id}
            >
              <strong>
                {(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// scheme.scholar[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(scheme.scholar, language)
)} · {scheme.year}
              </strong>
              <p>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// scheme.evidence[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(scheme.evidence, language)
)}</p>
              {scheme.critique ? <p>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// scheme.critique[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(scheme.critique, language)
)}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <h4>{t("inspector.controversies")}</h4>
        {controversies.length > 0 ? (
          controversies.map((controversy) => (
            <div className="panel-copy" key={controversy.topic.en}>
              <strong>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// controversy.topic[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(controversy.topic, language)
)}</strong>
              <p>{(
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
// controversy.detail[language]
// Explanation: Resolve the original bilingual text through the active translation session.
// Reason: Display validated target text or retain the original versions when validation is uncertain.
localize(controversy.detail, language)
)}</p>
            </div>
          ))
        ) : (
          <p className="panel-empty">{t("inspector.noControversies")}</p>
        )}
      </div>
      <MachineEvidenceRecord module={module} spec={spec} />
    </section>
  );
}
