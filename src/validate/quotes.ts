export function normalizeQuoteReceipt(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, '')
}
