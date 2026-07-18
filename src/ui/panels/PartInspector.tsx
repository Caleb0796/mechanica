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

export default function PartInspector({ module, spec }: PartInspectorProps) {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage === "en" ? "en" : "zh";
  const selectedPartId = useUiStore((state) => state.selectedPartId);
  const part = spec.parts.find((candidate) => candidate.id === selectedPartId);

  if (!part) {
    return (
      <section className="panel" data-testid="part-inspector">
        <h2>{t("inspector.title")}</h2>
        <p className="panel-empty">{t("inspector.empty")}</p>
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
  ]);
  const sources = module.data.sources.filter((candidate) =>
    sourceRefs.has(candidate.id),
  );
  const dimensions = geometryDimensions(part);
  const controversies = module.data.controversies.filter((controversy) =>
    controversy.sourceIds.some((sourceId) => sourceRefs.has(sourceId)),
  );

  return (
    <section className="panel" data-testid="part-inspector">
      <h2>{t("inspector.title")}</h2>
      <h3 className="part-name">{part.name[language]}</h3>
      <span className="provenance-badge">
        {t(`inspector.${part.provenance.kind}`)} · {part.provenance.ref}
      </span>

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
                </small>
              </dd>
            </div>
          ))}
        </dl>
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
    </section>
  );
}
