import { getInternalCanonicalDeterministicValidatorRegistration } from "../deterministic-validators.internal";
import type { RuntimeCommand, WorldRuntimeAdapter } from "./protocol";
import { retainedRuntimeIdentityForInternal } from "./retained-runtime-binding.internal";
import {
  createWorldRuntimeSessionWithAuthority,
  dispatchWorldRuntimeCommandWithAuthority,
  type InternalWorldRuntimeAuthority,
  type RuntimeDispatchResult,
  type WorldRuntimeSession,
} from "./runtime";

const INTERNAL_WORLD_RUNTIME_AUTHORITY: InternalWorldRuntimeAuthority = Object.freeze({
  canonicalValidatorRegistration: getInternalCanonicalDeterministicValidatorRegistration,
  retainedRuntimeIdentity: retainedRuntimeIdentityForInternal,
});

export function createInternalWorldRuntimeSession<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  attemptId?: string,
): WorldRuntimeSession<State, DomainProof> {
  return createWorldRuntimeSessionWithAuthority(adapter, INTERNAL_WORLD_RUNTIME_AUTHORITY, attemptId);
}

export function dispatchInternalWorldRuntimeCommand<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  command: RuntimeCommand<DomainEvent>,
): RuntimeDispatchResult<State, DomainProof> {
  return dispatchWorldRuntimeCommandWithAuthority(
    adapter,
    INTERNAL_WORLD_RUNTIME_AUTHORITY,
    session,
    command,
  );
}
