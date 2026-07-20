import i18n from "../i18n";

export interface MockDocentOptions {
  unknownSourceId?: string;
}

export function createMockDocentReply(
  sourceId: string,
  lang: "zh" | "en",
  options: MockDocentOptions = {},
): string {
  const citedSourceId = options.unknownSourceId ?? sourceId;
  const t = i18n.getFixedT(lang);
  return t("docent.mockDevelopment", {
    cite: citedSourceId,
  });
}

export async function* streamMockDocentReply(
  sourceId: string,
  lang: "zh" | "en",
  options: MockDocentOptions = {},
): AsyncGenerator<string> {
  const reply = createMockDocentReply(sourceId, lang, options);
  for (let offset = 0; offset < reply.length; offset += 8) {
    await Promise.resolve();
    yield reply.slice(offset, offset + 8);
  }
}

export function probeMockDocent(): true {
  return true;
}
