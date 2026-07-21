-- Run after all migrations with psql -v ON_ERROR_STOP=1.
-- Catalog and behavioral checks are rolled back, leaving the database unchanged.

begin;

create or replace function pg_temp.seal_forge_event(
  p_event_id uuid,
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id text,
  p_aggregate_version bigint,
  p_correlation_id text,
  p_causation_id uuid,
  p_idempotency_key text,
  p_payload jsonb
)
returns jsonb
language plpgsql
as $$
declare
  unsigned_event jsonb;
begin
  unsigned_event := jsonb_build_object(
    'event_id', p_event_id,
    'event_type', p_event_type,
    'schema_version', 1,
    'aggregate', jsonb_build_object(
      'type', p_aggregate_type,
      'id', p_aggregate_id,
      'version', p_aggregate_version
    ),
    'actor', jsonb_build_object('type', 'system', 'id', 'actor.contract.001'),
    'authority', jsonb_build_object(
      'policy_version', 'policy.2026.07',
      'consent_grant_ids', jsonb_build_array('consent.contract.001')
    ),
    'occurred_at', '2026-07-22T08:00:00.000Z',
    'recorded_at', '2026-07-22T08:00:01.000Z',
    'correlation_id', p_correlation_id,
    'causation_id', p_causation_id,
    'idempotency_key', p_idempotency_key,
    'payload', p_payload
  );
  return unsigned_event || jsonb_build_object(
    'integrity_hash', forge_private.sha256_jsonb(unsigned_event)
  );
end;
$$;

do $$
declare
  missing_names text;
begin
  select string_agg(expected.table_name, ', ' order by expected.table_name)
  into missing_names
  from (
    values ('event_aggregate_heads'), ('event_journal'), ('event_outbox')
  ) as expected(table_name)
  where to_regclass(format('forge.%I', expected.table_name)) is null;
  if missing_names is not null then
    raise exception 'event spine tables missing: %', missing_names;
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'forge'
      and relation.relname in ('event_aggregate_heads', 'event_journal', 'event_outbox')
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  ) then
    raise exception 'event spine tables must enable and force RLS';
  end if;

  if not exists (
    select 1
    from pg_proc as function_record
    join pg_namespace as namespace on namespace.oid = function_record.pronamespace
    where namespace.nspname = 'forge'
      and function_record.proname = 'append_event'
      and function_record.prosecdef
      and function_record.proconfig @> array['search_path=""']::text[]
  ) then
    raise exception 'forge.append_event is not a hardened SECURITY DEFINER function';
  end if;

  if has_function_privilege('anon', 'forge.append_event(jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'forge.append_event(jsonb)', 'EXECUTE')
     or not has_function_privilege('service_role', 'forge.append_event(jsonb)', 'EXECUTE') then
    raise exception 'append_event execution privileges violate the service boundary';
  end if;

  if has_table_privilege('service_role', 'forge.event_journal', 'INSERT')
     or has_table_privilege('service_role', 'forge.event_journal', 'UPDATE')
     or has_table_privilege('service_role', 'forge.event_journal', 'DELETE')
     or has_table_privilege('service_role', 'forge.event_journal', 'TRUNCATE')
     or not has_table_privilege('service_role', 'forge.event_journal', 'SELECT')
     or has_table_privilege('authenticated', 'forge.event_journal', 'SELECT')
     or has_table_privilege('authenticated', 'forge.event_outbox', 'UPDATE') then
    raise exception 'event tables do not enforce least privilege';
  end if;

  select string_agg(expected.trigger_name, ', ' order by expected.trigger_name)
  into missing_names
  from (
    values ('event_journal_append_only'), ('event_journal_reject_truncate')
  ) as expected(trigger_name)
  where not exists (
    select 1
    from pg_trigger as trigger_record
    where trigger_record.tgrelid = 'forge.event_journal'::regclass
      and trigger_record.tgname = expected.trigger_name
      and not trigger_record.tgisinternal
      and trigger_record.tgenabled in ('O', 'A')
  );
  if missing_names is not null then
    raise exception 'append-only journal triggers missing: %', missing_names;
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.event_outbox'::regclass
      and constraint_record.contype = 'f'
      and pg_get_constraintdef(constraint_record.oid) like '%event_journal%'
  ) or not exists (
    select 1
    from pg_index as index_record
    where index_record.indrelid = 'forge.event_outbox'::regclass
      and index_record.indisunique
      and pg_get_indexdef(index_record.indexrelid) like '%(event_id)%'
  ) then
    raise exception 'outbox is not one-to-one with accepted journal events';
  end if;

  if forge_private.sha256_jsonb(
    '{"b":[2,{"z":false,"a":"value"}],"a":1}'::jsonb
  ) <> 'sha256:1693c8f8f03079200072a62d54f0d6ad2e4cf21d3cf7ff933055e3cc0aac5269' then
    raise exception 'Postgres canonical SHA-256 does not match the TypeScript fixture';
  end if;
