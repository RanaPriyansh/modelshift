import type { RuntimeCommand, WorldRuntimeAdapter } from "./protocol";
import {
  createInternalWorldRuntimeSessionCore,
  dispatchInternalWorldRuntimeCommandCore,
  type RuntimeDispatchResult,
  type WorldRuntimeSession,
} from "./runtime-core.internal";

export function createInternalWorldRuntimeSession<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  attemptId?: string,
): WorldRuntimeSession<State, DomainProof> {
  return createInternalWorldRuntimeSessionCore(adapter, attemptId);
}

export function dispatchInternalWorldRuntimeCommand<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  command: RuntimeCommand<DomainEvent>,
): RuntimeDispatchResult<State, DomainProof> {
  return dispatchInternalWorldRuntimeCommandCore(adapter, session, command);
}
