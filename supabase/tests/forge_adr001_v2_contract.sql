-- Shared ADR-001 v2 SQL contract. Fresh and legacy-upgrade fixtures prepare
-- migrations, then include this file. It is deliberately transaction-scoped.

\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.seal_adr001_v2_event(
  p_event_id uuid,
  p_event_type text,
  p_aggregate_id text,
  p_aggregate_version bigint,
  p_correlation_id text,
  p_causation_id uuid,
  p_idempotency_key text,
  p_payload jsonb,
  p_actor_type text default 'learner'
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
    'aggregate', jsonb_build_object('type', 'world_run', 'id', p_aggregate_id, 'version', p_aggregate_version),
    'actor', jsonb_build_object('type', p_actor_type, 'id', 'device.111111111111111111111111'),
    'authority', jsonb_build_object('policy_version', 'policy.fixture.2026.07', 'consent_grant_ids', jsonb_build_array()),
    'occurred_at', '2026-07-22T08:00:00.000Z',
    'recorded_at', '2026-07-22T08:00:00.000Z',
    'correlation_id', p_correlation_id,
    'causation_id', p_causation_id,
    'idempotency_key', p_idempotency_key,
    'payload', p_payload
  );
  return v_unsigned || jsonb_build_object('integrity_hash', forge_private.sha256_jsonb(v_unsigned));
end;
$$;

create or replace function pg_temp.reseal_adr001_v2_event(p_event jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select (p_event - 'integrity_hash') || jsonb_build_object(
    'integrity_hash', forge_private.sha256_jsonb(p_event - 'integrity_hash')
  );
$$;

create or replace function pg_temp.seal_v1_started_event(
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
    'actor', jsonb_build_object('type', 'learner', 'id', 'actor.fixture.v1'),
    'authority', jsonb_build_object('policy_version', 'policy.fixture.2026.07', 'consent_grant_ids', jsonb_build_array()),
    'occurred_at', '2026-07-22T08:00:00.000Z',
    'recorded_at', '2026-07-22T08:00:00.000Z',
    'correlation_id', 'correlation.fixture.v1',
    'causation_id', null,
    'idempotency_key', p_idempotency_key,
    'payload', jsonb_build_object(
      'world_id', 'world.fixture.v1',
      'world_version', '1.0.0',
      'content_version', '1.0.0',
      'capability_id', 'capability.fixture.v1',
      'proof_claim_id', 'claim.fixture.v1',
      'validator_id', 'validator.fixture.v1',
      'validator_version', '1.0.0',
      'package_integrity_hash', 'sha256:' || repeat('a', 64),
      'assistance_mode', 'closed',
      'source_ids', jsonb_build_array('source.fixture.v1'),
      'proof_authority', 'honour_based'
    )
  );
  return v_unsigned || jsonb_build_object('integrity_hash', forge_private.sha256_jsonb(v_unsigned));
end;
$$;

create or replace function pg_temp.adr001_started_payload()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'world_id', 'world.fixture.v2',
    'world_version', '1.0.0',
    'content_version', '1.0.0',
    'package_integrity_hash', 'sha256:' || repeat('a', 64),
    'runtime_binding_digest', 'sha256:' || repeat('d', 64),
    'protocol_version', '1.0.0',
    'capability_id', 'capability.fixture.v2',
    'proof_claim_id', 'claim.fixture.v2',
    'task_id', 'task.fixture.v2',
    'task_version', '1.0.0',
    'task_family_id', 'task-family.fixture.v2',
    'representation_id', 'representation.fixture.v2',
    'context_id', 'context.fixture.v2',
    'bounded_claim', 'A bounded fixture claim.',
    'validator_id', 'validator.fixture.v2',
    'validator_version', '1.0.0',
    'proof_authority', 'honour_based',
    'source_bindings', jsonb_build_array(jsonb_build_object(
      'domain_source_ref', 'source-ref.fixture.v2',
      'source_item_id', 'source-item.fixture.v2',
      'source_package_id', 'source-package.fixture.v2',
      'source_package_version', '1.0.0',
      'source_snapshot_digest', 'sha256:' || repeat('b', 64),
      'locator_ids', jsonb_build_array('locator.fixture.v2'),
      'claim_ids', jsonb_build_array('claim-source.fixture.v2'),
      'rights_record_id', 'rights.fixture.v2',
      'review_decision_ids', jsonb_build_array('review.fixture.v2'),
      'provenance_status', 'bound'
    )),
    'source_provenance_status', 'bound'
  );
$$;

