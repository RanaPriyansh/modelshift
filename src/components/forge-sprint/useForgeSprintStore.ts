"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addSprintToStore,
  createEmptyForgeSprintStore,
  createForgeSprint,
  replaceSprintInStore,
  type CreateForgeSprintInput,
  type ForgeSprint,
  type ForgeSprintStore,
  validateSprintSetup,
} from "@/src/lib/forge-sprint/model";
import {
  readForgeSprintStore,
  readRawForgeSprintStore,
  writeForgeSprintStore,
} from "@/src/lib/forge-sprint/storage";

interface ForgeSprintStoreState {
  ready: boolean;
  store: ForgeSprintStore;
  issues: string[];
  rawPresent: boolean;
}

const INITIAL_STATE: ForgeSprintStoreState = {
  ready: false,
  store: createEmptyForgeSprintStore(),
  issues: [],
  rawPresent: false,
};

export function useForgeSprintStore() {
  const [state, setState] = useState<ForgeSprintStoreState>(INITIAL_STATE);

  const refresh = useCallback(() => {
    if (typeof window === "undefined") return;
    const parsed = readForgeSprintStore(window.localStorage);
    setState({
      ready: true,
      store: parsed.store,
      issues: parsed.issues,
      rawPresent: readRawForgeSprintStore(window.localStorage) !== null,
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const blocked = state.rawPresent && state.issues.length > 0;

  function persist(next: ForgeSprintStore): string | null {
    if (typeof window === "undefined") return "Browser storage is not available.";
    if (blocked) {
      return "Stored sprint data needs attention before Forge can safely change it.";
    }
    try {
      writeForgeSprintStore(window.localStorage, next, state.store.revision);
      setState({ ready: true, store: next, issues: [], rawPresent: true });
      return null;
    } catch (error) {
      if (error instanceof Error && error.message === "stale_revision") {
        refresh();
        return "This sprint changed in another tab. Forge reloaded the newest copy.";
      }
      return "Forge could not save on this browser. Nothing was overwritten.";
    }
  }

  function createSprintFromInput(
    input: CreateForgeSprintInput,
  ): { sprint: ForgeSprint | null; error: string | null } {
    const validation = validateSprintSetup(input);
    if (!validation.ok) return { sprint: null, error: validation.errors[0] ?? "Check the sprint details." };
    const sprint = createForgeSprint(input);
    const error = persist(addSprintToStore(state.store, sprint));
    return { sprint: error ? null : sprint, error };
  }

  function saveSprint(sprint: ForgeSprint): string | null {
    return persist(replaceSprintInStore(state.store, sprint));
  }

  function removeSprint(sprintId: string): string | null {
    const next: ForgeSprintStore = {
      ...state.store,
      revision: state.store.revision + 1,
      sprints: state.store.sprints.filter((sprint) => sprint.id !== sprintId),
    };
    return persist(next);
  }

  return {
    ...state,
    blocked,
    refresh,
    createSprint: createSprintFromInput,
    saveSprint,
    removeSprint,
  };
}
