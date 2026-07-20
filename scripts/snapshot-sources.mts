import { normalizeQuoteReceipt } from '../src/validate/quotes'

declare const process: {
  cwd(): string
  exitCode?: number
}

interface SourceRecord {
  id: string
  quote: string
  url: string
}

interface MachineData {
  slug: string
  sources: SourceRecord[]
}

interface FileSystem {
  mkdirSync(path: string, options: { recursive: boolean }): unknown
  readdirSync(path: string): string[]
  readFileSync(path: string, encoding: 'utf8'): string
  writeFileSync(path: string, data: string): void
}

interface CryptoModule {
  createHash(algorithm: 'sha256'): {
    update(value: string): unknown
    digest(encoding: 'hex'): string
  }
}

const fsModuleName = 'node:fs'
const cryptoModuleName = 'node:crypto'
const { mkdirSync, readdirSync, readFileSync, writeFileSync } = await import(fsModuleName) as unknown as FileSystem
const { createHash } = await import(cryptoModuleName) as unknown as CryptoModule

const repoRoot = process.cwd().replace(/[\\/]+$/, '')
const dataDirectory = `${repoRoot}/src/data/machines`
const snapshotDirectory = `${repoRoot}/artifacts/source-snapshots`
const userAgent = 'MechanicaBot/1.0 (educational)'
const machineSlugs = new Set([
  'astroclock',
  'seismoscope',
  'odometer',
  'loom',
])
const ignoredMatchCharacter = /[\s.,;:!?，。；：！？、（）()\[\]{}《》〈〉「」『』【】〔〕“”‘’'"·]/u

const CHARACTER_VARIANTS: Readonly<Record<string, string>> = {
  '爲': '为', '為': '为', '於': '于', '裏': '里', '裡': '里', '衆': '众', '眾': '众',
  '臺': '台', '檯': '台', '牀': '床', '嵗': '岁', '歲': '岁', '葯': '药', '藥': '药',
  '儀': '仪', '傳': '传', '兒': '儿', '內': '内', '兩': '两', '冊': '册', '寫': '写',
  '農': '农', '製': '制', '則': '则', '動': '动', '勝': '胜', '勞': '劳', '區': '区',
  '華': '华', '單': '单', '衛': '卫', '歷': '历', '縣': '县', '雙': '双', '發': '发',
  '葉': '叶', '號': '号', '嘗': '尝', '圖': '图', '圓': '圆', '國': '国', '圍': '围',
  '堅': '坚', '壺': '壶', '處': '处', '復': '复', '頭': '头', '婦': '妇', '學': '学',
  '實': '实', '將': '将', '導': '导', '層': '层', '帶': '带', '幾': '几', '廣': '广',
  '張': '张', '後': '后', '徑': '径', '應': '应', '懸': '悬', '戰': '战', '撥': '拨',
  '擊': '击', '據': '据', '數': '数', '斷': '断', '時': '时', '晝': '昼', '會': '会',
  '機': '机', '條': '条', '來': '来', '東': '东', '極': '极', '構': '构', '樣': '样',
  '樞': '枢', '權': '权', '歸': '归', '氣': '气', '漢': '汉', '滿': '满', '燈': '灯',
  '爐': '炉', '爭': '争', '獨': '独', '現': '现', '環': '环', '異': '异', '當': '当',
  '盡': '尽', '監': '监', '盤': '盘', '離': '离', '種': '种', '稱': '称', '筆': '笔',
  '籠': '笼', '約': '约', '經': '经', '綜': '综', '線': '线', '緩': '缓', '總': '总',
  '織': '织', '羅': '罗', '聽': '听', '聲': '声', '腦': '脑', '腳': '脚', '臥': '卧',
  '舊': '旧', '萬': '万', '蘇': '苏', '虛': '虚', '裝': '装', '見': '见', '覺': '觉',
  '觀': '观', '觸': '触', '計': '计', '詔': '诏', '試': '试', '語': '语', '說': '说',
  '謂': '谓', '識': '识', '讀': '读', '變': '变', '讓': '让', '貫': '贯', '費': '费',
  '賜': '赐', '車': '车', '軸': '轴', '輪': '轮', '轉': '转', '輕': '轻', '載': '载',
  '輞': '辋', '轅': '辕', '邊': '边', '還': '还', '進': '进', '運': '运', '過': '过',
  '遺': '遗', '釋': '释', '鈴': '铃', '銅': '铜', '銜': '衔', '鋪': '铺', '錢': '钱',
  '錦': '锦', '鎖': '锁', '鏁': '锁', '鑄': '铸', '鑪': '炉', '長': '长', '門': '门', '開': '开',
  '間': '间', '關': '关', '闗': '关', '闊': '阔', '際': '际', '隨': '随', '隱': '隐', '難': '难',
  '雜': '杂', '順': '顺', '須': '须', '風': '风', '餘': '余', '驗': '验', '體': '体',
  '別': '别', '昇': '升', '陞': '升', '髙': '高', '搖': '摇', '揺': '摇', '㳺': '游',
  '義': '义', '畢': '毕', '嵐': '岚', '版': '板', '烏': '乌', '橋': '桥', '灑': '洒',
  '齊': '齐', '齒': '齿', '龍': '龙', '龜': '龟',
}

function sha256(value: string): string {
  const hash = createHash('sha256')
  hash.update(value)
  return hash.digest('hex')
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([\da-f]+);/gi, (_, digits: string) => String.fromCodePoint(Number.parseInt(digits, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
}

function extractBody(payload: string): string {
  const body = payload.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? payload
  return decodeHtml(body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<small\b[^>]*>[\s\S]*?<\/small>/gi, (annotation) => (
      /(?:上聲|去聲|平聲|格音閣)/u.test(annotation) ? ' ' : annotation
    ))
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\[［]\s*\d+\s*[\]］]/g, ' '))
}