-- Fixture setup runs as the local database owner; no authenticated public
-- profile or consent path is enabled by this test.
insert into auth.users (id) values
  ('30000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000001')
on conflict do nothing;
insert into forge.profiles (user_id, display_name)
values
  ('30000000-0000-4000-8000-000000000001', 'ADR-001 adult owner one'),
  ('40000000-0000-4000-8000-000000000001', 'ADR-001 adult owner two')
on conflict do nothing;
insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values
  ('30000000-0000-4000-8000-000000000001', 'adult', 'active'),
  ('40000000-0000-4000-8000-000000000001', 'adult', 'active')
on conflict do nothing;

-- Authenticated owner one appends an exact, replayable v2 lifecycle. The
-- outbox must contain one row for each committed event, including the retry.
set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';

do $$
declare
  started jsonb;
  proof jsonb;
  evidence jsonb;
  completed jsonb;
  correction jsonb;
  append_result jsonb;
  malformed jsonb;
  tampered jsonb;
  candidate jsonb;
begin
  started := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000001',
    'world_run.started', 'run.fixture.v2', 1, 'correlation.fixture.v2', null,
    'idempotency.fixture.v2.started', pg_temp.adr001_started_payload()
  );
  append_result := forge.append_adr001_v2_event(started);
  if append_result ->> 'disposition' <> 'appended' then
    raise exception 'ADR-001 start was not appended';
  end if;
  append_result := forge.append_adr001_v2_event(started);
  if append_result ->> 'disposition' <> 'duplicate'
     or (select count(*) from forge.adr001_event_journal where aggregate_id = 'run.fixture.v2') <> 1
     or (select count(*) from forge.adr001_event_outbox where event_id = '31000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'ADR-001 exact duplicate retry changed durable state';
  end if;

  malformed := pg_temp.reseal_adr001_v2_event(started || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000008',
    'aggregate', jsonb_build_object('type', 'world_run', 'id', 'run.missing-runtime.fixture', 'version', 1),
    'idempotency_key', 'idempotency.fixture.v2.missing-runtime',
    'payload', (started -> 'payload') - 'runtime_binding_digest'
  ));
  begin
    perform forge.append_adr001_v2_event(malformed);
    raise exception 'expected omitted ADR-001 runtime binding digest refusal';
  exception when check_violation then
    null;
  end;

  candidate := pg_temp.reseal_adr001_v2_event(started || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000099'
  ));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected ADR-001 idempotency collision';
  exception when unique_violation then
    null;
  end;
  candidate := pg_temp.reseal_adr001_v2_event(started || jsonb_build_object(
    'idempotency_key', 'idempotency.fixture.v2.event-id-collision'
  ));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected ADR-001 event-ID collision';
  exception when unique_violation then
    null;
  end;

  proof := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000002',
    'proof.submitted', 'run.fixture.v2', 2, 'correlation.fixture.v2',
    '31000000-0000-4000-8000-000000000001', 'idempotency.fixture.v2.proof',
    jsonb_build_object(
      'task_id', 'task.fixture.v2', 'task_version', '1.0.0', 'task_family_id', 'task-family.fixture.v2',
      'representation_id', 'representation.fixture.v2', 'context_id', 'context.fixture.v2',
      'selection_ids', jsonb_build_array('selection.fixture.v2'), 'response_digest', 'sha256:' || repeat('c', 64),
      'explicit_uncertainty', false, 'assistance_access', 'removed', 'proof_nonce_digest', null,
      'access_accommodations', jsonb_build_array()
    )
  );
  candidate := pg_temp.reseal_adr001_v2_event(proof || jsonb_build_object('aggregate', jsonb_build_object(
    'type', 'world_run', 'id', 'run.fixture.v2', 'version', 3
  )));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected ADR-001 out-of-order aggregate version refusal';
  exception when serialization_failure then
    null;
  end;
  candidate := pg_temp.reseal_adr001_v2_event(proof || jsonb_build_object('correlation_id', 'correlation.fixture.changed'));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected ADR-001 correlation refusal';
  exception when check_violation then
    null;
  end;
  candidate := pg_temp.reseal_adr001_v2_event(proof || jsonb_build_object(
    'causation_id', '31000000-0000-4000-8000-000000000099'
  ));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected ADR-001 causation refusal';
  exception when check_violation then
    null;
  end;
  perform forge.append_adr001_v2_event(proof);

  evidence := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000003',
    'evidence.recorded', 'run.fixture.v2', 3, 'correlation.fixture.v2',
    '31000000-0000-4000-8000-000000000002', 'idempotency.fixture.v2.evidence',
    jsonb_build_object(
      'evidence_id', 'evidence.fixture.v2', 'disposition', 'demonstrated', 'validator_outcome', 'pass',
      'validator_id', 'validator.fixture.v2', 'validator_version', '1.0.0',
      'task_id', 'task.fixture.v2', 'task_version', '1.0.0', 'task_family_id', 'task-family.fixture.v2',
      'representation_id', 'representation.fixture.v2', 'context_id', 'context.fixture.v2',
      'criteria', jsonb_build_array('Fixture criterion.'), 'proof_authority', 'honour_based',
      'cognitive_support_event_ids', jsonb_build_array(), 'access_accommodations', jsonb_build_array(),
      'source_bindings', pg_temp.adr001_started_payload() -> 'source_bindings', 'source_provenance_status', 'bound',
      'runtime_binding_digest', 'sha256:' || repeat('d', 64),
      'response_digest', 'sha256:' || repeat('c', 64), 'explicit_uncertainty', false,
      'authored_uncertainty_exception_reference', null,
      'validity', jsonb_build_object(
        'package_integrity_matches', true, 'proof_authority_matches', true,
        'contamination_reason_codes', jsonb_build_array(), 'construct_changing_accommodation', false
      ),
      'remains_untested', jsonb_build_array('Delayed evidence remains untested.'),
      'bounded_claim', 'A bounded fixture claim.'
    )
  );
  candidate := pg_temp.reseal_adr001_v2_event(evidence || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000009',
    'idempotency_key', 'idempotency.fixture.v2.stale-runtime',
    'payload', (evidence -> 'payload') || jsonb_build_object('runtime_binding_digest', 'sha256:' || repeat('e', 64))
  ));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected mismatched ADR-001 runtime binding digest refusal';
  exception when check_violation then
    null;
  end;
  candidate := pg_temp.reseal_adr001_v2_event(evidence || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000012',
    'idempotency_key', 'idempotency.fixture.v2.empty-limitations',
    'payload', (evidence -> 'payload') || jsonb_build_object('remains_untested', jsonb_build_array())
  ));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected empty ADR-001 remains_untested refusal';
  exception when check_violation then
    null;
  end;
  perform forge.append_adr001_v2_event(evidence);

  completed := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000004',
    'world_run.completed', 'run.fixture.v2', 4, 'correlation.fixture.v2',
    '31000000-0000-4000-8000-000000000003', 'idempotency.fixture.v2.completed',
    jsonb_build_object('disposition', 'demonstrated', 'evidence_id', 'evidence.fixture.v2', 'next_review_at', null)
  );
  perform forge.append_adr001_v2_event(completed);

  correction := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000005',
    'world_run.corrected', 'run.fixture.v2', 5, 'correlation.fixture.v2',
    '31000000-0000-4000-8000-000000000004', 'idempotency.fixture.v2.corrected',
    jsonb_build_object(
      'supersedes_event_id', '31000000-0000-4000-8000-000000000003', 'correction_id', 'correction.fixture.v2',
      'reason_code', 'validator.fixture.revised', 'correction_reference', 'review.fixture.corrected',
      'replacement_disposition', 'not_demonstrated', 'replacement_validator_outcome', 'fail',
      'replacement_criteria', jsonb_build_array('Corrected fixture criterion.'),
      'replacement_explicit_uncertainty', false, 'replacement_authored_uncertainty_exception_reference', null,
      'replacement_validity', jsonb_build_object(
        'package_integrity_matches', true, 'proof_authority_matches', true,
        'contamination_reason_codes', jsonb_build_array(), 'construct_changing_accommodation', false
      )
    ), 'validator'
  );
  begin
    perform forge.append_adr001_v2_event(correction);
    raise exception 'expected direct ADR-001 correction refusal';
  exception when insufficient_privilege then
    null;
  end;

  if (select count(*) from forge.adr001_event_journal where aggregate_id = 'run.fixture.v2') <> 4
     or (select count(*) from forge.adr001_event_outbox where owner_user_id = '30000000-0000-4000-8000-000000000001') <> 4
     or not exists (
       select 1 from forge.adr001_event_aggregate_heads
       where aggregate_id = 'run.fixture.v2' and current_version = 4 and lifecycle_state = 'completed'
     ) then
    raise exception 'ADR-001 replay or transactionally coupled outbox state is incomplete';
  end if;

  tampered := started || jsonb_build_object('payload', (started -> 'payload') || jsonb_build_object('world_version', '2.0.0'));
  begin
    perform forge.append_adr001_v2_event(tampered);
    raise exception 'expected ADR-001 tampered integrity refusal';
  exception when data_exception then
    null;
  end;

  malformed := pg_temp.reseal_adr001_v2_event(started || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000010',
    'aggregate', jsonb_build_object('type', 'world_run', 'id', 'run.malformed.fixture', 'version', 1),
    'idempotency_key', 'idempotency.fixture.v2.malformed',
    'payload', (started -> 'payload') || jsonb_build_object('raw_text', 'forbidden learner prose')
  ));
  begin
    perform forge.append_adr001_v2_event(malformed);
    raise exception 'expected ADR-001 recursive forbidden-text refusal';
  exception when check_violation then
    null;
  end;

  malformed := pg_temp.reseal_adr001_v2_event(started || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000011',
    'aggregate', jsonb_build_object('type', 'world_run', 'id', 'run.oversize.fixture', 'version', 1),
    'idempotency_key', 'idempotency.fixture.v2.oversize',
    'payload', (started -> 'payload') || jsonb_build_object('bounded_claim', repeat('x', 1201))
  ));
  begin
    perform forge.append_adr001_v2_event(malformed);
    raise exception 'expected ADR-001 bounded payload refusal';
  exception when check_violation then
    null;
  end;
