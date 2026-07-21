import {
  deterministicValidationResultSchema,
  type DeterministicValidationResult,
  type DeterministicValidator,
  type EvidenceTier,
  type LearnerAgeMode,
  type LearnerDepthMode,
  type LearningWorldManifest,
  type LearningWorldPack,
  type WorldKind,
} from "./contracts";
import { parseLearningWorldPack } from "./validation";
import { BUILT_IN_DETERMINISTIC_VALIDATORS, BUILT_IN_WORLD_PACKS } from "./worlds";

export const REGISTRY_ERROR_CODES = [
  "registry.browser-runtime",
  "registry.duplicate-world-id",
  "registry.duplicate-route",
  "registry.duplicate-validator-id",
  "registry.validator-binding-missing",
  "registry.validator-definition-missing",
  "registry.world-not-found",
  "registry.world-has-no-validator",
  "registry.validator-output-invalid",
] as const;

export type RegistryErrorCode = (typeof REGISTRY_ERROR_CODES)[number];

export class TrustedWorldRegistryError extends Error {
  readonly code: RegistryErrorCode;

  constructor(code: RegistryErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TrustedWorldRegistryError";
    this.code = code;
  }
}

export interface WorldRegistryFilter {
  readonly includeUnavailable?: boolean;
  readonly ageMode?: LearnerAgeMode;
  readonly depthMode?: LearnerDepthMode;
  readonly evidenceTier?: EvidenceTier;
  readonly kind?: WorldKind;
}

export interface TrustedWorldRegistryInput {
  readonly packs: readonly unknown[];
  readonly validators: readonly DeterministicValidator[];
}

function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new TrustedWorldRegistryError(
      "registry.browser-runtime",
      "The trusted Forge registry is server-only and cannot be created in a browser runtime.",
    );
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export class TrustedWorldRegistry {
  readonly #packsById = new Map<string, LearningWorldPack>();
  readonly #availableWorldIdByRoute = new Map<string, string>();
  readonly #validatorsById = new Map<string, DeterministicValidator>();

  constructor(input: TrustedWorldRegistryInput) {
    assertServerRuntime();

    for (const validator of input.validators) {
      if (this.#validatorsById.has(validator.id)) {
        throw new TrustedWorldRegistryError(
          "registry.duplicate-validator-id",
          `Duplicate deterministic validator ID: ${validator.id}`,
        );
      }
      this.#validatorsById.set(validator.id, Object.freeze(validator));
    }

    const declaredValidatorIds = new Set<string>();
    const allRoutes = new Set<string>();
    for (const candidate of input.packs) {
      const pack = deepFreeze(parseLearningWorldPack(candidate));
      const { id, route, availability } = pack.manifest;

      if (this.#packsById.has(id)) {
        throw new TrustedWorldRegistryError("registry.duplicate-world-id", `Duplicate world ID: ${id}`);
      }
      if (allRoutes.has(route)) {
        throw new TrustedWorldRegistryError("registry.duplicate-route", `Duplicate world route: ${route}`);
      }

      this.#packsById.set(id, pack);
      allRoutes.add(route);
      if (availability.status === "available") this.#availableWorldIdByRoute.set(route, id);
      for (const definition of pack.deterministicValidators) declaredValidatorIds.add(definition.id);

      const requiredValidatorId = pack.manifest.deterministicValidatorId;
      if (requiredValidatorId && !this.#validatorsById.has(requiredValidatorId)) {
        throw new TrustedWorldRegistryError(
          "registry.validator-binding-missing",
          `World ${id} requires unbound deterministic validator ${requiredValidatorId}.`,
        );
      }
    }

    for (const validatorId of this.#validatorsById.keys()) {
      if (!declaredValidatorIds.has(validatorId)) {
        throw new TrustedWorldRegistryError(
          "registry.validator-definition-missing",
          `Runtime validator ${validatorId} has no definition in a registered world pack.`,
        );
      }
    }
  }

  list(filter: WorldRegistryFilter = {}): readonly LearningWorldManifest[] {
    const manifests = [...this.#packsById.values()]
      .map((pack) => pack.manifest)
      .filter((manifest) => filter.includeUnavailable || manifest.availability.status === "available")
      .filter((manifest) => !filter.ageMode || manifest.ageModes.includes(filter.ageMode))
      .filter((manifest) => !filter.depthMode || manifest.depthModes.includes(filter.depthMode))
      .filter((manifest) => !filter.evidenceTier || manifest.evidenceTier === filter.evidenceTier)
      .filter((manifest) => !filter.kind || manifest.kind === filter.kind);
    return Object.freeze(manifests);
  }

  getManifest(worldId: string): LearningWorldManifest | undefined {
    return this.#packsById.get(worldId)?.manifest;
  }

  getPack(worldId: string): LearningWorldPack | undefined {
    return this.#packsById.get(worldId);
  }

  resolveAvailableRoute(route: string): LearningWorldPack | undefined {
    const worldId = this.#availableWorldIdByRoute.get(route);
    return worldId ? this.#packsById.get(worldId) : undefined;
  }

  runDeterministicValidator(worldId: string, input: unknown): DeterministicValidationResult {
    const pack = this.#packsById.get(worldId);
    if (!pack) {
      throw new TrustedWorldRegistryError("registry.world-not-found", `Unknown world: ${worldId}`);
    }

    const validatorId = pack.manifest.deterministicValidatorId;
    if (!validatorId) {
      throw new TrustedWorldRegistryError(
        "registry.world-has-no-validator",
        `World ${worldId} does not declare a deterministic validator.`,
      );
    }

    const validator = this.#validatorsById.get(validatorId);
    if (!validator) {
      throw new TrustedWorldRegistryError(
        "registry.validator-binding-missing",
        `World ${worldId} requires unbound deterministic validator ${validatorId}.`,
      );
    }

    try {
      return deepFreeze(deterministicValidationResultSchema.parse(validator.validate(input)));
    } catch (error) {
      throw new TrustedWorldRegistryError(
        "registry.validator-output-invalid",
        `Validator ${validatorId} returned an invalid result.`,
        { cause: error },
      );
    }
  }
}

export function createTrustedWorldRegistry(input: TrustedWorldRegistryInput): TrustedWorldRegistry {
  return new TrustedWorldRegistry(input);
}

export const trustedWorldRegistry = createTrustedWorldRegistry({
  packs: BUILT_IN_WORLD_PACKS,
  validators: BUILT_IN_DETERMINISTIC_VALIDATORS,
});
