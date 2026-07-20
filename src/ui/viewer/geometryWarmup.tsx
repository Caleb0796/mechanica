import { useCallback, useEffect, useRef, useState } from "react";

import {
  type GeometryWarmupController,
  warmMachine,
} from "../../core/geometryWarmup";
import type { MachineModule, MachineSpec } from "../../sim/types";

export type MachineGeometryWarmupStatus =
  "idle" | "warming" | "prepared" | "committed" | "failed";

export interface MachineGeometryWarmupState {
  built: number;
  committedAt: number | null;
  error: unknown;
  key: string;
  preparedAt: number | null;
  startedAt: number | null;
  status: MachineGeometryWarmupStatus;
  total: number;
}

export interface MachineGeometryWarmup extends MachineGeometryWarmupState {
  commit: (committedAt?: number) => void;
  prepared: boolean;
}

interface ActiveWarmup {
  committed: boolean;
  completed: boolean;
  controller: GeometryWarmupController;
  key: string;
  spec: MachineSpec;
}

interface StoredMachineGeometryWarmupState extends MachineGeometryWarmupState {
  targetSpec: MachineSpec | null;
}

function mark(name: string, key: string): void {
  performance.mark(`mechanica:geometry:${name}:${key}`);
}

function pendingState(
  key: string,
  spec: MachineSpec | null,
): StoredMachineGeometryWarmupState {
  return {
    built: 0,
    committedAt: null,
    error: null,
    key,
    preparedAt: null,
    startedAt: null,
    status: spec ? "warming" : "idle",
    targetSpec: spec,
    total: spec?.parts.length ?? 0,
  };
}

export function useMachineGeometryWarmup({
  consumerScope,
  module,
  spec,
  warmupKey,
}: {
  consumerScope: string;
  module: MachineModule;
  spec: MachineSpec | null;
  warmupKey: string;
}): MachineGeometryWarmup {
  const key = `${consumerScope}:${warmupKey}`;
  const activeWarmup = useRef<ActiveWarmup | null>(null);
  const [storedState, setStoredState] =
    useState<StoredMachineGeometryWarmupState>(() => pendingState(key, spec));
  const state =
    storedState.key === key && storedState.targetSpec === spec
      ? storedState
      : pendingState(key, spec);

  useEffect(() => {
    if (!spec) {
      activeWarmup.current = null;
      setStoredState(pendingState(key, null));
      return;
    }

    let active = true;
    const startedAt = performance.now();
    setStoredState({
      ...pendingState(key, spec),
      startedAt,
    });
    mark("start", key);
    const controller = warmMachine(
      module,
      spec,
      ({ built, total }) => {
        if (!active) return;
        setStoredState((current) =>
          current.key === key && current.targetSpec === spec
            ? { ...current, built, total }
            : {
                ...pendingState(key, spec),
                built,
                startedAt,
                total,
              },
        );
      },
      {
        consumerScope,
      },
    );
    const run: ActiveWarmup = {
      committed: false,
      completed: false,
      controller,
      key,
      spec,
    };
    activeWarmup.current = run;

    void controller.done.then(
      (result) => {
        if (
          !active ||
          result.status !== "completed" ||
          activeWarmup.current !== run
        ) {
          return;
        }
        run.completed = true;
        const preparedAt = performance.now();
        mark("prepared", key);
        setStoredState((current) =>
          current.key === key && current.targetSpec === spec
            ? {
                ...current,
                built: result.built,
                preparedAt,
                status: "prepared",
                total: result.total,
              }
            : current,
        );
      },
      (error: unknown) => {
        if (!active || activeWarmup.current !== run) return;
        setStoredState((current) =>
          current.key === key && current.targetSpec === spec
            ? { ...current, error, status: "failed" }
            : current,
        );
      },
    );

    return () => {
      active = false;
      if (activeWarmup.current === run) activeWarmup.current = null;
      controller.cancel();
    };
  }, [consumerScope, key, module, spec]);

  const commit = useCallback(
    (committedAt = performance.now()) => {
      const run = activeWarmup.current;
      if (
        !run ||
        run.key !== key ||
        run.spec !== spec ||
        !run.completed ||
        run.committed
      ) {
        return;
      }
      run.committed = true;
      run.controller.release();
      mark("committed", key);
      setStoredState((current) =>
        current.key === key && current.targetSpec === spec
          ? { ...current, committedAt, status: "committed" }
          : current,
      );
    },
    [key, spec],
  );

  return {
    built: state.built,
    committedAt: state.committedAt,
    commit,
    error: state.error,
    key: state.key,
    prepared:
      spec === null ||
      state.status === "prepared" ||
      state.status === "committed",
    preparedAt: state.preparedAt,
    startedAt: state.startedAt,
    status: state.status,
    total: state.total,
  };
}

export function GeometryLoading({
  built,
  label,
  scope,
  total,
}: {
  built: number;
  label: string;
  scope: string;
  total: number;
}) {
  return (
    <div
      aria-live="polite"
      className="geometry-loading"
      data-geometry-scope={scope}
      data-testid="geometry-loading"
      role="status"
    >
      <span>{label}</span>
      <progress max={Math.max(total, 1)} value={built} />
      <small>
        {built}/{total}
      </small>
    </div>
  );
}
