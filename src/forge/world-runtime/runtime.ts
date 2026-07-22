import { getCanonicalDeterministicValidatorRegistration } from "../deterministic-validators";
import type { RuntimeCommand, WorldRuntimeAdapter } from "./protocol";
import { retainedRuntimeIdentityFor } from "./retained-runtime-binding";
import {
  createWorldRuntimeSessionWithAuthority,
  dispatchWorldRuntimeCommandWithAuthority,
  type RuntimeDispatchResult,
  type WorldRuntimeAuthority,
  type WorldRuntimeSession,
} from "./runtime-core.internal";

export {
  WorldRuntimeConfigurationError,
  type RuntimeDispatchResult,
  type WorldRuntimeConfigurationErrorCode,
  type WorldRuntimeSession,
} from "./runtime-core.internal";

const PUBLIC_WORLD_RUNTIME_AUTHORITY: WorldRuntimeAuthority = Object.freeze({
  canonicalValidatorRegistration: getCanonicalDeterministicValidatorRegistration,
  retainedRuntimeIdentity: retainedRuntimeIdentityFor,
});

export function createWorldRuntimeSession<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  attemptId?: string,
): WorldRuntimeSession<State, DomainProof> {
  return createWorldRuntimeSessionWithAuthority(adapter, PUBLIC_WORLD_RUNTIME_AUTHORITY, attemptId);
}

export function dispatchWorldRuntimeCommand<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  command: RuntimeCommand<DomainEvent>,
): RuntimeDispatchResult<State, DomainProof> {
  return dispatchWorldRuntimeCommandWithAuthority(
    adapter,
    PUBLIC_WORLD_RUNTIME_AUTHORITY,
    session,
    command,
  );
}
