import {
  ARGUMENT_EVIDENCE_VALIDATOR_ID,
  validateArgumentEvidenceTransfer,
} from "../worlds/argument-evidence";
import {
  CANONICAL_DETERMINISTIC_VALIDATORS,
  type CanonicalDeterministicValidatorRegistration,
} from "./deterministic-validators";
import {
  deterministicValidationResultSchema,
  type DeterministicValidator,
} from "./contracts";

/** Internal-only validator for the retained, unavailable Argument & Evidence package. */
export const argumentEvidenceTransferValidator: DeterministicValidator = Object.freeze({
  id: ARGUMENT_EVIDENCE_VALIDATOR_ID,
  validate(input: unknown) {
    return deterministicValidationResultSchema.parse(validateArgumentEvidenceTransfer(input));
  },
});

export const ARGUMENT_EVIDENCE_VALIDATOR_REGISTRATION = Object.freeze({
  validator: argumentEvidenceTransferValidator,
  inputContractVersion: "1.0.0",
  outputContractVersion: "1.0.0",
} as const satisfies CanonicalDeterministicValidatorRegistration);

export const INTERNAL_CANONICAL_DETERMINISTIC_VALIDATORS = Object.freeze([
  ...CANONICAL_DETERMINISTIC_VALIDATORS,
  argumentEvidenceTransferValidator,
] as const);

const internalValidatorsById = new Map<string, CanonicalDeterministicValidatorRegistration>(
  INTERNAL_CANONICAL_DETERMINISTIC_VALIDATORS.map((validator) => [validator.id, validator === argumentEvidenceTransferValidator
    ? ARGUMENT_EVIDENCE_VALIDATOR_REGISTRATION
    : Object.freeze({
        validator,
        inputContractVersion: "1.0.0",
        outputContractVersion: "1.0.0",
      })]),
);

export function getInternalCanonicalDeterministicValidatorRegistration(
  id: string,
): CanonicalDeterministicValidatorRegistration | null {
  return internalValidatorsById.get(id) ?? null;
}
