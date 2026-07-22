import type { RuntimeCommand, WorldRuntimeAdapter } from "./protocol";
import {
  createPublicWorldRuntimeSessionCore,
  dispatchPublicWorldRuntimeCommandCore,
  type RuntimeDispatchResult,
  type WorldRuntimeSession,
} from "./runtime-core.public";

export {
  WorldRuntimeConfigurationError,
  type RuntimeDispatchResult,
  type WorldRuntimeConfigurationErrorCode,
  type WorldRuntimeSession,
} from "./runtime-core.public";

export function createWorldRuntimeSession<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  attemptId?: string,
): WorldRuntimeSession<State, DomainProof> {
  return createPublicWorldRuntimeSessionCore(adapter, attemptId);
}

export function dispatchWorldRuntimeCommand<State, DomainEvent, DomainProof>(
  adapter: WorldRuntimeAdapter<State, DomainEvent, DomainProof>,
  session: WorldRuntimeSession<State, DomainProof>,
  command: RuntimeCommand<DomainEvent>,
): RuntimeDispatchResult<State, DomainProof> {
  return dispatchPublicWorldRuntimeCommandCore(adapter, session, command);
}
