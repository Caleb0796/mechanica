import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

const repoRoot = process.cwd()
const dataDirectory = join(repoRoot, 'src/data/machines')
const museumDirectory = join(repoRoot, 'public/assets/museum')
const creditsPath = join(repoRoot, 'public/assets/IMAGE_CREDITS.json')
const failurePath = join(repoRoot, 'reports/image-fetch-failures.json')
const userAgent = 'MechanicaBot/1.0 (educational)'
const minimumRequestIntervalMs = 750
const downloadableLicenses = new Set(['CC0', 'PD', 'CC-BY', 'CC-BY-SA'])
const attributionLicenses = new Set(['CC-BY', 'CC-BY-SA'])
const widths = [1600, 1280, 1024, 800, 640, 480, 320, 240, 160]
const maxBytes = 300 * 1024
const maxTotalBytes = 25 * 1024 * 1024
const machineSlugs = new Set([
  'astroclock',
  'seismoscope',
  'chariot',
  'odometer',
  'wooden-ox',
  'loom',
  'typecase',
  'chainpump',
  'bellows',
  'gimbal',
])
const rasterExtensions = ['jpg', 'png', 'webp']
let lastRequestAt = 0

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function politeFetch(url) {
  const wait = Math.max(0, minimumRequestIntervalMs - (Date.now() - lastRequestAt))
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  return fetch(url, {
    headers: { 'User-Agent': userAgent },
    signal: AbortSignal.timeout(30_000),
  })
}

async function fetchWithRetries(url) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let retryDelay = 400 * (attempt + 1)
    try {
      const response = await politeFetch(url)
      if (response.ok) return response
      if (response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}`)
      }
      const retryAfter = Number(response.headers.get('retry-after'))
      if (response.status === 429 && Number.isFinite(retryAfter)) {
        retryDelay = Math.max(retryDelay, retryAfter * 1000)
      }
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    if (attempt < 2) await sleep(Math.min(retryDelay, 30_000))
  }
  throw lastError ?? new Error('request failed')
}

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([\da-f]+);/gi, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
}

function stripHtml(value) {
  return decodeHtml(String(value ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function machineFiles() {
  const files = readdirSync(dataDirectory).filter((name) => name.endsWith('.json')).sort()
  if (files.length !== 10) throw new Error(`expected 10 machine data JSONs, found ${files.length}`)
  return files
}

function commonsFileName(sourceUrl) {
  const shorthand = String(sourceUrl).match(/^File:(.+)$/i)
  if (shorthand) return decodeURIComponent(shorthand[1]).replaceAll('_', ' ')
  let parsed
  try {
    parsed = new URL(sourceUrl)
  } catch {
    throw new Error('sourceUrl is not a Commons File page')
  }
  if (parsed.protocol !== 'https:' || !/(^|\.)commons\.wikimedia\.org$/i.test(parsed.hostname)) {
    throw new Error('sourceUrl is not on Wikimedia Commons')
  }
  const title = parsed.searchParams.get('title')
  if (title?.startsWith('File:')) return decodeURIComponent(title.slice(5)).replaceAll('_', ' ')
  const match = decodeURIComponent(parsed.pathname).match(/\/wiki\/(?:File:|Special:FilePath\/)(.+)$/i)
  if (!match) throw new Error('sourceUrl has no Commons file name')
  return match[1].replaceAll('_', ' ')
}

function commonsPageUrl(fileName) {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName).replaceAll('%20', '_')}`
}

function normalizeLicense(value) {
  const normalized = stripHtml(value).toUpperCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ')
  if (/(?:^|[- ])(?:NC|ND)(?:[- .]|$)/.test(normalized)
    || normalized.includes('NONCOMMERCIAL')
    || normalized.includes('NO DERIVATIVES')) return null
  if (/^(?:CC0|CREATIVE COMMONS ZERO)(?: \d+(?:\.\d+)?)?$/.test(normalized)) return 'CC0'
  if (/^(?:PUBLIC DOMAIN|PD)(?: MARK)?(?: \d+(?:\.\d+)?)?$/.test(normalized)) return 'PD'
  if (/^(?:CC BY-SA|ATTRIBUTION-SHAREALIKE)(?: \d+(?:\.\d+)?)?$/.test(normalized)) return 'CC-BY-SA'
  if (/^(?:CC BY|ATTRIBUTION)(?: \d+(?:\.\d+)?)?$/.test(normalized)) return 'CC-BY'
  return null
}

function metadataValue(metadata, key) {
  return stripHtml(metadata?.[key]?.value)
}

function normalizedLicenseUrl(value) {
  const stripped = stripHtml(value)
  return stripped.startsWith('//') ? `https:${stripped}` : stripped
}