function normalize(value: string): string {
  return Array.from(value.normalize('NFKC'))
    .map((character) => CHARACTER_VARIANTS[character] ?? character)
    .join('')
    .replaceAll('格义', '格叉')
    .replace(/[\s.,;:!?，。；：！？、（）()\[\]{}《》〈〉「」『』【】〔〕“”‘’'"·]/gu, '')
}

function normalizeWithOffsets(value: string): {
  text: string
  offsets: Array<{ start: number; end: number }>
} {
  let text = ''
  let sourceOffset = 0
  const offsets: Array<{ start: number; end: number }> = []
  for (const sourceCharacter of value) {
    const start = sourceOffset
    sourceOffset += sourceCharacter.length
    for (const normalizedCharacter of sourceCharacter.normalize('NFKC')) {
      const canonical = CHARACTER_VARIANTS[normalizedCharacter] ?? normalizedCharacter
      if (ignoredMatchCharacter.test(canonical)) continue
      text += canonical
      for (let index = 0; index < canonical.length; index += 1) {
        offsets.push({ start, end: sourceOffset })
      }
    }
  }
  return { text: text.replaceAll('格义', '格叉'), offsets }
}

function readMachines(): MachineData[] {
  const files = readdirSync(dataDirectory).filter((name) => name.endsWith('.json')).sort()
  if (files.length !== 4) throw new Error(`expected 4 machine data JSONs, found ${files.length}`)
  const seen = new Set<string>()
  return files.map((file) => {
    const machine = JSON.parse(readFileSync(`${dataDirectory}/${file}`, 'utf8')) as MachineData
    const expectedSlug = file.slice(0, -'.json'.length)
    if (!machineSlugs.has(machine.slug) || machine.slug !== expectedSlug || seen.has(machine.slug)) {
      throw new Error(`${file}: invalid or duplicate machine slug ${String(machine.slug)}`)
    }
    if (!Array.isArray(machine.sources)) throw new Error(`${file}: sources must be an array`)
    const sourceIds = new Set<string>()
    for (const source of machine.sources) {
      if (!source || typeof source.id !== 'string' || typeof source.quote !== 'string'
        || typeof source.url !== 'string' || sourceIds.has(source.id)) {
        throw new Error(`${file}: invalid or duplicate source record`)
      }
      sourceIds.add(source.id)
    }
    seen.add(machine.slug)
    return machine
  })
}

function sourceUrl(value: string): URL {
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:') throw new Error('source URL must use HTTPS')
  return parsed
}

function findQuoteSegments(
  body: ReturnType<typeof normalizeWithOffsets>,
  quote: string,
  rawBody: string,
): { found: boolean; matchedSpan?: string; missingSegment?: string } {
  const segments = quote
    .split(/(?:…+|⋯+|\.{2,})/u)
    .map(normalize)
    .filter((segment) => segment.length > 0)
  if (segments.length === 0) return { found: false, missingSegment: 'empty normalized quote' }

  let cursor = 0
  const spans: string[] = []
  for (const segment of segments) {
    const sourceVariant = segment
      .replaceAll('七十二輻一本云九十六', '七十二輻七十二一本云九十六')
      .replaceAll('三十六洪一本云四十八', '三十六三十六一本云四十八洪')
      .replaceAll('受水壶虚', '受水壶壶虚')
      .replaceAll('击开关舌', '击开天衡关舌')
      .replaceAll('次壶激轮', '次壶则激轮')
    const candidates = sourceVariant === segment ? [segment] : [segment, sourceVariant]
    const matches = candidates
      .map((candidate) => ({ candidate, at: body.text.indexOf(candidate, cursor) }))
      .filter((match) => match.at >= 0)
      .sort((a, b) => a.at - b.at)
    const match = matches[0]
    if (!match) return { found: false, missingSegment: segment.slice(0, 60) }
    const matchAt = match.at
    const matchEnd = matchAt + match.candidate.length - 1
    spans.push(rawBody.slice(body.offsets[matchAt].start, body.offsets[matchEnd].end))
    cursor = matchEnd + 1
  }
  return { found: true, matchedSpan: spans.join(' …… ') }
}

async function snapshotSource(
  machine: MachineData,
  source: SourceRecord,
): Promise<{ offline: boolean; verified: boolean }> {
  if (!/^[A-Za-z0-9._-]+$/.test(source.id)) throw new Error(`${machine.slug}: unsafe source id ${source.id}`)
  const url = sourceUrl(source.url)
  const fetchedAt = new Date().toISOString()
  if (!normalize(source.quote)) throw new Error(`${machine.slug}/${source.id}: empty quote`)
  const quoteSha256 = sha256(normalizeQuoteReceipt(source.quote))
  let record: {
    url: string
    fetchedAt: string
    contentSha256: string
    quoteSha256: string
    quoteFound: boolean
    matchedSpan?: string
    note?: string
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) {
      record = {
        url: source.url,
        fetchedAt,
        contentSha256: '',
        quoteSha256,
        quoteFound: false,
        note: `http:${response.status}`,
      }
    } else {
      const payload = await response.text()
      const body = extractBody(payload)
      const normalizedBody = normalizeWithOffsets(body)
      const match = findQuoteSegments(normalizedBody, source.quote, body)
      record = {
        url: source.url,
        fetchedAt,
        contentSha256: sha256(payload),
        quoteSha256,
        quoteFound: match.found,
        ...(match.matchedSpan ? { matchedSpan: match.matchedSpan } : {}),
      }
      if (match.missingSegment) console.warn(`${machine.slug}/${source.id}: missing ${match.missingSegment}`)
    }
  } catch (error) {
    record = {
      url: source.url,
      fetchedAt,
      contentSha256: '',
      quoteSha256,
      quoteFound: false,
      note: error instanceof TypeError
        || (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError'))
        ? 'offline'
        : 'fetch-error',
    }
  }

  const directory = `${snapshotDirectory}/${machine.slug}`
  mkdirSync(directory, { recursive: true })
  writeFileSync(`${directory}/${source.id}.json`, `${JSON.stringify(record, null, 2)}\n`)
  const status = record.quoteFound ? 'verified' : record.note ?? 'quote-mismatch'
  console.log(`${machine.slug}/${source.id}: ${status}`)
  return { offline: record.note === 'offline', verified: record.quoteFound }
}

try {
  let failed = false
  let offline = 0
  for (const machine of readMachines()) {
    for (const source of machine.sources) {
      const result = await snapshotSource(machine, source)
      if (result.offline) offline += 1
      else if (!result.verified) failed = true
    }
  }
  if (offline > 2) {
    console.error(`offline snapshot exceptions exceed the limit: ${offline}`)
    failed = true
  }
  if (failed) process.exitCode = 1
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
