import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260723000100_adr001_v2_evidence_authority.sql"),
  "utf8",
);

describe("ADR-001 v2 evidence authority migration contract", () => {
  it("removes the browser-accessible canonical appender instead of trusting a well-formed envelope", () => {
    expect(migration).toMatch(
      /revoke all on function forge\.append_adr001_v2_event\(jsonb\)\s+from public, anon, authenticated, service_role;/i,
    );
    expect(migration).not.toMatch(
      /grant execute on function forge\.append_adr001_v2_event\(jsonb\)\s+to authenticated;/i,
    );
    expect(migration).toMatch(/grant execute on function forge\.append_adr001_v2_validated_event\([^;]+\)\s+to service_role;/i);
    expect(migration).not.toMatch(
      /grant execute on function forge\.append_adr001_v2_validated_event\([^;]+\)\s+to authenticated;/i,
    );
  });

  it("limits learner proof input to observations and excludes authority-bearing fields", () => {
    expect(migration).toContain("array['selection_ids', 'response_digest', 'explicit_uncertainty']");
    expect(migration).toContain("Task identity, access state, accommodation classification, nonce,");
    expect(migration).toContain("proof authority, validator, validity, and disposition are all server");
    expect(migration).toContain("ADR-001 learner proof submission");
    expect(migration).toContain("ADR-001 learner submissions are append-only observations");
  });

  it("requires an active server validator, exact trusted tuple, and one-time server nonce before projection", () => {
    expect(migration).toContain("create table forge.adr001_server_validator_authorities");
    expect(migration).toContain("create table forge.adr001_trusted_runtime_tuples");
    expect(migration).toContain("create table forge.adr001_proof_challenges");
    expect(migration).toContain("create table forge.adr001_event_projection_receipts");
    expect(migration).toContain("ADR-001 projection requires an active, unexpired server validator authority");
    expect(migration).toContain("ADR-001 projection requires an active tuple bound to the server validator authority");
    expect(migration).toContain("ADR-001 proof nonce must be an unexpired server-issued one-time challenge");
    expect(migration).toContain("for update;");
  });

  it("machine-binds validator scope and challenge issuance to the exact trusted tuple", () => {
    expect(migration).toContain("forge_private.adr001_validator_scope_digest(start_payload)");
    expect(migration).toContain("unique (authority_id, authority_scope_digest)");
    expect(migration).toMatch(
      /foreign key \(validator_authority_id, validator_scope_digest\)\s+references forge\.adr001_server_validator_authorities \(authority_id, authority_scope_digest\)/i,
    );
    expect(migration).toMatch(
      /foreign key \(trusted_runtime_tuple_id, issued_by_authority_id\)\s+references forge\.adr001_trusted_runtime_tuples \(tuple_id, validator_authority_id\)/i,
    );
    expect(migration).toMatch(
      /trusted_runtime_tuple_id = p_trusted_runtime_tuple_id\s+and issued_by_authority_id = p_validator_authority_id\s+and nonce_digest/i,
    );
  });

  it("keeps the authority receipt coupled to the canonical append transaction", () => {
    const appendAt = migration.indexOf("v_result := forge.append_adr001_v2_event(v_legacy_event);");
    const receiptAt = migration.indexOf("insert into forge.adr001_event_projection_receipts");
    expect(appendAt).toBeGreaterThan(-1);
    expect(receiptAt).toBeGreaterThan(appendAt);
    expect(migration).toContain("begin;");
    expect(migration.trimEnd()).toMatch(/commit;$/i);
  });
});
