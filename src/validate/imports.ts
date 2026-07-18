interface ImportErrorLike {
  code?: unknown
  message?: unknown
}

function errorRecord(error: unknown): ImportErrorLike {
  return error !== null && typeof error === 'object' ? error as ImportErrorLike : {}
}

export function importErrorMessage(error: unknown): string {
  const message = errorRecord(error).message
  return typeof message === 'string' && message.length > 0 ? message : String(error)
}

export function isMissingMachineBuild(error: unknown, slug: string): boolean {
  const item = errorRecord(error)
  const code = typeof item.code === 'string' ? item.code : ''
  const message = importErrorMessage(error).replaceAll('\\', '/')
  const firstLine = message.split('\n', 1)[0]
  const missingSubject = firstLine.split(' imported from ', 1)[0]
  const target = `/src/machines/${slug}/build.ts`
  const missingCode = code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND'
  const loaderMissing = firstLine.includes('Cannot find module')
    || firstLine.includes('Failed to load url')
    || firstLine.includes('does not exist')
  return (missingCode || loaderMissing) && missingSubject.includes(target)
}
