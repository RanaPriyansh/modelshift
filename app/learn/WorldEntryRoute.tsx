"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";

import { ModelShiftExperience } from "@/src/components/experience/ModelShiftExperience";
import { PrimarySourceWorldRoute } from "@/src/components/forge/PrimarySourceWorldRoute";
import { ProportionalWorldRoute } from "@/src/components/forge/ProportionalWorldRoute";
import { EvidenceLearningWorld } from "@/src/components/worlds/ai-learning";
import {
  isAudienceAllowed,
  WORLD_ENTRY_MODE_DETAILS,
  type WorldEntryPolicy,
  type WorldRouteAudience,
} from "@/src/lib/forge-auth/world-entry-policy";
import {
  createForgeDeviceProfile,
  FORGE_DEVICE_PROFILE_EVENT,
  FORGE_DEVICE_PROFILE_KEY,
  readForgeDeviceProfile,
  type ForgeDeviceProfile,
} from "@/src/lib/forge-profile/device-profile";

import { LocalGrownUpConfirmationClient } from "./WorldAgeRouteGateClient";

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

function modeDetails(audience: WorldRouteAudience) {
  const detail = WORLD_ENTRY_MODE_DETAILS.find((candidate) => candidate.audience === audience);
  if (!detail) throw new Error(`Unsupported World route audience: ${String(audience)}`);
  return detail;
}

function renderWorld(
  worldId: WorldEntryPolicy["worldId"],
  audience: ForgeDeviceProfile["ageMode"],
) {
  switch (worldId) {
    case "world.force-and-motion":
      return <ModelShiftExperience />;
    case "world.source-corroboration":
      return <EvidenceLearningWorld />;
    case "world.proportional-reasoning":
      return <ProportionalWorldRoute audience={audience} />;
    case "world.primary-source-reasoning":
      return <PrimarySourceWorldRoute />;
  }
}

function DeviceProfileSelectionGate({
  policy,
  suggestedAudience,
}: {
  policy: WorldEntryPolicy;
  suggestedAudience: WorldRouteAudience | null;
}) {
  const eligibleModes = WORLD_ENTRY_MODE_DETAILS.filter((mode) => (
    policy.allowedAgeModes.includes(mode.ageMode)
    && policy.allowedAudienceModes.includes(mode.audience)
  ));
  const [ageMode, setAgeMode] = useState<WorldRouteAudience | null>(suggestedAudience);
  const [guardianPresent, setGuardianPresent] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  function createDeviceProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ageMode || !policy.allowedAudienceModes.includes(ageMode)) return;

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
      <h1>Choose a device learning mode before opening {policy.worldTitle}.</h1>
      <p>
        These choices come from this World&apos;s released registry record. A link can suggest an eligible mode, but it cannot
        open a World or establish age, identity, consent, or guardian authority.
      </p>
      <form onSubmit={createDeviceProfile}>
        <fieldset>
          <legend>Who is learning on this device?</legend>
          {eligibleModes.map((mode) => (
            <label key={mode.audience}>
              <input
                type="radio"
                name="world-device-age-mode"
                value={mode.audience}
                checked={ageMode === mode.audience}
                onChange={() => {
                  setAgeMode(mode.audience);
                  if (mode.audience !== "child_with_grown_up") setGuardianPresent(false);
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
          This browser cannot save the required local device preference, so this World stays closed.
        </p>
      ) : null}
      <Link href="/">Return to FORGE home</Link>
    </main>
  );
}

function DeviceProfileRefusal({
  audience,
  policy,
}: {
  audience: ForgeDeviceProfile["ageMode"];
  policy: WorldEntryPolicy;
}) {
  const storedMode = modeDetails(audience);
  const allowedLabels = policy.allowedAudienceModes.map((mode) => modeDetails(mode).label);

  return (
    <main className="forge-world-entry-gate" data-testid="world-device-profile-refusal">
      <span>Registry entry refused</span>
      <h1>{storedMode.label} mode cannot open {policy.worldTitle}.</h1>
      <p role="alert">
        This direct entry stays closed because the released World registry allows {allowedLabels.join(" or ")} mode only.
        The stored preference is local and is not verified age, identity, consent, or guardian authority.
      </p>
      <p>No cloud account, provider, or external service was contacted.</p>
      <Link href="/login">Review this device mode</Link>
      <Link href="/">Return to FORGE home</Link>
    </main>
  );
}

function AuthoredDeviceWorld({
  audience,
  policy,
}: {
  audience: ForgeDeviceProfile["ageMode"];
  policy: WorldEntryPolicy;
}) {
  return (
    <>
      <p className="forge-world-entry-disclosure" data-testid="world-local-profile-disclosure">
        Local {modeDetails(audience).label}{" "}preference accepted against this World&apos;s registry. This opens only
        FORGE&apos;s authored, device-only representation; it is not verified age, identity, consent, or guardian
        authority, and grants no cloud or provider access.
      </p>
      {renderWorld(policy.worldId, audience)}
    </>
  );
}

/**
 * SSR always emits the gate. Browser storage and URL values are untrusted, so
 * a World can render only after the local v1 profile parses and its exact mode
 * appears in the registry-derived allowlist supplied by the server route.
 */
export function WorldEntryRoute({
  policy,
  suggestedAudience,
}: {
  policy: WorldEntryPolicy;
  suggestedAudience: WorldRouteAudience | null;
}) {
  const profileSnapshot = useSyncExternalStore(subscribeToDeviceProfile, getDeviceProfileSnapshot, () => null);
  const profile = profileSnapshot
    ? readForgeDeviceProfile({ getItem: () => profileSnapshot })
    : null;

  if (!profile) {
    return (
      <DeviceProfileSelectionGate
        key={`${policy.worldId}:${suggestedAudience ?? "none"}`}
        policy={policy}
        suggestedAudience={suggestedAudience}
      />
    );
  }

  if (!isAudienceAllowed(policy, profile.ageMode)) {
    return <DeviceProfileRefusal audience={profile.ageMode} policy={policy} />;
  }

  const authoredWorld = <AuthoredDeviceWorld audience={profile.ageMode} policy={policy} />;
  if (profile.ageMode !== "child_with_grown_up") return authoredWorld;

  return (
    <LocalGrownUpConfirmationClient worldTitle={policy.worldTitle}>
      {authoredWorld}
    </LocalGrownUpConfirmationClient>
  );
}
