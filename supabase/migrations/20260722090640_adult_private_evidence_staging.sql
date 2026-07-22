-- Adult private-evidence staging: close public age/profile escalation before
-- Packet E supplies ADR-001's v2 canonical projector and replay fixtures.
-- This migration intentionally creates no private-evidence payload store.

begin;

-- The existing purpose check is intentionally extended rather than replaced
-- with an unconstrained value. Consent remains append-only.
alter table forge.consent_records
  drop constraint consent_records_purpose_key_check;

alter table forge.consent_records
  add constraint consent_records_purpose_key_check
  check (purpose_key in (
    'learning_service', 'guardian_access', 'research',
    'sensitive_artifact_capture', 'model_improvement',
    'private_evidence_persistence'
  ));

-- A caller must not be able to manufacture an adult profile through the Data
-- API. Reviewed provisioning is deliberately outside this packet.
revoke insert, update on forge.learner_profiles from authenticated;
drop policy learner_profiles_insert_self on forge.learner_profiles;
drop policy learner_profiles_update_self on forge.learner_profiles;

commit;
