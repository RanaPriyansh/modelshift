-- Creates one genuinely committed browser-authored v2 event before the
-- evidence-authority correction is applied.  Both fresh and legacy-upgrade
-- fixtures include this file after the historical v2 contract (which rolls
-- back its own test data) and before the correction migration.

\set ON_ERROR_STOP on

insert into auth.users (id)
values ('61000000-0000-4000-8000-000000000001')
on conflict do nothing;

insert into forge.profiles (user_id, display_name)
values ('61000000-0000-4000-8000-000000000001', 'ADR-001 pre-correction history owner')
on conflict do nothing;

insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values ('61000000-0000-4000-8000-000000000001', 'adult', 'active')
on conflict do nothing;

create or replace function pg_temp.seal_adr001_v2_precorrection_browser_event()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unsigned jsonb;
begin
  v_unsigned := jsonb_build_object(
    'event_id', '61000000-0000-4000-8000-000000000002',
    'event_type', 'world_run.started',
    'schema_version', 2,
    'aggregate', jsonb_build_object(
      'type', 'world_run',
      'id', 'run.precorrection.browser-history',
      'version', 1
    ),
    'actor', jsonb_build_object(
      'type', 'learner',
      'id', 'device.616161616161616161616161'
    ),
    'authority', jsonb_build_object(
      'policy_version', 'policy.precorrection.browser-history',
      'consent_grant_ids', jsonb_build_array()
    ),
    'occurred_at', '2026-07-22T23:00:00.000Z',
    'recorded_at', '2026-07-22T23:00:00.000Z',
    'correlation_id', 'correlation.precorrection.browser-history',
    'causation_id', null,
    'idempotency_key', 'idempotency.precorrection.browser-history',
    'payload', jsonb_build_object(
      'world_id', 'world.precorrection.browser-history',
      'world_version', '1.0.0',
      'content_version', '1.0.0',
      'package_integrity_hash', 'sha256:' || repeat('a', 64),
      'runtime_binding_digest', 'sha256:' || repeat('b', 64),
      'protocol_version', '1.0.0',
      'capability_id', 'capability.precorrection.browser-history',
      'proof_claim_id', 'claim.precorrection.browser-history',
      'task_id', 'task.precorrection.browser-history',
      'task_version', '1.0.0',
      'task_family_id', 'task-family.precorrection.browser-history',
      'representation_id', 'representation.precorrection.browser-history',
      'context_id', 'context.precorrection.browser-history',
      'bounded_claim', 'A pre-correction browser-authored event is retained only as unverified history.',
      'validator_id', 'validator.precorrection.browser-history',
      'validator_version', '1.0.0',
      'proof_authority', 'honour_based',
      'source_bindings', jsonb_build_array(jsonb_build_object(
        'domain_source_ref', 'source-ref.precorrection.browser-history',
        'source_item_id', 'source-item.precorrection.browser-history',
        'source_package_id', 'source-package.precorrection.browser-history',
        'source_package_version', '1.0.0',
        'source_snapshot_digest', 'sha256:' || repeat('c', 64),
        'locator_ids', jsonb_build_array('locator.precorrection.browser-history'),
        'claim_ids', jsonb_build_array('claim-source.precorrection.browser-history'),
        'rights_record_id', 'rights.precorrection.browser-history',
        'review_decision_ids', jsonb_build_array('review.precorrection.browser-history'),
        'provenance_status', 'bound'
      )),
      'source_provenance_status', 'bound'
    )
  );
  return v_unsigned || jsonb_build_object(
    'integrity_hash', forge_private.sha256_jsonb(v_unsigned)
  );
end;
$$;
revoke all on function pg_temp.seal_adr001_v2_precorrection_browser_event()
from public, anon, service_role;
grant execute on function pg_temp.seal_adr001_v2_precorrection_browser_event()
to authenticated;

begin;
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '61000000-0000-4000-8000-000000000001';

do $$
declare
  v_result jsonb;
begin
  v_result := forge.append_adr001_v2_event(
    pg_temp.seal_adr001_v2_precorrection_browser_event()
  );
  if v_result ->> 'disposition' <> 'appended' then
    raise exception 'pre-correction browser event was not appended';
  end if;
end;
$$;
commit;

do $$
begin
  if not exists (
    select 1
    from forge.adr001_event_journal
    where event_id = '61000000-0000-4000-8000-000000000002'
      and owner_user_id = '61000000-0000-4000-8000-000000000001'
      and aggregate_id = 'run.precorrection.browser-history'
  ) then
    raise exception 'pre-correction browser event did not survive its commit';
  end if;
end;
$$;
