-- Packet B corrective hardening. This is additive to the staging migration:
-- lifecycle and age policy are server-owned, and private-evidence consent is
-- deferred until the ADR-001/ADR-004 runtime exists.

begin;

-- An authenticated Data API caller must not be able to reactivate a restricted
-- or closed account, or manufacture any profile that sign-in treats as
-- authority. There is currently no reviewed self-service profile-edit surface,
-- so retain no mutable client columns rather than granting a broad UPDATE.
revoke insert, update on forge.profiles from authenticated;
drop policy if exists profiles_insert_self on forge.profiles;
drop policy if exists profiles_update_self on forge.profiles;

-- Repeat the age/profile revocation defensively. These records are provisioned
-- only by a reviewed server-owned workflow that is outside this packet.
revoke insert, update on forge.learner_profiles from authenticated;
drop policy if exists learner_profiles_insert_self on forge.learner_profiles;
drop policy if exists learner_profiles_update_self on forge.learner_profiles;

-- Consent is not an operative private-evidence persistence authority before
-- Packet E has supplied the canonical runtime projector and persistence path.
alter table forge.consent_records
  drop constraint if exists consent_records_purpose_key_check;

alter table forge.consent_records
  add constraint consent_records_purpose_key_check
  check (purpose_key in (
    'learning_service', 'guardian_access', 'research',
    'sensitive_artifact_capture', 'model_improvement'
  ));

commit;
