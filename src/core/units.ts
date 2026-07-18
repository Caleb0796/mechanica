export const CHI_M = {
  song: 0.312,
  han: 0.231,
  hanmo: 0.242,
  yuan: 0.315,
} as const

export function chi(era: keyof typeof CHI_M, n: number): number {
  return CHI_M[era] * n
}
