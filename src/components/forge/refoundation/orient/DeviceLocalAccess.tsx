"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useSyncExternalStore } from "react";

import {
  clearForgeDeviceProfile,
  createForgeDeviceProfile,
  FORGE_DEVICE_PROFILE_EVENT,
  FORGE_DEVICE_PROFILE_KEY,
  readForgeDeviceProfile,
  type ForgeDeviceProfile,
} from "@/src/lib/forge-profile/device-profile";

import { ArrowIcon } from "./OrientFrame";
import styles from "./orient.module.css";

const DEVICE_MODES: ReadonlyArray<{
  id: ForgeDeviceProfile["ageMode"];
  label: string;
  note: string;
}> = [
  {
    id: "adult",
    label: "Adult",
    note: "Self-directed, device-local learning",
  },
  {
    id: "teen",
    label: "Teen",
    note: "Device-only reviewed routes",
  },
  {
    id: "child_with_grown_up",
    label: "Child + grown-up",
    note: "A grown-up manages this session",
  },
];

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(FORGE_DEVICE_PROFILE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(FORGE_DEVICE_PROFILE_EVENT, onStoreChange);
  };
}
function getSnapshot() {
  try {
    return window.localStorage.getItem(FORGE_DEVICE_PROFILE_KEY);
  } catch {
    return null;
  }
}

function modeLabel(mode: ForgeDeviceProfile["ageMode"]) {
  return DEVICE_MODES.find((candidate) => candidate.id === mode)?.label ?? "Private";
}

export function DeviceLocalAccess({
  continueHref = "/orient",
}: {
  continueHref?: string;
}) {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const profile = snapshot
    ? readForgeDeviceProfile({ getItem: () => snapshot })
    : null;
  const [ageMode, setAgeMode] = useState<ForgeDeviceProfile["ageMode"] | null>(null);
  const [guardianPresent, setGuardianPresent] = useState(false);
  const [error, setError] = useState("");

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ageMode) {
      setError("Choose the device mode that applies to this session.");
      return;
    }

    try {
      createForgeDeviceProfile(window.localStorage, ageMode, guardianPresent);
      window.dispatchEvent(new Event(FORGE_DEVICE_PROFILE_EVENT));
      setError("");
      router.push(continueHref);
    } catch {
      setError(
        ageMode === "child_with_grown_up" && !guardianPresent
          ? "A grown-up must be present to start this device-only session."
          : "This browser could not create the local device profile. Nothing was saved.",
      );
    }
  }

  function reset() {
    const result = clearForgeDeviceProfile(window.localStorage);
    if (!result.ok) {
      setError("FORGE could not confirm removal from browser storage. The existing device mode remains active.");
      return;
    }
    window.dispatchEvent(new Event(FORGE_DEVICE_PROFILE_EVENT));
    setAgeMode(null);
    setGuardianPresent(false);
    setError("");
  }

  if (profile) {
    return (
      <section className={styles.deviceReady} aria-labelledby="device-ready-title">
        <p className={styles.sectionLabel}>This device is ready</p>
        <h3 id="device-ready-title">{modeLabel(profile.ageMode)} learning mode</h3>
        <p>
          This is a browser-local preference, not verified identity or a cloud
          account. Work stays on this device unless a separately reviewed
          continuity service is enabled.
        </p>
        <div className={styles.readyActions}>
          <Link className={styles.primaryLink} href={continueHref}>
            Continue privately
            <ArrowIcon />
          </Link>
          <button className={styles.textButton} type="button" onClick={reset}>
            Change device mode
          </button>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </section>
    );
  }

  return (
    <form className={styles.deviceForm} onSubmit={create}>
      <fieldset>
        <legend>Who is learning on this device?</legend>
        <div className={styles.modeGrid}>
          {DEVICE_MODES.map((mode) => (
            <label
              className={styles.modeChoice}
              data-selected={ageMode === mode.id}
              key={mode.id}
            >
              <input
                checked={ageMode === mode.id}
                name="device-mode"
                onChange={() => {
                  setAgeMode(mode.id);
                  setError("");
                  if (mode.id !== "child_with_grown_up") {
                    setGuardianPresent(false);
                  }
                }}
                type="radio"
                value={mode.id}
              />
              <strong>{mode.label}</strong>
              <small>{mode.note}</small>
            </label>
          ))}
        </div>
      </fieldset>

      {ageMode === "child_with_grown_up" ? (
        <label className={styles.guardianCheck}>
          <input
            checked={guardianPresent}
            onChange={(event) => {
              setGuardianPresent(event.target.checked);
              setError("");
            }}
            required
            type="checkbox"
          />
          <span>A grown-up is here and managing this device session.</span>
        </label>
      ) : null}

      <button className={styles.primaryButton} disabled={!ageMode} type="submit">
        Continue on this device
        <ArrowIcon />
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