end;
$$;

do $$
declare
  start_event jsonb;
  proof_event jsonb;
  evidence_event jsonb;
  completion_event jsonb;
  correction_event jsonb;
  candidate jsonb;
  append_result jsonb;
  digest_a text := 'sha256:' || repeat('a', 64);
  digest_b text := 'sha256:' || repeat('b', 64);
  digest_c text := 'sha256:' || repeat('c', 64);
  journal_count bigint;
  outbox_count bigint;
begin
  start_event := pg_temp.seal_forge_event(
    '10000000-0000-4000-8000-000000000001',
    'world_run.started',
    'world_run',
    'run.contract.001',
    1,
    'correlation.run.contract.001',
    null,
    'idempotency.run.contract.0001',
    jsonb_build_object(
      'world_id', 'world.force-and-motion',
      'world_version', '1.0.0',
      'content_version', '1.0.0',
      'capability_id', 'capability.inertia',
      'proof_claim_id', 'proof.inertia.transfer',
      'validator_id', 'validator.inertia.v1',
      'validator_version', '1.0.0',
      'package_integrity_hash', digest_a,
      'assistance_mode', 'hints_only',
      'source_ids', jsonb_build_array('source.newton.first-law'),
      'proof_authority', 'server_enforced'
    )
  );

  append_result := forge.append_event(start_event);
  if append_result ->> 'disposition' <> 'appended' then
    raise exception 'first event was not appended: %', append_result;
  end if;

  append_result := forge.append_event(start_event);
  if append_result ->> 'disposition' <> 'duplicate' then
    raise exception 'exact idempotent retry was not a no-op: %', append_result;
  end if;
  if (select count(*) from forge.event_journal) <> 1
     or (select count(*) from forge.event_outbox) <> 1 then
    raise exception 'idempotent retry created duplicate durable rows';
  end if;

  candidate := start_event
    || jsonb_build_object('event_id', '10000000-0000-4000-8000-000000000002');
  candidate := (candidate - 'integrity_hash') || jsonb_build_object(
    'integrity_hash', forge_private.sha256_jsonb(candidate - 'integrity_hash')
  );
  begin
    perform forge.append_event(candidate);
    raise exception 'expected an idempotency collision';
  exception when unique_violation then
    null;
  end;

  candidate := start_event
    || jsonb_build_object('idempotency_key', 'idempotency.run.contract.changed');
  candidate := (candidate - 'integrity_hash') || jsonb_build_object(
    'integrity_hash', forge_private.sha256_jsonb(candidate - 'integrity_hash')
  );
  begin
    perform forge.append_event(candidate);
    raise exception 'expected an event ID collision';
  exception when unique_violation then
    null;
  end;

  candidate := jsonb_set(start_event, '{payload,world_version}', '"9.0.0"'::jsonb);
  begin
    perform forge.append_event(candidate);
    raise exception 'expected an integrity mismatch';
  exception when data_exception then
    null;
  end;

  candidate := pg_temp.seal_forge_event(
    '10000000-0000-4000-8000-000000000003',
    'attempt.committed',
    'world_run',
    'run.contract.001',
    3,
    'correlation.run.contract.001',
    '10000000-0000-4000-8000-000000000001',
    'idempotency.run.contract.gap1',
    jsonb_build_object(
      'phase', 'initial',
      'stage_id', 'stage.prediction',
      'selection_ids', jsonb_build_array('choice.keeps-moving'),
      'response_digest', null,
      'explicit_uncertainty', false
    )
  );
  begin
    perform forge.append_event(candidate);
    raise exception 'expected an aggregate version conflict';
  exception when serialization_failure then
    null;
  end;

  candidate := pg_temp.seal_forge_event(
    '10000000-0000-4000-8000-000000000004',
    'evidence.recorded',
    'world_run',
    'run.contract.001',
    2,
    'correlation.run.contract.001',
    '10000000-0000-4000-8000-000000000001',
    'idempotency.run.contract.early-evidence',
    jsonb_build_object(
      'evidence_id', 'evidence.contract.001',
      'result', 'proved',
      'validator_id', 'validator.inertia.v1',
      'validator_version', '1.0.0',
      'source_ids', jsonb_build_array(),
      'assistance_event_ids', jsonb_build_array(),
      'remains_untested', jsonb_build_array('retention.delayed')
    )
  );
  begin
    perform forge.append_event(candidate);
    raise exception 'expected an out-of-order transition rejection';
  exception when check_violation then
    null;
  end;

  candidate := pg_temp.seal_forge_event(
    '10000000-0000-4000-8000-000000000005',
    'attempt.committed',
    'world_run',
    'run.contract.001',
    2,
    'correlation.run.contract.001',
    '10000000-0000-4000-8000-000000000001',
    'idempotency.run.contract.raw-text',
    jsonb_build_object(
      'phase', 'initial',
      'stage_id', 'stage.prediction',
      'selection_ids', jsonb_build_array(),
      'response_digest', digest_b,
      'explicit_uncertainty', false,
      'raw_text', 'I think it stops'
    )
  );
  begin
    perform forge.append_event(candidate);
    raise exception 'expected raw learner text rejection';
  exception when check_violation then
    null;
  end;

  proof_event := pg_temp.seal_forge_event(
    '10000000-0000-4000-8000-000000000006',
    'proof.submitted',
    'world_run',
    'run.contract.001',
    2,
    'correlation.run.contract.001',
    '10000000-0000-4000-8000-000000000001',
    'idempotency.run.contract.proof',
    jsonb_build_object(
      'task_id', 'task.transfer.001',
      'task_version', '1.0.0',
      'transfer_family_id', 'transfer.graph-to-story',
      'selection_ids', jsonb_build_array('choice.constant-velocity'),
      'response_digest', digest_b,
      'assistance_access', 'removed',
      'proof_nonce_digest', digest_c
    )
  );
  perform forge.append_event(proof_event);

  evidence_event := pg_temp.seal_forge_event(
    '10000000-0000-4000-8000-000000000007',
    'evidence.recorded',
    'world_run',
    'run.contract.001',
    3,
    'correlation.run.contract.001',
    '10000000-0000-4000-8000-000000000006',
    'idempotency.run.contract.evidence',
    jsonb_build_object(
      'evidence_id', 'evidence.contract.001',
      'result', 'proved',
      'validator_id', 'validator.inertia.v1',
      'validator_version', '1.0.0',
      'source_ids', jsonb_build_array('source.newton.first-law'),
      'assistance_event_ids', jsonb_build_array(),
      'remains_untested', jsonb_build_array('retention.delayed')
    )
  );
  perform forge.append_event(evidence_event);

  completion_event := pg_temp.seal_forge_event(
    '10000000-0000-4000-8000-000000000008',
    'world_run.completed',
    'world_run',
    'run.contract.001',
    4,
    'correlation.run.contract.001',
    '10000000-0000-4000-8000-000000000007',
    'idempotency.run.contract.completed',
    jsonb_build_object(
      'result', 'proved',
      'evidence_id', 'evidence.contract.001',
      'next_review_at', '2026-08-22T08:00:00.000Z'
    )
  );
  perform forge.append_event(completion_event);

  correction_event := pg_temp.seal_forge_event(
    '10000000-0000-4000-8000-000000000009',
    'world_run.corrected',
    'world_run',
    'run.contract.001',
    5,
    'correlation.run.contract.001',
    '10000000-0000-4000-8000-000000000008',
    'idempotency.run.contract.correction',
    jsonb_build_object(
      'supersedes_event_id', '10000000-0000-4000-8000-000000000007',
      'reason_code', 'validator.rule-revised',
      'correction_reference', 'review.correction.001'
    )
  );
  perform forge.append_event(correction_event);

  if not exists (
    select 1 from forge.event_aggregate_heads
    where aggregate_type = 'world_run'
      and aggregate_id = 'run.contract.001'
      and current_version = 5
      and lifecycle_state = 'completed'
      and state_data ->> 'world_version' = '1.0.0'
      and state_data ->> 'evidence_id' = 'evidence.contract.001'
  ) then
    raise exception 'run projection head does not match deterministic replay state';
  end if;

  if not exists (
    select 1 from forge.event_journal
    where event_id = '10000000-0000-4000-8000-000000000007'
      and event_type = 'evidence.recorded'
      and payload ->> 'result' = 'proved'
  ) then
    raise exception 'correction rewrote or hid the historical evidence event';
  end if;

  begin
    update forge.event_journal
    set payload = '{}'::jsonb
    where event_id = '10000000-0000-4000-8000-000000000007';
    raise exception 'expected append-only update rejection';
  exception when sqlstate '55000' then
    null;
  end;

  select count(*), (select count(*) from forge.event_outbox)
  into journal_count, outbox_count
  from forge.event_journal;
  if journal_count <> outbox_count then
    raise exception 'journal/outbox atomicity mismatch: % journal rows, % outbox rows', journal_count, outbox_count;
  end if;