end;
$$;

-- Evidence must retain cognitive-support facts in emitted order. A set match
-- is insufficient because the support sequence is part of the replayable run.
set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
do $$
declare
  started jsonb;
  support_one jsonb;
  support_two jsonb;
  proof jsonb;
  evidence jsonb;
  candidate jsonb;
begin
  started := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000060', 'world_run.started', 'run.support-order.fixture', 1,
    'correlation.support-order.fixture', null, 'idempotency.fixture.v2.support-order.started', pg_temp.adr001_started_payload()
  );
  perform forge.append_adr001_v2_event(started);
  support_one := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000061', 'assistance.recorded', 'run.support-order.fixture', 2,
    'correlation.support-order.fixture', '31000000-0000-4000-8000-000000000060',
    'idempotency.fixture.v2.support-order.one',
    jsonb_build_object(
      'support_id', 'support-order-one', 'stage_id', 'encounter', 'tier', 'attention', 'source', 'authored',
      'content_reference', 'content-support-order-one', 'policy_version', 'policy.fixture.2026.07',
      'provider_id', null, 'model_id', null, 'fallback_reason', null, 'protected_operation_overlap', 0
    )
  );
  perform forge.append_adr001_v2_event(support_one);
  support_two := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000062', 'assistance.recorded', 'run.support-order.fixture', 3,
    'correlation.support-order.fixture', '31000000-0000-4000-8000-000000000061',
    'idempotency.fixture.v2.support-order.two',
    jsonb_build_object(
      'support_id', 'support-order-two', 'stage_id', 'encounter', 'tier', 'cue', 'source', 'authored',
      'content_reference', 'content-support-order-two', 'policy_version', 'policy.fixture.2026.07',
      'provider_id', null, 'model_id', null, 'fallback_reason', null, 'protected_operation_overlap', 0
    )
  );
  perform forge.append_adr001_v2_event(support_two);
  proof := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000063', 'proof.submitted', 'run.support-order.fixture', 4,
    'correlation.support-order.fixture', '31000000-0000-4000-8000-000000000062',
    'idempotency.fixture.v2.support-order.proof',
    jsonb_build_object(
      'task_id', 'task.fixture.v2', 'task_version', '1.0.0', 'task_family_id', 'task-family.fixture.v2',
      'representation_id', 'representation.fixture.v2', 'context_id', 'context.fixture.v2',
      'selection_ids', jsonb_build_array('selection.fixture.v2'), 'response_digest', 'sha256:' || repeat('c', 64),
      'explicit_uncertainty', false, 'assistance_access', 'removed', 'proof_nonce_digest', null,
      'access_accommodations', jsonb_build_array()
    )
  );
  perform forge.append_adr001_v2_event(proof);
  evidence := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000064', 'evidence.recorded', 'run.support-order.fixture', 5,
    'correlation.support-order.fixture', '31000000-0000-4000-8000-000000000063',
    'idempotency.fixture.v2.support-order.evidence',
    jsonb_build_object(
      'evidence_id', 'evidence-support-order', 'disposition', 'demonstrated', 'validator_outcome', 'pass',
      'validator_id', 'validator.fixture.v2', 'validator_version', '1.0.0', 'task_id', 'task.fixture.v2',
      'task_version', '1.0.0', 'task_family_id', 'task-family.fixture.v2', 'representation_id', 'representation.fixture.v2',
      'context_id', 'context.fixture.v2', 'criteria', jsonb_build_array('Support sequence criterion.'),
      'proof_authority', 'honour_based',
      'cognitive_support_event_ids', jsonb_build_array(
        '31000000-0000-4000-8000-000000000061', '31000000-0000-4000-8000-000000000062'
      ),
      'access_accommodations', jsonb_build_array(), 'source_bindings', pg_temp.adr001_started_payload() -> 'source_bindings',
      'source_provenance_status', 'bound', 'runtime_binding_digest', 'sha256:' || repeat('d', 64),
      'response_digest', 'sha256:' || repeat('c', 64), 'explicit_uncertainty', false,
      'authored_uncertainty_exception_reference', null,
      'validity', jsonb_build_object(
        'package_integrity_matches', true, 'proof_authority_matches', true,
        'contamination_reason_codes', jsonb_build_array(), 'construct_changing_accommodation', false
      ), 'remains_untested', jsonb_build_array('Support-order fixture remains untested.'),
      'bounded_claim', 'A bounded support-order fixture claim.'
    )
  );
  candidate := pg_temp.reseal_adr001_v2_event(evidence || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000065',
    'idempotency_key', 'idempotency.fixture.v2.support-order.reordered',
    'payload', (evidence -> 'payload') || jsonb_build_object('cognitive_support_event_ids', jsonb_build_array(
      '31000000-0000-4000-8000-000000000062', '31000000-0000-4000-8000-000000000061'
    ))
  ));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected reordered cognitive support sequence refusal';
  exception when check_violation then
    null;
  end;
  candidate := pg_temp.reseal_adr001_v2_event(evidence || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000066',
    'idempotency_key', 'idempotency.fixture.v2.support-order.missing',
    'payload', (evidence -> 'payload') || jsonb_build_object('cognitive_support_event_ids', jsonb_build_array(
      '31000000-0000-4000-8000-000000000061'
    ))
  ));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected missing cognitive support sequence refusal';
  exception when check_violation then
    null;
  end;
  candidate := pg_temp.reseal_adr001_v2_event(evidence || jsonb_build_object(
    'event_id', '31000000-0000-4000-8000-000000000067',
    'idempotency_key', 'idempotency.fixture.v2.support-order.extra',
    'payload', (evidence -> 'payload') || jsonb_build_object('cognitive_support_event_ids', jsonb_build_array(
      '31000000-0000-4000-8000-000000000061', '31000000-0000-4000-8000-000000000062',
      '31000000-0000-4000-8000-000000000068'
    ))
  ));
  begin
    perform forge.append_adr001_v2_event(candidate);
    raise exception 'expected extra cognitive support sequence refusal';
  exception when check_violation then
    null;
  end;
  perform forge.append_adr001_v2_event(evidence);
