import type { EscapementDef, SolveResult } from "./types";

export type EscapementPhase = "filling" | "release" | "locked";

export interface EscapementTick {
  advancedRad: number;
  phase: EscapementPhase;
  events: SolveResult["events"];
}

export class EscapementSim {
  private phase: EscapementPhase = "filling";
  private fillSeconds = 0;
  private eventTime = 0;
  private pendingEvents: SolveResult["events"] = [];

  constructor(private readonly definition: EscapementDef) {
    if (definition.fillSecondsPerScoop <= 0) {
      throw new Error("fillSecondsPerScoop must be positive");
    }
  }

  tick(dtSeconds: number): EscapementTick {
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) {
      throw new Error("dtSeconds must be a finite non-negative number");
    }

    const events: SolveResult["events"] = [];
    let advancedRad = 0;
    let remainingSeconds = dtSeconds;

    while (true) {
      if (this.phase === "filling") {
        const neededSeconds =
          this.definition.fillSecondsPerScoop - this.fillSeconds;
        if (remainingSeconds < neededSeconds) {
          this.fillSeconds += remainingSeconds;
          break;
        }
        remainingSeconds -= neededSeconds;
        this.fillSeconds = 0;
        this.phase = "release";
        events.push(this.makeEvent("filled", this.definition.wheel));
      } else if (this.phase === "release") {
        advancedRad += this.definition.stepRad;
        this.phase = "locked";
        events.push(
          this.makeEvent("release", this.definition.leverParts.tianguan),
          this.makeEvent("release", this.definition.leverParts.gecha),
          this.makeEvent("release", this.definition.leverParts.guanshe),
        );
      } else {
        this.phase = "filling";
        events.push(this.makeEvent("seat", this.definition.leverParts.tiansuoR));
        if (remainingSeconds === 0) break;
      }
    }

    this.pendingEvents.push(...events);
    return { advancedRad, phase: this.phase, events: [...events] };
  }

  forceStep(direction: 1 | -1): number {
    if (direction === -1) {
      this.pendingEvents.push(
        this.makeEvent("blocked", this.definition.leverParts.tiansuoR),
      );
      return 0;
    }
    this.pendingEvents.push(
      this.makeEvent("forced", this.definition.leverParts.tianguan),
    );
    return this.definition.stepRad;
  }

  drainEvents(): SolveResult["events"] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  lastEvents(): SolveResult["events"] {
    return [...this.pendingEvents];
  }

  private makeEvent(
    type: string,
    part: string,
  ): SolveResult["events"][number] {
    const event = { t: this.eventTime, type, part };
    this.eventTime += 1;
    return event;
  }
}
