import {
  validateLearningWorldPack,
  type WorldInvariantIssue,
} from "../validation";
import type { LearningWorldPack } from "../contracts";

export interface WorldRuntimeLintResult {
  readonly ok: boolean;
  readonly pack?: LearningWorldPack & { readonly runtime: NonNullable<LearningWorldPack["runtime"]> };
  readonly issues: readonly WorldInvariantIssue[];
}

/**
 * The runtime linter intentionally delegates package identity and manifest
 * validation to the existing World linter. It adds only the requirement that
 * a caller asking for a runtime adapter has a versioned binding to that same
 * package.
 */
export function lintWorldRuntimePack(candidate: unknown): WorldRuntimeLintResult {
  const packageValidation = validateLearningWorldPack(candidate);
  if (!packageValidation.ok) return { ok: false, issues: packageValidation.issues };
  if (!packageValidation.value.runtime) {
    return {
      ok: false,
      issues: [
        {
          code: "schema.invalid",
          path: "runtime",
          message: "A World runtime adapter requires a versioned binding on the existing LearningWorldPack.",
        },
      ],
    };
  }
  return {
    ok: true,
    pack: packageValidation.value as LearningWorldPack & {
      readonly runtime: NonNullable<LearningWorldPack["runtime"]>;
    },
    issues: [],
  };
}
