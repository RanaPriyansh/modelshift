import "server-only";

import {
  UniversityCommandCenterUnavailable,
} from "@/src/components/forge/university-command-center/UniversityCommandCenterUnavailable";
import {
  UniversityCommandCenterWorkspace,
} from "@/src/components/forge/university-command-center/UniversityCommandCenterWorkspace";

import { readUniversityCommandCenterGate } from "./fixture-gate.server";

export function UniversityCommandCenterDevelopmentSurface() {
  const gate = readUniversityCommandCenterGate();
  return gate.enabled
    ? <UniversityCommandCenterWorkspace />
    : <UniversityCommandCenterUnavailable />;
}