async function fetchMetadata(fileName) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('titles', `File:${fileName}`)
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|extmetadata')
  url.searchParams.set('format', 'json')
  const response = await fetchWithRetries(url.href)
  const payload = await response.json()
  const page = Object.values(payload?.query?.pages ?? {})[0]
  const info = page?.imageinfo?.[0]
  if (!info) throw new Error('Commons API returned no image metadata')
  const metadata = info.extmetadata ?? {}
  const author = metadataValue(metadata, 'Artist')
  const licenseName = metadataValue(metadata, 'LicenseShortName')
  const license = normalizeLicense(licenseName)
  const licenseUrl = normalizedLicenseUrl(metadataValue(metadata, 'LicenseUrl'))
  const apiAttribution = metadataValue(metadata, 'Attribution')
  const attributionText = apiAttribution || (
    author && licenseName ? `${author}, ${licenseName}, via Wikimedia Commons` : ''
  )
  return { author, license, licenseName, licenseUrl, attributionText }
}

function rasterExtension(contentType, bytes) {
  const mime = contentType.split(';', 1)[0].trim().toLowerCase()
  if (mime === 'image/jpeg'
    && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (mime === 'image/png'
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'png'
  if (mime === 'image/webp'
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'webp'
  return null
}

async function downloadThumbnail(fileName) {
  let lastReason = 'no thumbnail met the size limit'
  for (const width of widths) {
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`
    try {
      const response = await fetchWithRetries(url)
      const bytes = new Uint8Array(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') ?? ''
      const extension = rasterExtension(contentType, bytes)
      if (!extension) throw new Error(`unsupported or invalid raster ${contentType || 'unknown'}`)
      if (bytes.byteLength <= maxBytes) return { bytes, extension, width }
      lastReason = `${bytes.byteLength} bytes at width ${width}`
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error)
    }
  }
  throw new Error(lastReason)
}

function assetPaths(directory, index) {
  return rasterExtensions.map((extension) => join(directory, `${index + 1}.${extension}`))
}

function clearLocalFields(image, directory, index) {
  for (const outputPath of assetPaths(directory, index)) {
    if (existsSync(outputPath)) unlinkSync(outputPath)
  }
  delete image.file
  delete image.author
  delete image.licenseUrl
  delete image.attributionText
}

function downgradeToLinkout(image, fileName, directory, index) {
  clearLocalFields(image, directory, index)
  image.license = 'linkout'
  image.hotlink = commonsPageUrl(fileName)
}

function failure(failures, slug, index, image, stage, reason, action) {
  failures.push({
    slug,
    image: index + 1,
    title: String(image.title ?? ''),
    stage,
    reason: String(reason).slice(0, 300),
    action,
  })
}

function existingAsset(image, directory, index) {
  if (typeof image.file !== 'string') return null
  const expectedPaths = assetPaths(directory, index)
  const absolutePath = join(repoRoot, image.file)
  if (!expectedPaths.includes(absolutePath) || !existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null
  }
  const size = statSync(absolutePath).size
  if (size > maxBytes) return null
  const extension = image.file.slice(image.file.lastIndexOf('.') + 1)
  const contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`
  const bytes = new Uint8Array(readFileSync(absolutePath))
  if (rasterExtension(contentType, bytes) !== extension) return null
  if (attributionLicenses.has(image.license)
    && (!image.author || !image.licenseUrl || !image.attributionText)) return null
  return { file: image.file, size }
}

function addCredit(credits, image) {
  if (!image.file) throw new Error('cannot credit an image without a local file')
  credits.push({
    file: image.file,
    title: image.title,
    author: image.author ?? '',
    sourceUrl: image.sourceUrl,
    license: image.license,
    licenseUrl: image.licenseUrl ?? '',
    attributionText: image.attributionText ?? '',
  })
}

function generatedAssetFiles() {
  const files = []
  if (!existsSync(museumDirectory)) return files
  for (const slug of readdirSync(museumDirectory)) {
    const directory = join(museumDirectory, slug)
    if (slug === '.gitkeep' && statSync(directory).isFile()) continue
    if (!statSync(directory).isDirectory() || !machineSlugs.has(slug)) {
      throw new Error(`unexpected entry under public/assets/museum: ${slug}`)
    }
    for (const name of readdirSync(directory)) {
      const path = join(directory, name)
      if (!statSync(path).isFile() || !/^\d+\.(?:jpg|png|webp)$/.test(name)) {
        throw new Error(`unexpected generated asset path: public/assets/museum/${slug}/${name}`)
      }
      files.push(`public/assets/museum/${slug}/${name}`)
    }
  }
  return files.sort()
}

async function main() {
  const failures = []
  const credits = []
  const seenSlugs = new Set()
  let totalBytes = 0
  let budgetBlocked = false
  for (const file of machineFiles()) {
    const dataPath = join(dataDirectory, file)
    const data = JSON.parse(readFileSync(dataPath, 'utf8'))
    const expectedSlug = file.slice(0, -'.json'.length)
    if (typeof data.slug !== 'string' || !Array.isArray(data.images)) throw new Error(`${file}: invalid machine data`)
    if (!machineSlugs.has(data.slug) || data.slug !== expectedSlug || seenSlugs.has(data.slug)) {
      throw new Error(`${file}: invalid or duplicate machine slug ${String(data.slug)}`)
    }
    seenSlugs.add(data.slug)
    const directory = join(museumDirectory, data.slug)
    mkdirSync(directory, { recursive: true })

    for (const [index, image] of data.images.entries()) {
      if (image.license === 'linkout') {
        clearLocalFields(image, directory, index)
        continue
      }
      if (!downloadableLicenses.has(image.license)) {
        failure(failures, data.slug, index, image, 'manifest', `unsupported declared license ${image.license}`, 'skipped')
        clearLocalFields(image, directory, index)
        continue
      }
      const retainedAsset = existingAsset(image, directory, index)

      let fileName
      try {
        fileName = commonsFileName(image.sourceUrl)
      } catch (error) {
        failure(failures, data.slug, index, image, 'source', error instanceof Error ? error.message : String(error), 'skipped')
        clearLocalFields(image, directory, index)
        continue
      }

      let metadata
      try {
        metadata = await fetchMetadata(fileName)
        if (!metadata.license) {
          failure(failures, data.slug, index, image, 'license', `unsupported API license ${metadata.licenseName || 'unknown'}`, 'downgraded to linkout')
          downgradeToLinkout(image, fileName, directory, index)
          continue
        }
        if (metadata.license !== image.license) {
          console.warn(`${data.slug} image ${index + 1}: declared ${image.license}, Commons reports ${metadata.license}; trusting Commons`)
          image.license = metadata.license
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        if (attributionLicenses.has(image.license)) {
          failure(failures, data.slug, index, image, 'attribution', reason, 'downgraded to linkout')
          downgradeToLinkout(image, fileName, directory, index)
          continue
        }
        failure(failures, data.slug, index, image, 'attribution', reason, 'continued with declared CC0/PD license')
      }

      if (metadata && attributionLicenses.has(image.license)
        && (!metadata.author || !metadata.licenseUrl || !metadata.attributionText)) {
        failure(failures, data.slug, index, image, 'attribution', 'Commons metadata lacks required attribution fields', 'downgraded to linkout')
        downgradeToLinkout(image, fileName, directory, index)
        continue
      }

      if (retainedAsset && image.file === retainedAsset.file && existsSync(join(repoRoot, retainedAsset.file))) {
        if (totalBytes + retainedAsset.size > maxTotalBytes) budgetBlocked = true
        totalBytes += retainedAsset.size
        if (metadata?.author) image.author = metadata.author
        if (metadata?.licenseUrl) image.licenseUrl = metadata.licenseUrl
        if (metadata?.attributionText) image.attributionText = metadata.attributionText
        addCredit(credits, image)
        console.log(`${data.slug} image ${index + 1}: retained ${retainedAsset.size} bytes`)
        continue
      }

      try {
        const thumbnail = await downloadThumbnail(fileName)
        if (totalBytes + thumbnail.bytes.byteLength > maxTotalBytes) {
          budgetBlocked = true
          throw new Error('25 MB aggregate asset budget would be exceeded')
        }
        clearLocalFields(image, directory, index)
        const outputPath = join(directory, `${index + 1}.${thumbnail.extension}`)
        writeFileSync(outputPath, thumbnail.bytes)
        totalBytes += thumbnail.bytes.byteLength
        image.file = `public/assets/museum/${data.slug}/${index + 1}.${thumbnail.extension}`
        delete image.hotlink
        if (metadata?.author) image.author = metadata.author
        if (metadata?.licenseUrl) image.licenseUrl = metadata.licenseUrl
        if (metadata?.attributionText) image.attributionText = metadata.attributionText
        addCredit(credits, image)
        console.log(`${data.slug} image ${index + 1}: ${thumbnail.bytes.byteLength} bytes at width ${thumbnail.width}`)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        failure(failures, data.slug, index, image, 'download', reason, 'render fallback')
        clearLocalFields(image, directory, index)
      }
    }
    writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`)
  }

  credits.sort((left, right) => left.file.localeCompare(right.file))
  const creditedFiles = new Set(credits.map((credit) => credit.file))
  if (creditedFiles.size !== credits.length) throw new Error('duplicate image credit paths')
  const generatedFiles = generatedAssetFiles()
  if (generatedFiles.length !== creditedFiles.size
    || generatedFiles.some((file) => !creditedFiles.has(file))) {
    throw new Error('generated image files and credits are not one-to-one')
  }
  const generatedBytes = generatedFiles.reduce(
    (sum, file) => sum + statSync(join(repoRoot, file)).size,
    0,
  )
  if (generatedBytes !== totalBytes) throw new Error('generated image byte accounting mismatch')
  if (generatedBytes > maxTotalBytes) throw new Error('25 MB aggregate asset budget exceeded')
  mkdirSync(join(repoRoot, 'public/assets'), { recursive: true })
  writeFileSync(creditsPath, `${JSON.stringify(credits, null, 2)}\n`)
  mkdirSync(join(repoRoot, 'reports'), { recursive: true })
  writeFileSync(failurePath, `${JSON.stringify({ generatedAt: new Date().toISOString(), failures }, null, 2)}\n`)
  if (failures.length > 0) console.warn(`${failures.length} image pipeline issue(s); see reports/image-fetch-failures.json`)
  if (budgetBlocked) throw new Error('25 MB aggregate asset budget prevented one or more downloads')
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
