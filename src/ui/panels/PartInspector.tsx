import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import type {
  MachineModule,
  MachineSpec,
  PartDef,
  Quantity,
} from "../../sim/types";
import { useUiStore } from "../store";

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

function geometryDimensions(part: PartDef) {
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
      label: path.startsWith("joint.") ? path : `${part.geometry.type}.${path}`,
      value: `${Number.isInteger(value) ? value : value.toFixed(3)} ${dimensionUnit(part, path)}`,
      provenance:
        part.dimensionProvenance[path] ?? part.dimensionProvenance["@rest"],
    }));
}

function referenceIds(reference: string): string[] {
  return reference
    .split("+")
    .map((item) => item.trim())
    .filter(Boolean);
}

const RECORD_COPY = {
  en: {
    basis: "Basis",
    controversies: "Machine-level controversies",
    dimensions: "Authoritative dimensions",
    engineering: "Engineering provenance",
    inventors: "Attributed makers",
    noAncient:
      "No direct ancient measurement survives for this part; its metric geometry is a reconstruction parameter.",
    noPartQuote:
      "No direct part-level quotation survives; use the machine evidence register for the reconstruction context.",
    schemes: "Reconstruction evidence",
    sources: "Complete source register",
    title: "Machine evidence register",
  },
  zh: {
    basis: "换算依据",
    controversies: "整机争议",
    dimensions: "权威尺寸",
    engineering: "工程证据",
    inventors: "记载人物",
    noAncient: "此部件没有传世古代尺寸；所示公制几何为复原参数。",
    noPartQuote: "此部件没有直接传世引文；请查阅整机证据档案了解复原依据。",
    schemes: "复原证据",
    sources: "完整文献目录",
    title: "整机证据档案",
  },
} as const;

function MachineEvidenceRecord({
  module,
  spec,
}: {
  module: MachineModule;
  spec: MachineSpec;
}) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const copy = RECORD_COPY[language];

  return (
    <details data-testid="machine-evidence-register">
      <summary className="panel-link">{copy.title}</summary>
      <p className="panel-copy">
        {module.data.era[language]} · {copy.inventors}:{" "}
        {module.data.inventors
          .map((inventor) => inventor[language])
          .join(" · ")}
      </p>
      <p className="panel-copy">{module.data.principle[language]}</p>

      <h3>{copy.dimensions}</h3>
      <dl className="record-list">
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
              <dt>{dimension.label[language]}</dt>
              <dd>
                {dimension.ancient} · {metric}
                <small>
                  {t(`inspector.${dimension.confidence}`)} · {copy.basis}:{" "}
                  <span data-evidence-text lang="zh">
                    {dimension.basis}
                  </span>
                  {source ? <> · {source.book}</> : null}
                </small>
              </dd>
            </div>
          );
        })}
      </dl>

      {module.data.schemes.length > 0 ? (
        <div>
          <h3>{copy.schemes}</h3>
          {module.data.schemes.map((scheme) => (
            <div
              className="panel-copy"
              data-machine-scheme={scheme.id}
              key={scheme.id}
            >
              <strong>
                {scheme.scholar[language]} · {scheme.year}
              </strong>
              <p>{scheme.evidence[language]}</p>
              {scheme.critique ? <p>{scheme.critique[language]}</p> : null}
              {module.schemes?.[scheme.id]?.notes ? (
                <p>{module.schemes[scheme.id].notes?.[language]}</p>
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
          <h3>{copy.engineering}</h3>
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
                        {constraint.provenance.kind} ·{" "}
                        {constraint.provenance.ref}
                        {constraint.provenance.note ? (
                          <small data-evidence-text>
                            {constraint.provenance.note}
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

      <h3>{copy.sources}</h3>
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
            <p className="panel-copy">{source.translation[language]}</p>
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
          <h3>{copy.controversies}</h3>
          {module.data.controversies.map((controversy) => (
            <div
              className="panel-copy"
              data-machine-controversy={controversy.topic.en}
              key={controversy.topic.en}
            >
              <strong>{controversy.topic[language]}</strong>
              <p>{controversy.detail[language]}</p>
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
  const dimensions = geometryDimensions(part);
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
      <h3 className="part-name">{part.name[language]}</h3>
      <span className="provenance-badge">
        {t(`inspector.${part.provenance.kind}`)} · {part.provenance.ref}
      </span>
      {part.provenance.note ? (
        <p className="panel-copy" data-evidence-text>
          {part.provenance.note}
        </p>
      ) : null}

      {dimensions.length > 0 ? (
        <dl className="record-list">
          {dimensions.map((dimension) => (
            <div key={dimension.label}>
              <dt>{dimension.label}</dt>
              <dd>
                {dimension.value}
                {dimension.provenance ? (
                  <small>
                    {t(`inspector.${dimension.provenance.kind}`)} ·{" "}
                    {dimension.provenance.ref}
                    {dimension.provenance.note ? (
                      <span data-evidence-text>
                        {" "}
                        · {dimension.provenance.note}
                      </span>
                    ) : null}
                  </small>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {part.dimensionNotes && part.dimensionNotes.length > 0 ? (
        <dl className="record-list">
          {part.dimensionNotes.map((quantity, index) => (
            <div key={`${quantity.provenance.ref}-${index}`}>
              <dt>{t("inspector.dimensions")}</dt>
              <dd>
                {quantity.ancient ? `${quantity.ancient} · ` : ""}
                {metricLabel(quantity)}
                <small>
                  {t(`inspector.${quantity.provenance.kind}`)} ·{" "}
                  {quantity.provenance.ref}
                  {quantity.provenance.note ? (
                    <span data-evidence-text>
                      {" "}
                      · {quantity.provenance.note}
                    </span>
                  ) : null}
                </small>
              </dd>
            </div>
          ))}
        </dl>
      ) : !hasDirectDimensionEvidence ? (
        <p className="panel-empty" data-evidence-gap="ancient-dimension">
          {RECORD_COPY[language].noAncient}
        </p>
      ) : null}

      {sources.length > 0 ? (
        <div>
          <h2>{t("inspector.source")}</h2>
          {sources.map((source) => (
            <div
              data-source-id={source.id}
              id={`part-inspector-source-${source.id}`}
              key={source.id}
              tabIndex={-1}
            >
              <p className="panel-copy">{source.quote}</p>
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
          {RECORD_COPY[language].noPartQuote}
        </p>
      )}

      {partSchemes.length > 0 ? (
        <div>
          <h2>{RECORD_COPY[language].schemes}</h2>
          {partSchemes.map((scheme) => (
            <div
              className="panel-copy"
              data-part-scheme={scheme.id}
              key={scheme.id}
            >
              <strong>
                {scheme.scholar[language]} · {scheme.year}
              </strong>
              <p>{scheme.evidence[language]}</p>
              {scheme.critique ? <p>{scheme.critique[language]}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <h2>{t("inspector.controversies")}</h2>
        {controversies.length > 0 ? (
          controversies.map((controversy) => (
            <div className="panel-copy" key={controversy.topic.en}>
              <strong>{controversy.topic[language]}</strong>
              <p>{controversy.detail[language]}</p>
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