end;
$$;

do $$
declare
  digest_a text := 'sha256:' || repeat('a', 64);
  digest_b text := 'sha256:' || repeat('b', 64);
  published_v1 jsonb;
  superseded_v1 jsonb;
  published_v2 jsonb;
  disabled_v1 jsonb;
  disabled_event jsonb;
begin
  published_v1 := pg_temp.seal_forge_event(
    '20000000-0000-4000-8000-000000000001',
    'world_package.published',
    'world_package',
    'package.motion.1-0-0',
    1,
    'correlation.package.motion.1-0-0',
    null,
    'idempotency.package.motion.publish-v1',
    jsonb_build_object(
      'world_id', 'world.force-and-motion',
      'world_version', '1.0.0',
      'content_version', '1.0.0',
      'bundle_integrity_hash', digest_a
    )
  );
  perform forge.append_event(published_v1);

  superseded_v1 := pg_temp.seal_forge_event(
    '20000000-0000-4000-8000-000000000002',
    'world_package.superseded',
    'world_package',
    'package.motion.1-0-0',
    2,
    'correlation.package.motion.1-0-0',
    '20000000-0000-4000-8000-000000000001',
    'idempotency.package.motion.supersede-v1',
    jsonb_build_object(
      'world_id', 'world.force-and-motion',
      'world_version', '1.0.0',
      'successor_version', '2.0.0',
      'successor_bundle_integrity_hash', digest_b
    )
  );
  perform forge.append_event(superseded_v1);

  published_v2 := pg_temp.seal_forge_event(
    '20000000-0000-4000-8000-000000000003',
    'world_package.published',
    'world_package',
    'package.motion.2-0-0',
    1,
    'correlation.package.motion.2-0-0',
    null,
    'idempotency.package.motion.publish-v2',
    jsonb_build_object(
      'world_id', 'world.force-and-motion',
      'world_version', '2.0.0',
      'content_version', '2.0.0',
      'bundle_integrity_hash', digest_b
    )
  );
  perform forge.append_event(published_v2);

  disabled_v1 := pg_temp.seal_forge_event(
    '20000000-0000-4000-8000-000000000004',
    'world_package.published',
    'world_package',
    'package.archived.1-0-0',
    1,
    'correlation.package.archived.1-0-0',
    null,
    'idempotency.package.archived.publish',
    jsonb_build_object(
      'world_id', 'world.archived-example',
      'world_version', '1.0.0',
      'content_version', '1.0.0',
      'bundle_integrity_hash', digest_a
    )
  );
  perform forge.append_event(disabled_v1);

  disabled_event := pg_temp.seal_forge_event(
    '20000000-0000-4000-8000-000000000005',
    'world_package.disabled',
    'world_package',
    'package.archived.1-0-0',
    2,
    'correlation.package.archived.1-0-0',
    '20000000-0000-4000-8000-000000000004',
    'idempotency.package.archived.disable',
    jsonb_build_object(
      'world_id', 'world.archived-example',
      'world_version', '1.0.0',
      'reason_code', 'safety.review-required'
    )
  );
  perform forge.append_event(disabled_event);

  if not exists (
    select 1 from forge.event_aggregate_heads
    where aggregate_id = 'package.motion.1-0-0'
      and lifecycle_state = 'superseded'
      and state_data ->> 'world_version' = '1.0.0'
      and state_data ->> 'successor_version' = '2.0.0'
  ) or not exists (
    select 1 from forge.event_aggregate_heads
    where aggregate_id = 'package.motion.2-0-0'
      and lifecycle_state = 'published'
      and state_data ->> 'world_version' = '2.0.0'
  ) or not exists (
    select 1 from forge.event_aggregate_heads
    where aggregate_id = 'package.archived.1-0-0'
      and lifecycle_state = 'disabled'
      and state_data ->> 'disabled_reason_code' = 'safety.review-required'
  ) then
    raise exception 'package disable/supersession history was not preserved';
  end if;

  if (
    select count(*) from forge.event_journal
    where aggregate_id in ('package.motion.1-0-0', 'package.motion.2-0-0', 'package.archived.1-0-0')
  ) <> 5 then
    raise exception 'package lifecycle replay rows are incomplete';
  end if;

  if (select count(*) from forge.event_journal) <> (select count(*) from forge.event_outbox) then
    raise exception 'every accepted package event must have exactly one outbox row';
  end if;
end;
$$;

select 'FORGE event spine contract passed' as result;

rollback;