end;
$$;
reset role;

-- A forced outbox insert failure must roll back the journal and aggregate head
-- written earlier in the same appender transaction.
reset role;
create or replace function forge_private.fixture_adr001_outbox_failure()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'fixture outbox failure' using errcode = 'P0001';
end;
$$;
create trigger fixture_adr001_outbox_failure
before insert on forge.adr001_event_outbox
for each row execute function forge_private.fixture_adr001_outbox_failure();

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
do $$
declare
  partial_event jsonb;
begin
  partial_event := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000020', 'world_run.started', 'run.partial.fixture', 1,
    'correlation.partial.fixture', null, 'idempotency.fixture.v2.partial', pg_temp.adr001_started_payload()
  );
  begin
    perform forge.append_adr001_v2_event(partial_event);
    raise exception 'expected fixture outbox failure';
  exception when raise_exception then
    null;
  end;
  if exists (select 1 from forge.adr001_event_journal where aggregate_id = 'run.partial.fixture')
     or exists (select 1 from forge.adr001_event_aggregate_heads where aggregate_id = 'run.partial.fixture')
     or exists (select 1 from forge.adr001_event_outbox where event_id = '31000000-0000-4000-8000-000000000020') then
    raise exception 'ADR-001 partial append left durable state after outbox failure';
  end if;
