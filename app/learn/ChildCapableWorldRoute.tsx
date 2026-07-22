"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";

import { ProportionalWorldRoute } from "@/src/components/forge/ProportionalWorldRoute";
import { PrimarySourceReasoningWorld } from "@/src/components/worlds/primary-source-reasoning";
import type { WorldRouteAudience } from "@/src/lib/forge-auth/world-age-policy.server";
import {
  createForgeDeviceProfile,
  FORGE_DEVICE_PROFILE_EVENT,
  FORGE_DEVICE_PROFILE_KEY,
  readForgeDeviceProfile,
  type ForgeDeviceProfile,
} from "@/src/lib/forge-profile/device-profile";

import { LocalGrownUpConfirmationClient } from "./WorldAgeRouteGateClient";

type WorldId = "primary_source_reasoning" | "proportional_reasoning";

const DEVICE_MODES: ReadonlyArray<{ id: ForgeDeviceProfile["ageMode"]; label: string; note: string }> = [
  { id: "child_with_grown_up", label: "Child + grown-up", note: "A grown-up manages this device session" },
  { id: "teen", label: "Teen", note: "Authored, device-only learning" },
  { id: "adult", label: "Adult", note: "Authored, device-only learning" },
];

function subscribeToDeviceProfile(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(FORGE_DEVICE_PROFILE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(FORGE_DEVICE_PROFILE_EVENT, onStoreChange);
  };
}

function getDeviceProfileSnapshot() {
  try {
    return window.localStorage.getItem(FORGE_DEVICE_PROFILE_KEY);
  } catch {
    return null;
  }
}

function deviceModeLabel(ageMode: ForgeDeviceProfile["ageMode"]): string {
  return DEVICE_MODES.find((candidate) => candidate.id === ageMode)?.label ?? "Private";
}

function renderWorld(world: WorldId, audience: ForgeDeviceProfile["ageMode"]) {
  if (world === "proportional_reasoning") return <ProportionalWorldRoute audience={audience} />;
  return <PrimarySourceReasoningWorld />;
}

function DeviceProfileSelectionGate({
  suggestedAudience,
  worldTitle,
}: {
  suggestedAudience: WorldRouteAudience | null;
  worldTitle: string;
}) {
  const [ageMode, setAgeMode] = useState<ForgeDeviceProfile["ageMode"] | null>(suggestedAudience);
  const [guardianPresent, setGuardianPresent] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  function createDeviceProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ageMode) return;

    try {
      createForgeDeviceProfile(window.localStorage, ageMode, guardianPresent);
      window.dispatchEvent(new Event(FORGE_DEVICE_PROFILE_EVENT));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }

  return (
    <main className="forge-world-entry-gate" data-testid="world-device-profile-gate">
      <span>Local device boundary</span>
      <h1>Choose a device learning mode before opening {worldTitle}.</h1>
      <p>
        This browser has no usable FORGE device preference yet. A link can suggest a mode, but it cannot open a World or
        establish age, identity, consent, or guardian authority.
      </p>
      <form onSubmit={createDeviceProfile}>
        <fieldset>
          <legend>Who is learning on this device?</legend>
          {DEVICE_MODES.map((mode) => (
            <label key={mode.id}>
              <input
                type="radio"
                name="world-device-age-mode"
                value={mode.id}
                checked={ageMode === mode.id}
                onChange={() => {
                  setAgeMode(mode.id);
                  if (mode.id !== "child_with_grown_up") setGuardianPresent(false);
                }}
              />
              <strong>{mode.label}</strong>
              <small>{mode.note}</small>
            </label>
          ))}
        </fieldset>
        {ageMode === "child_with_grown_up" ? (
          <label className="forge-account-confirmation">
            <input
              type="checkbox"
              required
              checked={guardianPresent}
              onChange={(event) => setGuardianPresent(event.target.checked)}
            />
            <span>A grown-up is here and managing this device session.</span>
          </label>
        ) : null}
        <button type="submit" disabled={!ageMode}>Use this device mode</button>
      </form>
      {!storageAvailable ? (
        <p role="alert">
          This browser cannot save the required local device preference, so this child-capable World stays closed.
        </p>
      ) : null}
      <Link href="/">Return to FORGE home</Link>
    </main>
  );
}

function AuthoredDeviceWorld({
  audience,
  world,
}: {
  audience: ForgeDeviceProfile["ageMode"];
  world: WorldId;
}) {
  return (
    <>
      <p className="forge-world-entry-disclosure" data-testid="world-local-profile-disclosure">
        Local {deviceModeLabel(audience)}{" "}preference: this opens only FORGE&apos;s authored, device-only S0/S1 representation.
        It is not verified age, identity, consent, or guardian authority, and grants no cloud or provider access.
      </p>
      {renderWorld(world, audience)}
    </>
  );
}

/**
 * This client boundary deliberately renders the profile gate during SSR. Local
 * Storage is an untrusted browser input, so a valid v1 profile is parsed only
 * after hydration; an audience or guardian URL parameter can only preselect a
 * form option and can never render a World by itself.
 */
export function ChildCapableWorldRoute({
  suggestedAudience,
  world,
  worldTitle,
}: {
  suggestedAudience: WorldRouteAudience | null;
  world: WorldId;
  worldTitle: string;
}) {
  const profileSnapshot = useSyncExternalStore(subscribeToDeviceProfile, getDeviceProfileSnapshot, () => null);
  const profile = profileSnapshot
    ? readForgeDeviceProfile({ getItem: () => profileSnapshot })
    : null;

  if (!profile) {
    return (
      <DeviceProfileSelectionGate
        key={suggestedAudience ?? "none"}
        suggestedAudience={suggestedAudience}
        worldTitle={worldTitle}
      />
    );
  }

  const authoredWorld = <AuthoredDeviceWorld audience={profile.ageMode} world={world} />;
  if (profile.ageMode !== "child_with_grown_up") return authoredWorld;

  return (
    <LocalGrownUpConfirmationClient worldTitle={worldTitle}>
      {authoredWorld}
    </LocalGrownUpConfirmationClient>
  );
}
