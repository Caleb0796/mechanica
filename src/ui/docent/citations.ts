import type { PartDef } from "../../sim/types";

export interface DocentTextSegment {
  kind: "text";
  text: string;
}

export interface DocentCitationSegment {
  kind: "citation";
  sourceId: string;
  marker: string;
}

export type DocentCitationParseResult = {
  segments: Array<DocentTextSegment | DocentCitationSegment>;
  unknownSourceIds: string[];
};

const CITATION_PATTERN = /\[来源:([^\]\s]+)\]/gu;

function referencesSource(reference: string, sourceId: string): boolean {
  return reference
    .split("+")
    .some((candidate) => candidate.trim() === sourceId);
}

export function partIdForDocentSource(
  parts: readonly PartDef[],
  sourceId: string,
): string | null {
  const primary = parts.find((part) =>
    referencesSource(part.provenance.ref, sourceId),
  );
  if (primary) return primary.id;
  return (
    parts.find(
      (part) =>
        Object.values(part.dimensionProvenance).some((provenance) =>
          referencesSource(provenance.ref, sourceId),
        ) ||
        (part.dimensionNotes ?? []).some((quantity) =>
          referencesSource(quantity.provenance.ref, sourceId),
        ),
    )?.id ?? null
  );
}

export function parseDocentCitations(
  text: string,
  knownSourceIds: ReadonlySet<string>,
): DocentCitationParseResult {
  const segments: Array<DocentTextSegment | DocentCitationSegment> = [];
  const unknownSourceIds: string[] = [];
  let offset = 0;

  for (const match of text.matchAll(CITATION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > offset) {
      segments.push({ kind: "text", text: text.slice(offset, index) });
    }
    const marker = match[0];
    const sourceId = match[1];
    if (knownSourceIds.has(sourceId)) {
      segments.push({ kind: "citation", sourceId, marker });
    } else {
      segments.push({ kind: "text", text: marker });
      if (!unknownSourceIds.includes(sourceId)) unknownSourceIds.push(sourceId);
    }
    offset = index + marker.length;
  }

  if (offset < text.length) {
    segments.push({ kind: "text", text: text.slice(offset) });
  }
  return { segments, unknownSourceIds };
}