end;
$$;
reset role;
drop trigger fixture_adr001_outbox_failure on forge.adr001_event_outbox;
drop function forge_private.fixture_adr001_outbox_failure();

-- Source provenance is exact: model support identifies both provider and
-- model, and only authored support may carry a fallback reason.
do $$
declare
  model_support jsonb;
  authored_support jsonb;
  malformed_support jsonb;
begin
  model_support := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000023', 'assistance.recorded', 'run.assistance-shape.fixture', 2,
    'correlation.assistance-shape.fixture', '31000000-0000-4000-8000-000000000022',
    'idempotency.fixture.v2.assistance-model',
    jsonb_build_object(
      'support_id', 'support.model.fixture', 'stage_id', 'encounter', 'tier', 'cue', 'source', 'model',
      'content_reference', 'content.model.fixture', 'policy_version', 'policy.fixture.2026.07',
      'provider_id', 'provider.fixture', 'model_id', 'model.fixture', 'fallback_reason', null,
      'protected_operation_overlap', 0
    )
  );
  perform forge_private.assert_adr001_event_shape(model_support);

  authored_support := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000024', 'assistance.recorded', 'run.assistance-shape.fixture', 3,
    'correlation.assistance-shape.fixture', '31000000-0000-4000-8000-000000000023',
    'idempotency.fixture.v2.assistance-authored',
    jsonb_build_object(
      'support_id', 'support.authored.fixture', 'stage_id', 'encounter', 'tier', 'cue', 'source', 'authored',
      'content_reference', 'content.authored.fixture', 'policy_version', 'policy.fixture.2026.07',
      'provider_id', null, 'model_id', null, 'fallback_reason', 'fallback.fixture', 'protected_operation_overlap', 0
    )
  );
  perform forge_private.assert_adr001_event_shape(authored_support);

  malformed_support := pg_temp.reseal_adr001_v2_event(model_support || jsonb_build_object(
    'payload', (model_support -> 'payload') || jsonb_build_object('provider_id', null)
  ));
  begin
    perform forge_private.assert_adr001_event_shape(malformed_support);
    raise exception 'expected model assistance without provider refusal';
  exception when check_violation then
    null;
  end;
  malformed_support := pg_temp.reseal_adr001_v2_event(authored_support || jsonb_build_object(
    'payload', (authored_support -> 'payload') || jsonb_build_object('provider_id', 'provider.fixture')
  ));
  begin
    perform forge_private.assert_adr001_event_shape(malformed_support);
    raise exception 'expected authored assistance provider refusal';
  exception when check_violation then
    null;
  end;
  malformed_support := pg_temp.reseal_adr001_v2_event(model_support || jsonb_build_object(
    'payload', (model_support -> 'payload') || jsonb_build_object('fallback_reason', 'fallback.fixture')
  ));
  begin
    perform forge_private.assert_adr001_event_shape(malformed_support);
    raise exception 'expected model assistance fallback refusal';
  exception when check_violation then
    null;
  end;
