-- Local-only helpers for the separate-session race fixture. These functions
-- are installed only in a named disposable database after fresh/upgrade
-- verification; no migration or production schema depends on them.

\set ON_ERROR_STOP on

create schema if not exists forge_test;
revoke all on schema forge_test from public;

insert into auth.users (id) values ('70000000-0000-4000-8000-000000000001')
on conflict do nothing;
insert into forge.profiles (user_id, display_name)
values ('70000000-0000-4000-8000-000000000001', 'ADR-001 race adult')
on conflict do nothing;
insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values ('70000000-0000-4000-8000-000000000001', 'adult', 'active')
on conflict do nothing;

create or replace function forge_test.v1_started(
  p_event_id uuid,
  p_aggregate_id text,
  p_idempotency_key text
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
    'event_type', 'world_run.started',
    'schema_version', 1,
    'aggregate', jsonb_build_object('type', 'world_run', 'id', p_aggregate_id, 'version', 1),
    'actor', jsonb_build_object('type', 'learner', 'id', 'actor.race.v1'),
    'authority', jsonb_build_object('policy_version', 'policy.race.v1', 'consent_grant_ids', jsonb_build_array()),
    'occurred_at', '2026-07-22T19:53:00.000Z',
    'recorded_at', '2026-07-22T19:53:00.000Z',
    'correlation_id', 'correlation.race.v1',
    'causation_id', null,
    'idempotency_key', p_idempotency_key,
    'payload', jsonb_build_object(
      'world_id', 'world.race.v1', 'world_version', '1.0.0', 'content_version', '1.0.0',
      'capability_id', 'capability.race.v1', 'proof_claim_id', 'claim.race.v1',
      'validator_id', 'validator.race.v1', 'validator_version', '1.0.0',
      'package_integrity_hash', 'sha256:' || repeat('a', 64), 'assistance_mode', 'closed',
      'source_ids', jsonb_build_array('source.race.v1'), 'proof_authority', 'honour_based'
    )
  );
  return v_unsigned || jsonb_build_object('integrity_hash', forge_private.sha256_jsonb(v_unsigned));
end;
$$;

create or replace function forge_test.v2_started(
  p_event_id uuid,
  p_aggregate_id text,
  p_idempotency_key text
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
    'event_type', 'world_run.started',
    'schema_version', 2,
    'aggregate', jsonb_build_object('type', 'world_run', 'id', p_aggregate_id, 'version', 1),
    'actor', jsonb_build_object('type', 'learner', 'id', 'device.222222222222222222222222'),
    'authority', jsonb_build_object('policy_version', 'policy.race.v2', 'consent_grant_ids', jsonb_build_array()),
    'occurred_at', '2026-07-22T19:53:00.000Z',
    'recorded_at', '2026-07-22T19:53:00.000Z',
    'correlation_id', 'correlation.race.v2',
    'causation_id', null,
    'idempotency_key', p_idempotency_key,
    'payload', jsonb_build_object(
      'world_id', 'world.race.v2', 'world_version', '1.0.0', 'content_version', '1.0.0',
      'package_integrity_hash', 'sha256:' || repeat('b', 64), 'runtime_binding_digest', 'sha256:' || repeat('c', 64),
      'protocol_version', '1.0.0', 'capability_id', 'capability.race.v2', 'proof_claim_id', 'claim.race.v2',
      'task_id', 'task.race.v2', 'task_version', '1.0.0', 'task_family_id', 'task-family.race.v2',
      'representation_id', 'representation.race.v2', 'context_id', 'context.race.v2',
      'bounded_claim', 'A bounded local race fixture claim.', 'validator_id', 'validator.race.v2',
      'validator_version', '1.0.0', 'proof_authority', 'honour_based',
      'source_bindings', jsonb_build_array(jsonb_build_object(
        'domain_source_ref', 'source-race-v2', 'source_item_id', 'source-item-race-v2',
        'source_package_id', 'source-package-race-v2', 'source_package_version', '1.0.0',
        'source_snapshot_digest', 'sha256:' || repeat('d', 64), 'locator_ids', jsonb_build_array('locator-race-v2'),
        'claim_ids', jsonb_build_array('claim-source-race-v2'), 'rights_record_id', 'rights-race-v2',
        'review_decision_ids', jsonb_build_array('review-race-v2'), 'provenance_status', 'bound'
      )),
      'source_provenance_status', 'bound'
    )
  );
  return v_unsigned || jsonb_build_object('integrity_hash', forge_private.sha256_jsonb(v_unsigned));
end;
$$;

grant usage on schema forge_test to authenticated, service_role;
grant execute on function forge_test.v1_started(uuid, text, text), forge_test.v2_started(uuid, text, text)
  to authenticated, service_role;
