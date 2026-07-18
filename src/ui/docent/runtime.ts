export type DocentProbeOutcome = "available" | "hidden" | "unavailable";

export function classifyDocentProbeResponse(
  response: Pick<Response, "ok" | "status">,
): DocentProbeOutcome {
  if (response.status === 503) return "hidden";
  return response.ok ? "available" : "unavailable";
}

export function docentMockEnabled(dev: boolean, e2e?: string): boolean {
  return dev || e2e === "1";
}