end;
$$;

-- A service role cannot execute the direct learner appender, even when it
-- supplies adult-looking request claims. This prevents a BYPASSRLS worker
-- from forging durable learner history.
set local role service_role;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
do $$
declare
  malformed jsonb;
  correction jsonb;
begin
  malformed := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000021', 'world_run.started', 'run.service-malformed.fixture', 1,
    'correlation.service-malformed.fixture', null, 'idempotency.fixture.v2.service-malformed',
    pg_temp.adr001_started_payload() || jsonb_build_object('raw_text', 'forbidden')
  );
  begin
    perform forge.append_adr001_v2_event(malformed);
    raise exception 'service_role executed the direct learner appender';
  exception when insufficient_privilege then
    null;
  end;

  correction := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000022', 'world_run.corrected', 'run.service-correction.fixture', 1,
    'correlation.service-correction.fixture', null, 'idempotency.fixture.v2.service-correction',
    jsonb_build_object(
      'supersedes_event_id', '31000000-0000-4000-8000-000000000003', 'correction_id', 'correction.service.fixture',
      'reason_code', 'review.revised', 'correction_reference', 'review.service.fixture',
      'replacement_disposition', 'not_demonstrated', 'replacement_validator_outcome', 'fail',
      'replacement_criteria', jsonb_build_array('Corrected service fixture criterion.'),
      'replacement_explicit_uncertainty', false, 'replacement_authored_uncertainty_exception_reference', null,
      'replacement_validity', jsonb_build_object(
        'package_integrity_matches', true, 'proof_authority_matches', true,
        'contamination_reason_codes', jsonb_build_array(), 'construct_changing_accommodation', false
      )
    ), 'validator'
  );
  begin
    perform forge.append_adr001_v2_event(correction);
    raise exception 'service_role created direct ADR-001 correction authority';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Owner two can neither discover nor append to owner one's aggregate.
