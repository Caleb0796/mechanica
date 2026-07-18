export interface MockDocentOptions {
  unknownSourceId?: string;
}

export function createMockDocentReply(
  sourceId: string,
  lang: "zh" | "en",
  options: MockDocentOptions = {},
): string {
  const citedSourceId = options.unknownSourceId ?? sourceId;
  return lang === "zh"
    ? `这是基于当前机械馆藏资料的开发环境讲解。[来源:${citedSourceId}]`
    : `This development response is grounded in the current machine record. [来源:${citedSourceId}]`;
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
