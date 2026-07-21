"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";

import {
  clearForgeDeviceProfile,
  createForgeDeviceProfile,
  readForgeDeviceProfile,
  type ForgeDeviceProfile,
} from "@/src/lib/forge-profile/device-profile";

const DEVICE_MODES = [
  { id: "adult", label: "Adult", note: "Self-directed device session" },
  { id: "teen", label: "Teen", note: "Local evidence, no public profile" },
  { id: "child_with_grown_up", label: "Child + grown-up", note: "A grown-up manages this session" },
] as const;

const DEVICE_PROFILE_EVENT = "forge:device-profile-changed";

function subscribeToDeviceProfile(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(DEVICE_PROFILE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(DEVICE_PROFILE_EVENT, onStoreChange);
  };
}

function getDeviceProfileSnapshot() {
  try {
    return window.localStorage.getItem("forge.device-profile:v1");
  } catch {
    return null;
  }
}

export function DeviceProfileAccess({ compact = false }: { compact?: boolean }) {
  const profileSnapshot = useSyncExternalStore(subscribeToDeviceProfile, getDeviceProfileSnapshot, () => null);
  const profile: ForgeDeviceProfile | null = profileSnapshot
    ? readForgeDeviceProfile({ getItem: () => profileSnapshot })
    : null;
  const [ageMode, setAgeMode] = useState<ForgeDeviceProfile["ageMode"]>("adult");
  const [guardianPresent, setGuardianPresent] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      createForgeDeviceProfile(window.localStorage, ageMode, guardianPresent);
      window.dispatchEvent(new Event(DEVICE_PROFILE_EVENT));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }

  function reset() {
    clearForgeDeviceProfile(window.localStorage);
    window.dispatchEvent(new Event(DEVICE_PROFILE_EVENT));
  }

  if (profile) {
    const mode = DEVICE_MODES.find((candidate) => candidate.id === profile.ageMode);
    return (
      <section className="forge-device-access forge-device-access--active" aria-labelledby="device-access-title">
        <span>This device is ready</span>
        <h2 id="device-access-title">{mode?.label ?? "Private"} learning mode</h2>
        <p>
          Evidence stays in this browser. This is a device profile, not verified identity and not a cloud backup.
        </p>
        <div className="forge-account-actions">
          <Link className="forge-account-primary" href="/#worlds">Choose a World</Link>
          <button type="button" onClick={reset}>Remove device profile</button>
        </div>
      </section>
    );
  }

  return (
    <form className={`forge-device-access${compact ? " forge-device-access--compact" : ""}`} onSubmit={create}>
      <span>Private device access</span>
      <h2>Learn without creating a cloud identity.</h2>
      <p>
        FORGE stores only a random local ID and this age-policy choice. It does not ask for a name, school, or location.
      </p>
      <fieldset>
        <legend>Who is learning?</legend>
        {DEVICE_MODES.map((mode) => (
          <label key={mode.id}>
            <input
              type="radio"
              name="device-age-mode"
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
      <button className="forge-account-primary" type="submit">Use FORGE on this device</button>
      {!storageAvailable ? (
        <p className="forge-account-status" role="alert">
          This browser did not allow local storage. You can still open a World, but evidence may not survive a reload.
        </p>
      ) : null}
    </form>
  );
}