set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
do $$
declare
  foreign_append jsonb;
begin
  if (select count(*) from forge.adr001_event_journal where aggregate_id = 'run.fixture.v2') <> 0 then
    raise exception 'ADR-001 RLS leaked owner-one history to owner two';
  end if;
  foreign_append := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000030', 'attempt.committed', 'run.fixture.v2', 6,
    'correlation.fixture.v2', '31000000-0000-4000-8000-000000000005', 'idempotency.fixture.v2.foreign',
    jsonb_build_object(
      'phase', 'initial', 'stage_id', 'encounter', 'selection_ids', jsonb_build_array('selection.fixture.v2'),
      'response_digest', null, 'explicit_uncertainty', false
    )
  );
  begin
    perform forge.append_adr001_v2_event(foreign_append);
    raise exception 'expected owner-two append refusal';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- Version bridge: an aggregate can belong to exactly one event schema, while
-- version-1 history remains appendable when it does not collide with v2.
set local role service_role;
do $$
declare
  v1_event jsonb;
begin
  v1_event := pg_temp.seal_v1_started_event(
    '31000000-0000-4000-8000-000000000040', 'run.mixed.v1.fixture', 'idempotency.fixture.v1.mixed'
  );
  perform forge.append_event(v1_event);
end;
$$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
do $$
declare
  v2_event jsonb;
begin
  v2_event := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000041', 'world_run.started', 'run.mixed.v1.fixture', 1,
    'correlation.mixed.v1.fixture', null, 'idempotency.fixture.v2.mixed-after-v1', pg_temp.adr001_started_payload()
  );
  begin
    perform forge.append_adr001_v2_event(v2_event);
    raise exception 'expected v2-after-v1 schema mixing refusal';
  exception when check_violation then
    null;
  end;
end;
$$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
do $$
declare
  v2_event jsonb;
begin
  v2_event := pg_temp.seal_adr001_v2_event(
    '31000000-0000-4000-8000-000000000050', 'world_run.started', 'run.mixed.v2.fixture', 1,
    'correlation.mixed.v2.fixture', null, 'idempotency.fixture.v2.mixed', pg_temp.adr001_started_payload()
  );
  perform forge.append_adr001_v2_event(v2_event);
end;
$$;
reset role;

set local role service_role;
do $$
declare
  v1_event jsonb;
begin
  v1_event := pg_temp.seal_v1_started_event(
    '31000000-0000-4000-8000-000000000051', 'run.mixed.v2.fixture', 'idempotency.fixture.v1.mixed-after-v2'
  );
  begin
    perform forge.append_event(v1_event);
    raise exception 'expected v1-after-v2 schema mixing refusal';
  exception when check_violation then
    null;
  end;
end;
$$;
reset role;

-- Event identity claims and event documents remain immutable even to the
-- local database owner; the delivery worker receives state-only functions.
do $$
begin
  begin
    update forge.event_identity_claims
    set event_document = '{}'::jsonb
    where event_id = '31000000-0000-4000-8000-000000000001';
    raise exception 'expected immutable global event-ID claim refusal';
  exception when object_not_in_prerequisite_state then
    null;
  end;
  begin
    update forge.adr001_event_outbox
    set event_document = '{}'::jsonb
    where event_id = '31000000-0000-4000-8000-000000000001';
    raise exception 'expected immutable ADR-001 outbox document refusal';
  exception when object_not_in_prerequisite_state then
    null;
  end;
  begin
    truncate table forge.adr001_event_outbox;
    raise exception 'expected ADR-001 outbox TRUNCATE refusal';
  exception when object_not_in_prerequisite_state then
    null;
  end;
  begin
    truncate table forge.event_outbox;
    raise exception 'expected legacy outbox TRUNCATE refusal';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  -- Every named delivery field is a legal pending retry transition, so the
  -- table-level error-code constraint is the reason this direct update fails.
  begin
    update forge.event_outbox
    set attempts = attempts + 1,
        status = 'pending',
        available_at = available_at + interval '1 minute',
        claimed_at = now(),
        published_at = null,
        last_error_code = 'Raw learner prose is not an error code',
        updated_at = now()
    where event_id = '31000000-0000-4000-8000-000000000040';
    raise exception 'expected persisted legacy outbox error-code constraint refusal';
  exception when check_violation then
    null;
  end;
