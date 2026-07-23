-- Disposable, separate-session proof that a one-time server-issued challenge
-- cannot create two authoritative projections.  This fixture is deliberately
-- outside the migration path and runs only against a throwaway local database.

\set ON_ERROR_STOP on

create schema if not exists forge_test;
revoke all on schema forge_test from public;

create or replace function forge_test.adr001_v3_start_payload()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'world_id', 'world.authority.race',
    'world_version', '1.0.0',
    'content_version', '1.0.0',
    'package_integrity_hash', 'sha256:' || repeat('a', 64),
    'runtime_binding_digest', 'sha256:' || repeat('b', 64),
    'protocol_version', '1.0.0',
    'capability_id', 'capability.authority.race',
    'proof_claim_id', 'proof.authority.race',
    'task_id', 'task.authority.race',
    'task_version', '1.0.0',
    'task_family_id', 'task-family.authority.race',
    'representation_id', 'representation.authority.race',
    'context_id', 'context.authority.race',
    'bounded_claim', 'A bounded authority race fixture claim.',
    'validator_id', 'validator.authority.race',
    'validator_version', '1.0.0',
    'proof_authority', 'honour_based',
    'source_bindings', jsonb_build_array(jsonb_build_object(
      'domain_source_ref', 'source-authority-race',
      'source_item_id', 'source-item-authority-race',
      'source_package_id', 'source-package-authority-race',
      'source_package_version', '1.0.0',
      'source_snapshot_digest', 'sha256:' || repeat('c', 64),
      'locator_ids', jsonb_build_array('locator-authority-race'),
      'claim_ids', jsonb_build_array('claim-authority-race'),
      'rights_record_id', 'rights-authority-race',
      'review_decision_ids', jsonb_build_array('review-authority-race'),
      'provenance_status', 'bound'
    )),
    'source_provenance_status', 'bound'
  );
$$;

create or replace function forge_test.adr001_v3_seal(
  p_event_id uuid,
  p_event_type text,
  p_aggregate_version bigint,
  p_causation_id uuid,
  p_idempotency_key text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unsigned jsonb;
begin
  v_unsigned := jsonb_build_object(
    'event_id', p_event_id,
    'event_type', p_event_type,
    'schema_version', 2,
    'aggregate', jsonb_build_object('type', 'world_run', 'id', 'run.authority.race', 'version', p_aggregate_version),
    'actor', jsonb_build_object('type', 'learner', 'id', 'device.333333333333333333333333'),
    'authority', jsonb_build_object('policy_version', 'policy.authority.race.2026.07', 'consent_grant_ids', jsonb_build_array()),
    'occurred_at', '2026-07-23T09:00:00.000Z',
    'recorded_at', '2026-07-23T09:00:00.000Z',
    'correlation_id', 'correlation.authority.race',
    'causation_id', p_causation_id,
    'idempotency_key', p_idempotency_key,
    'payload', p_payload
  );
  return v_unsigned || jsonb_build_object('integrity_hash', forge_private.sha256_jsonb(v_unsigned));
end;
$$;

create or replace function forge_test.adr001_v3_proof_event(
  p_event_id uuid,
  p_idempotency_key text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select forge_test.adr001_v3_seal(
    p_event_id,
    'proof.submitted',
    2,
    '85000000-0000-4000-8000-000000000001',
    p_idempotency_key,
    jsonb_build_object(
      'task_id', 'task.authority.race',
      'task_version', '1.0.0',
      'task_family_id', 'task-family.authority.race',
      'representation_id', 'representation.authority.race',
      'context_id', 'context.authority.race',
      'selection_ids', jsonb_build_array('selection.authority.race'),
      'response_digest', 'sha256:' || repeat('e', 64),
      'explicit_uncertainty', false,
      'assistance_access', 'removed',
      'proof_nonce_digest', 'sha256:' || repeat('f', 64),
      'access_accommodations', jsonb_build_array()
    )
  );
$$;

grant usage on schema forge_test to service_role;
grant execute on function forge_test.adr001_v3_proof_event(uuid, text) to service_role;

insert into auth.users (id) values ('81000000-0000-4000-8000-000000000001')
on conflict do nothing;
insert into forge.profiles (user_id, display_name)
values ('81000000-0000-4000-8000-000000000001', 'ADR-001 v3 race adult')
on conflict do nothing;
insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values ('81000000-0000-4000-8000-000000000001', 'adult', 'active')
on conflict do nothing;

-- The database operator installs immutable authority material. Service role
-- cannot write these rows; it can only use them through the projection gate.
insert into forge.adr001_server_validator_authorities (
  authority_id, authority_kind, authority_scope_digest
) values (
  'validator-authority.race',
  'server_validator',
  forge_private.adr001_validator_scope_digest(forge_test.adr001_v3_start_payload())
);
insert into forge.adr001_trusted_runtime_tuples (
  tuple_id, validator_authority_id, tuple_digest, start_payload
) values (
  '83000000-0000-4000-8000-000000000001',
  'validator-authority.race',
  forge_private.sha256_jsonb(forge_test.adr001_v3_start_payload()),
  forge_test.adr001_v3_start_payload()
);

begin;
set local role service_role;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = 'service-role-race';
select forge.append_adr001_v2_validated_event(
  '81000000-0000-4000-8000-000000000001',
  'validator-authority.race',
  '83000000-0000-4000-8000-000000000001',
  null,
  forge_test.adr001_v3_seal(
    '85000000-0000-4000-8000-000000000001',
    'world_run.started',
    1,
    null,
    'idempotency.authority.race.started',
    forge_test.adr001_v3_start_payload()
  )
);
commit;

begin;
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '81000000-0000-4000-8000-000000000001';
insert into forge.adr001_untrusted_learner_submissions (
  submission_id, owner_user_id, aggregate_id, submission_kind, client_submission_key, submission_document
) values (
  '84000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'run.authority.race',
  'proof',
  'client-submission-key.authority.race.001',
  jsonb_build_object(
    'selection_ids', jsonb_build_array('selection.authority.race'),
    'response_digest', 'sha256:' || repeat('e', 64),
    'explicit_uncertainty', false
  )
);
commit;

insert into forge.adr001_proof_challenges (
  challenge_id, owner_user_id, aggregate_id, trusted_runtime_tuple_id, issued_by_authority_id,
  nonce_digest, expires_at
) values (
  '86000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'run.authority.race',
  '83000000-0000-4000-8000-000000000001',
  'validator-authority.race',
  'sha256:' || repeat('f', 64),
  now() + interval '1 hour'
);