end;
$$;

set local role service_role;
do $$
declare
  v_delivery jsonb;
begin
  begin
    update forge.adr001_event_outbox
    set topic = 'forge.tampered'
    where event_id = '31000000-0000-4000-8000-000000000001';
    raise exception 'expected service-role direct ADR-001 outbox UPDATE refusal';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform forge.mark_adr001_event_outbox_delivery(
      '31000000-0000-4000-8000-000000000001', false, null
    );
    raise exception 'expected ADR-001 delivery function misuse refusal';
  exception when invalid_parameter_value then
    null;
  end;
  v_delivery := forge.mark_adr001_event_outbox_delivery(
    '31000000-0000-4000-8000-000000000001', false, now() + interval '1 minute'
  );
  if (v_delivery ->> 'delivery_attempts')::integer <> 1
     or v_delivery ->> 'delivered_at' is not null then
    raise exception 'ADR-001 delivery function did not perform the legal retry transition';
  end if;

  begin
    update forge.event_outbox
    set event_document = '{}'::jsonb
    where event_id = '31000000-0000-4000-8000-000000000040';
    raise exception 'expected service-role direct legacy outbox UPDATE refusal';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform forge.mark_event_outbox_delivery(
      '31000000-0000-4000-8000-000000000040', 'pending', now() + interval '1 minute',
      'raw learner prose is not an error code'
    );
    raise exception 'expected legacy outbox unbounded error-code refusal';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform forge.mark_event_outbox_delivery(
      '31000000-0000-4000-8000-000000000040', 'pending', now() + interval '1 minute', 'ab'
    );
    raise exception 'expected two-character legacy outbox error-code refusal';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform forge.mark_event_outbox_delivery(
      '31000000-0000-4000-8000-000000000040', 'pending', now() + interval '1 minute',
      'a' || repeat('b', 80)
    );
    raise exception 'expected 81-character legacy outbox error-code refusal';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform forge.mark_event_outbox_delivery(
      '31000000-0000-4000-8000-000000000040', 'pending', now() + interval '1 minute', 'Delivery.Retry'
    );
    raise exception 'expected uppercase legacy outbox error-code refusal';
  exception when invalid_parameter_value then
    null;
  end;
  v_delivery := forge.mark_event_outbox_delivery(
    '31000000-0000-4000-8000-000000000040', 'pending', now() + interval '1 minute', 'delivery.retry'
  );
  if v_delivery ->> 'status' <> 'pending' or (v_delivery ->> 'attempts')::integer <> 1 then
    raise exception 'legacy delivery function did not perform the legal retry transition';
  end if;
  v_delivery := forge.mark_event_outbox_delivery(
    '31000000-0000-4000-8000-000000000040', 'pending', now() + interval '2 minutes', 'a.b'
  );
  if (v_delivery ->> 'attempts')::integer <> 2 then
    raise exception 'legacy delivery function rejected the three-character error-code boundary';
  end if;
  v_delivery := forge.mark_event_outbox_delivery(
    '31000000-0000-4000-8000-000000000040', 'pending', now() + interval '3 minutes',
    'a' || repeat('b', 79)
  );
  if (v_delivery ->> 'attempts')::integer <> 3 then
    raise exception 'legacy delivery function rejected the 80-character error-code boundary';
  end if;
  v_delivery := forge.mark_event_outbox_delivery(
    '31000000-0000-4000-8000-000000000040', 'pending', now() + interval '4 minutes', null
  );
  if (v_delivery ->> 'attempts')::integer <> 4 then
    raise exception 'legacy delivery function rejected a null error code';
  end if;
end;
$$;
reset role;

-- The retired consent remains historically readable but cannot become a v2
-- prerequisite or be recreated, including by service_role.
set local role service_role;
do $$
declare
  refused boolean := false;
begin
  begin
    insert into forge.consent_records (
      learner_user_id, purpose_key, decision, actor_user_id, actor_capacity, policy_version
    ) values (
      '30000000-0000-4000-8000-000000000001', 'private_evidence_persistence', 'granted',
      '30000000-0000-4000-8000-000000000001', 'learner', 'fixture.retired.adr001'
    );
  exception when check_violation then
    refused := true;
  end;
  if not refused then
    raise exception 'service_role recreated retired private-evidence consent';
  end if;
end;
$$;
reset role;

\ir forge_adr001_v2_golden_contract.sql

select 'FORGE ADR-001 v2 persistence contract passed' as result;

rollback;
