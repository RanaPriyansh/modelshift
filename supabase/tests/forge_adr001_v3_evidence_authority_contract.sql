-- ADR-001 v3 authority correction contract.  This runs after the historical
-- v2 contract: it proves that browser calls can only create observations while
-- the server-only projection path is tuple, nonce, and authority bound.

\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.seal_adr001_v3_event(
  p_event_id uuid,
  p_event_type text,
  p_aggregate_id text,
  p_aggregate_version bigint,
  p_correlation_id text,
  p_causation_id uuid,
  p_idempotency_key text,
  p_actor_type text,
  p_actor_id text,
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
    'aggregate', jsonb_build_object('type', 'world_run', 'id', p_aggregate_id, 'version', p_aggregate_version),
    'actor', jsonb_build_object('type', p_actor_type, 'id', p_actor_id),
    'authority', jsonb_build_object('policy_version', 'policy.authority.fixture.2026.07', 'consent_grant_ids', jsonb_build_array()),
    'occurred_at', '2026-07-23T08:00:00.000Z',
    'recorded_at', '2026-07-23T08:00:00.000Z',
    'correlation_id', p_correlation_id,
    'causation_id', p_causation_id,
    'idempotency_key', p_idempotency_key,
    'payload', p_payload
  );
  return v_unsigned || jsonb_build_object('integrity_hash', forge_private.sha256_jsonb(v_unsigned));
end;
$$;

create or replace function pg_temp.adr001_v3_start_payload()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'world_id', 'world.authority.fixture',
    'world_version', '1.0.0',
    'content_version', '1.0.0',
    'package_integrity_hash', 'sha256:' || repeat('a', 64),
    'runtime_binding_digest', 'sha256:' || repeat('b', 64),
    'protocol_version', '1.0.0',
    'capability_id', 'capability.authority.fixture',
    'proof_claim_id', 'proof.authority.fixture',
    'task_id', 'task.authority.fixture',
    'task_version', '1.0.0',
    'task_family_id', 'task-family.authority.fixture',
    'representation_id', 'representation.authority.fixture',
    'context_id', 'context.authority.fixture',
    'bounded_claim', 'A bounded server-authority fixture claim.',
    'validator_id', 'validator.authority.fixture',
    'validator_version', '1.0.0',
    'proof_authority', 'honour_based',
    'source_bindings', jsonb_build_array(jsonb_build_object(
      'domain_source_ref', 'source-authority-fixture',
      'source_item_id', 'source-item-authority-fixture',
      'source_package_id', 'source-package-authority-fixture',
      'source_package_version', '1.0.0',
      'source_snapshot_digest', 'sha256:' || repeat('c', 64),
      'locator_ids', jsonb_build_array('locator-authority-fixture'),
      'claim_ids', jsonb_build_array('claim-authority-fixture'),
      'rights_record_id', 'rights-authority-fixture',
      'review_decision_ids', jsonb_build_array('review-authority-fixture'),
      'provenance_status', 'bound'
    )),
    'source_provenance_status', 'bound'
  );
$$;

create or replace function pg_temp.adr001_v3_proof_payload(p_nonce_digest text)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'task_id', 'task.authority.fixture',
    'task_version', '1.0.0',
    'task_family_id', 'task-family.authority.fixture',
    'representation_id', 'representation.authority.fixture',
    'context_id', 'context.authority.fixture',
    'selection_ids', jsonb_build_array('selection.authority.fixture'),
    'response_digest', 'sha256:' || repeat('e', 64),
    'explicit_uncertainty', false,
    'assistance_access', 'removed',
    'proof_nonce_digest', p_nonce_digest,
    'access_accommodations', jsonb_build_array()
  );
$$;

do $$
begin
  if not exists (
    select 1 from pg_proc as proc
    join pg_namespace as namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'forge'
      and proc.proname = 'append_adr001_v2_validated_event'
  ) then
    raise exception 'ADR-001 v3 validated projection function is missing';
  end if;
  if not exists (
    select 1 from pg_proc as proc
    join pg_namespace as namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'forge'
      and proc.proname = 'read_adr001_v2_authoritative_events'
      and proc.prosecdef
  ) then
    raise exception 'ADR-001 receipt-required authoritative read function is missing or is not security definer';
  end if;
  if not exists (
    select 1 from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'forge'
      and relation.relname in (
        'adr001_untrusted_learner_submissions',
        'adr001_server_validator_authorities',
        'adr001_trusted_runtime_tuples',
        'adr001_run_authority_bindings',
        'adr001_proof_challenges',
        'adr001_event_projection_receipts'
      )
    group by namespace.nspname
    having count(*) = 6
  ) then
    raise exception 'ADR-001 v3 authority tables are incomplete';
  end if;
  if exists (
    select 1
    from information_schema.role_routine_grants
    where routine_schema = 'forge'
      and routine_name = 'append_adr001_v2_event'
      and grantee in ('PUBLIC', 'authenticated')
      and privilege_type = 'EXECUTE'
  ) then
    raise exception 'ADR-001 legacy canonical appender remains browser callable';
  end if;
  if exists (
    select 1
    from information_schema.role_routine_grants
    where routine_schema = 'forge'
      and routine_name = 'append_adr001_v2_validated_event'
      and grantee in ('PUBLIC', 'authenticated')
      and privilege_type = 'EXECUTE'
  ) then
    raise exception 'ADR-001 validated projection remains browser callable';
  end if;
  if not has_function_privilege(
    'service_role',
    'forge.append_adr001_v2_validated_event(uuid, text, uuid, uuid, jsonb)'::regprocedure,
    'EXECUTE'
  ) then
    raise exception 'ADR-001 service role cannot call the only canonical projection function';
  end if;
  if has_table_privilege('service_role', 'forge.adr001_server_validator_authorities', 'INSERT')
     or has_table_privilege('service_role', 'forge.adr001_server_validator_authorities', 'UPDATE')
     or has_table_privilege('service_role', 'forge.adr001_trusted_runtime_tuples', 'INSERT')
     or has_table_privilege('service_role', 'forge.adr001_trusted_runtime_tuples', 'UPDATE')
     or has_table_privilege('service_role', 'forge.adr001_proof_challenges', 'INSERT')
     or has_table_privilege('service_role', 'forge.adr001_proof_challenges', 'UPDATE') then
    raise exception 'ADR-001 service role may not install, revoke, issue, or consume authority material directly';
  end if;
  if has_sequence_privilege('authenticated', 'forge.adr001_untrusted_learner_submissions_id_seq', 'USAGE') then
    raise exception 'ADR-001 learner inbox must not expose direct sequence usage';
  end if;
  if has_table_privilege('authenticated', 'forge.adr001_event_journal', 'SELECT')
     or has_table_privilege('authenticated', 'forge.adr001_event_aggregate_heads', 'SELECT')
     or has_table_privilege('authenticated', 'forge.adr001_event_outbox', 'SELECT')
     or has_table_privilege('authenticated', 'forge.adr001_event_projection_receipts', 'SELECT') then
    raise exception 'ADR-001 authenticated role retains a raw canonical/receipt table read bypass';
  end if;
  if has_table_privilege('authenticated', 'forge.adr001_event_projection_receipts', 'INSERT')
     or has_table_privilege('service_role', 'forge.adr001_event_projection_receipts', 'INSERT') then
    raise exception 'ADR-001 application roles can forge projection receipts directly';
  end if;
  if not has_function_privilege(
    'authenticated',
    'forge.read_adr001_v2_authoritative_events()'::regprocedure,
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'forge.read_adr001_v2_authoritative_events()'::regprocedure,
    'EXECUTE'
  ) or has_function_privilege(
    'service_role',
    'forge.read_adr001_v2_authoritative_events()'::regprocedure,
    'EXECUTE'
  ) then
    raise exception 'ADR-001 authoritative read function grants are not owner-only';
  end if;
  if exists (
    select 1
    from pg_policy
    where polrelid in (
      'forge.adr001_event_journal'::regclass,
      'forge.adr001_event_aggregate_heads'::regclass,
      'forge.adr001_event_outbox'::regclass
    )
      and polroles && array['authenticated'::regrole::oid]
  ) then
    raise exception 'ADR-001 raw canonical tables retain authenticated RLS policies';
  end if;
  if not exists (
    select 1
    from forge.adr001_event_journal
    where event_id = '61000000-0000-4000-8000-000000000002'
      and owner_user_id = '61000000-0000-4000-8000-000000000001'
  ) or exists (
    select 1
    from forge.adr001_event_projection_receipts
    where canonical_event_id = '61000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'ADR-001 configured fixture lacks committed unreceipted pre-correction browser history';
  end if;
end;
$$;

-- The historical event remains physically present for operator audit, but its
-- owner cannot read raw canonical tables and the receipt-required function
-- cannot return it as authoritative.
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '61000000-0000-4000-8000-000000000001';
do $$
begin
  begin
    perform 1
    from forge.adr001_event_journal
    where event_id = '61000000-0000-4000-8000-000000000002';
    raise exception 'expected raw historical journal read refusal';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform 1
    from forge.adr001_event_projection_receipts
    where canonical_event_id = '61000000-0000-4000-8000-000000000002';
    raise exception 'expected raw projection receipt read refusal';
  exception when insufficient_privilege then
    null;
  end;
  if exists (
    select 1
    from forge.read_adr001_v2_authoritative_events()
    where event_id = '61000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'unreceipted pre-correction browser history appeared authoritative';
  end if;
  begin
    insert into forge.adr001_event_projection_receipts (
      canonical_event_id,
      owner_user_id,
      validator_authority_id,
      trusted_runtime_tuple_id,
      learner_submission_id,
      projection_kind
    ) values (
      '61000000-0000-4000-8000-000000000002',
      '61000000-0000-4000-8000-000000000001',
      'validator-authority.forged',
      '61000000-0000-4000-8000-000000000003',
      null,
      'run_start'
    );
    raise exception 'expected authenticated projection receipt forgery refusal';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

insert into auth.users (id) values
  ('51000000-0000-4000-8000-000000000001'),
  ('52000000-0000-4000-8000-000000000001')
on conflict do nothing;

set local role service_role;
insert into forge.profiles (user_id, display_name)
values
  ('51000000-0000-4000-8000-000000000001', 'ADR-001 v3 authority adult'),
  ('52000000-0000-4000-8000-000000000001', 'ADR-001 v3 other adult')
on conflict do nothing;
insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values
  ('51000000-0000-4000-8000-000000000001', 'adult', 'active'),
  ('52000000-0000-4000-8000-000000000001', 'adult', 'active')
on conflict do nothing;

-- Authority and tuple installation are a separate deployment/validator-admin
-- operation. The service role may project only against installed records.
reset role;
do $$
declare
  v_start_payload jsonb := pg_temp.adr001_v3_start_payload();
  v_other_scope_payload jsonb;
  v_before_journal integer;
  v_before_head integer;
  v_before_outbox integer;
begin
  v_other_scope_payload := v_start_payload || jsonb_build_object(
    'validator_id', 'validator.authority.other',
    'context_id', 'context.authority.other',
    'runtime_binding_digest', 'sha256:' || repeat('9', 64)
  );
  insert into forge.adr001_server_validator_authorities (
    authority_id, authority_kind, authority_scope_digest
  ) values (
    'validator-authority.fixture',
    'server_validator',
    forge_private.adr001_validator_scope_digest(v_start_payload)
  );
  insert into forge.adr001_trusted_runtime_tuples (
    tuple_id, validator_authority_id, tuple_digest, start_payload
  ) values (
    '53000000-0000-4000-8000-000000000001',
    'validator-authority.fixture',
    forge_private.sha256_jsonb(v_start_payload),
    v_start_payload
  );

  if forge_private.adr001_validator_scope_digest(v_start_payload)
     = forge_private.adr001_validator_scope_digest(v_other_scope_payload) then
    raise exception 'validator scope digest did not change with validator/context/runtime scope';
  end if;

  select count(*) into v_before_journal from forge.adr001_event_journal;
  select count(*) into v_before_head from forge.adr001_event_aggregate_heads;
  select count(*) into v_before_outbox from forge.adr001_event_outbox;
  begin
    insert into forge.adr001_trusted_runtime_tuples (
      tuple_id, validator_authority_id, tuple_digest, start_payload
    ) values (
      '53000000-0000-4000-8000-000000000099',
      'validator-authority.fixture',
      forge_private.sha256_jsonb(v_other_scope_payload),
      v_other_scope_payload
    );
    raise exception 'expected validator authority scope mismatch refusal';
  exception when foreign_key_violation then
    null;
  end;
  if (select count(*) from forge.adr001_event_journal) <> v_before_journal
     or (select count(*) from forge.adr001_event_aggregate_heads) <> v_before_head
     or (select count(*) from forge.adr001_event_outbox) <> v_before_outbox
     or exists (
       select 1 from forge.adr001_trusted_runtime_tuples
       where tuple_id = '53000000-0000-4000-8000-000000000099'
     ) then
    raise exception 'tampered validator scope created tuple or canonical mutation';
  end if;

  insert into forge.adr001_server_validator_authorities (
    authority_id, authority_kind, authority_scope_digest
  ) values (
    'validator-authority.other',
    'server_validator',
    forge_private.adr001_validator_scope_digest(v_other_scope_payload)
  );
  insert into forge.adr001_trusted_runtime_tuples (
    tuple_id, validator_authority_id, tuple_digest, start_payload
  ) values (
    '53000000-0000-4000-8000-000000000002',
    'validator-authority.other',
    forge_private.sha256_jsonb(v_other_scope_payload),
    v_other_scope_payload
  );
end;
$$;

-- A learner may create a bounded proof observation, but fields that look like
-- validator/proof authority/nonce/disposition facts fail the exact-shape gate.
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '51000000-0000-4000-8000-000000000001';
insert into forge.adr001_untrusted_learner_submissions (
  submission_id, owner_user_id, aggregate_id, submission_kind, client_submission_key, submission_document
) values (
  '54000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  'run.authority.fixture',
  'proof',
  'client-submission-key.authority.fixture.001',
  jsonb_build_object(
    'selection_ids', jsonb_build_array('selection.authority.fixture'),
    'response_digest', 'sha256:' || repeat('e', 64),
    'explicit_uncertainty', false
  )
);

do $$
begin
  if not exists (
    select 1
    from forge.adr001_untrusted_learner_submissions
    where submission_id = '54000000-0000-4000-8000-000000000001'
      and id > 0
  ) then
    raise exception 'generated identity inbox insert did not work with sequence usage revoked';
  end if;
end;
$$;

do $$
begin
  begin
    insert into forge.adr001_untrusted_learner_submissions (
      submission_id, owner_user_id, aggregate_id, submission_kind, client_submission_key, submission_document
    ) values (
      '54000000-0000-4000-8000-000000000002',
      '51000000-0000-4000-8000-000000000001',
      'run.authority.fixture',
      'proof',
      'client-submission-key.authority.fixture.002',
      jsonb_build_object(
        'selection_ids', jsonb_build_array('selection.authority.fixture'),
        'response_digest', 'sha256:' || repeat('e', 64),
        'explicit_uncertainty', false,
        'validator_id', 'validator.client-forged'
      )
    );
    raise exception 'expected privileged learner submission field rejection';
  exception when check_violation then
    null;
  end;
  begin
    perform forge.append_adr001_v2_event('{}'::jsonb);
    raise exception 'expected direct browser canonical writer refusal';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform forge.append_adr001_v2_validated_event(
      '51000000-0000-4000-8000-000000000001',
      'validator-authority.fixture',
      '53000000-0000-4000-8000-000000000001',
      null,
      '{}'::jsonb
    );
    raise exception 'expected browser validated projection refusal';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into forge.adr001_untrusted_learner_submissions (
      submission_id, owner_user_id, aggregate_id, submission_kind, client_submission_key, submission_document
    ) values (
      '54000000-0000-4000-8000-000000000003',
      '52000000-0000-4000-8000-000000000001',
      'run.authority.fixture',
      'observation',
      'client-submission-key.authority.fixture.003',
      jsonb_build_object('observation_kind', 'observation.fixture', 'observation_digest', 'sha256:' || repeat('f', 64))
    );
    raise exception 'expected cross-owner submission refusal';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Only the service role with the registered authority and exact tuple may
-- start a canonical run.  The projection receipt binds that external authority
-- atomically to the journal/head/outbox append.
set local role service_role;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = 'service-role-fixture';
do $$
declare
  v_start jsonb;
  v_historical_event_id_replay jsonb;
  v_before_journal integer;
  v_before_head integer;
  v_before_outbox integer;
  v_before_receipts integer;
begin
  v_start := pg_temp.seal_adr001_v3_event(
    '55000000-0000-4000-8000-000000000001',
    'world_run.started',
    'run.authority.fixture',
    1,
    'correlation.authority.fixture',
    null,
    'idempotency.authority.fixture.started',
    'learner',
    'device.111111111111111111111111',
    pg_temp.adr001_v3_start_payload()
  );
  perform forge.append_adr001_v2_validated_event(
    '51000000-0000-4000-8000-000000000001',
    'validator-authority.fixture',
    '53000000-0000-4000-8000-000000000001',
    null,
    v_start
  );
  if (select count(*) from forge.adr001_event_journal where aggregate_id = 'run.authority.fixture') <> 1
     or (select count(*) from forge.adr001_event_aggregate_heads where aggregate_id = 'run.authority.fixture') <> 1
     or (select count(*) from forge.adr001_event_outbox where event_id = '55000000-0000-4000-8000-000000000001') <> 1
     or not exists (
       select 1 from forge.adr001_event_projection_receipts
       where canonical_event_id = '55000000-0000-4000-8000-000000000001'
         and validator_authority_id = 'validator-authority.fixture'
         and trusted_runtime_tuple_id = '53000000-0000-4000-8000-000000000001'
         and projection_kind = 'run_start'
  ) then
    raise exception 'authority-bound canonical run start did not atomically create its receipt';
  end if;

  select count(*) into v_before_journal from forge.adr001_event_journal;
  select count(*) into v_before_head from forge.adr001_event_aggregate_heads;
  select count(*) into v_before_outbox from forge.adr001_event_outbox;
  select count(*) into v_before_receipts from forge.adr001_event_projection_receipts;
  perform forge.append_adr001_v2_validated_event(
    '51000000-0000-4000-8000-000000000001',
    'validator-authority.fixture',
    '53000000-0000-4000-8000-000000000001',
    null,
    v_start
  );
  if (select count(*) from forge.adr001_event_journal) <> v_before_journal
     or (select count(*) from forge.adr001_event_aggregate_heads) <> v_before_head
     or (select count(*) from forge.adr001_event_outbox) <> v_before_outbox
     or (select count(*) from forge.adr001_event_projection_receipts) <> v_before_receipts then
    raise exception 'exact duplicate run start forged or duplicated canonical authority state';
  end if;

  -- A server projection cannot retroactively bless a pre-correction browser
  -- event by replaying its event ID with a newly trusted tuple.
  v_historical_event_id_replay := pg_temp.seal_adr001_v3_event(
    '61000000-0000-4000-8000-000000000002',
    'world_run.started',
    'run.authority.historical-replay',
    1,
    'correlation.authority.historical-replay',
    null,
    'idempotency.authority.historical-replay',
    'learner',
    'device.111111111111111111111111',
    pg_temp.adr001_v3_start_payload()
  );
  begin
    perform forge.append_adr001_v2_validated_event(
      '51000000-0000-4000-8000-000000000001',
      'validator-authority.fixture',
      '53000000-0000-4000-8000-000000000001',
      null,
      v_historical_event_id_replay
    );
    raise exception 'expected historical event-ID replay refusal';
  exception when unique_violation then
    null;
  end;
  if (select count(*) from forge.adr001_event_journal) <> v_before_journal
     or (select count(*) from forge.adr001_event_aggregate_heads) <> v_before_head
     or (select count(*) from forge.adr001_event_outbox) <> v_before_outbox
     or (select count(*) from forge.adr001_event_projection_receipts) <> v_before_receipts
     or exists (
       select 1
       from forge.adr001_event_projection_receipts
       where canonical_event_id = '61000000-0000-4000-8000-000000000002'
     ) then
    raise exception 'historical event-ID replay mutated canonical state or forged a receipt';
  end if;

  select count(*) into v_before_journal from forge.adr001_event_journal;
  select count(*) into v_before_head from forge.adr001_event_aggregate_heads;
  select count(*) into v_before_outbox from forge.adr001_event_outbox;
  begin
    perform forge.append_adr001_v2_validated_event(
      '51000000-0000-4000-8000-000000000001',
      'validator-authority.fixture',
      '53000000-0000-4000-8000-000000000099',
      null,
      v_start
    );
    raise exception 'expected forged trusted tuple refusal';
  exception when insufficient_privilege then
    null;
  end;
  if (select count(*) from forge.adr001_event_journal) <> v_before_journal
     or (select count(*) from forge.adr001_event_aggregate_heads) <> v_before_head
     or (select count(*) from forge.adr001_event_outbox) <> v_before_outbox then
    raise exception 'forged tuple attempt mutated canonical journal, head, or outbox';
  end if;
end;
$$;

-- The owner-facing read returns the exact post-correction projection and its
-- immutable receipt, but neither another owner nor the historical owner can
-- see it.
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '51000000-0000-4000-8000-000000000001';
do $$
begin
  if (
    select count(*)
    from forge.read_adr001_v2_authoritative_events()
    where event_id = '55000000-0000-4000-8000-000000000001'
      and event_type = 'world_run.started'
      and aggregate_id = 'run.authority.fixture'
      and aggregate_version = 1
      and projection_kind = 'run_start'
      and validator_authority_id = 'validator-authority.fixture'
      and trusted_runtime_tuple_id = '53000000-0000-4000-8000-000000000001'
      and current_authority_status = 'active'
      and current_tuple_status = 'active'
      and authority_receipt_verified
  ) <> 1 then
    raise exception 'post-correction projected event is absent or incompletely authority-bound in owner read';
  end if;
end;
$$;

set local request.jwt.claim.sub = '52000000-0000-4000-8000-000000000001';
do $$
begin
  if exists (
    select 1
    from forge.read_adr001_v2_authoritative_events()
    where event_id = '55000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'another owner can read an authority-bound event';
  end if;
end;
$$;
reset role;

-- Challenge issuance is tuple-authority bound in the schema. A mismatched
-- issuing authority cannot be stored. A valid challenge for another tuple and
-- authority cannot be consumed by this run's projector.
reset role;
do $$
declare
  v_before_journal integer;
  v_before_head integer;
  v_before_outbox integer;
begin
  select count(*) into v_before_journal from forge.adr001_event_journal;
  select count(*) into v_before_head from forge.adr001_event_aggregate_heads;
  select count(*) into v_before_outbox from forge.adr001_event_outbox;
  begin
    insert into forge.adr001_proof_challenges (
      challenge_id, owner_user_id, aggregate_id, trusted_runtime_tuple_id, issued_by_authority_id,
      nonce_digest, expires_at
    ) values (
      '56000000-0000-4000-8000-000000000099',
      '51000000-0000-4000-8000-000000000001',
      'run.authority.fixture',
      '53000000-0000-4000-8000-000000000001',
      'validator-authority.other',
      'sha256:' || repeat('8', 64),
      now() + interval '1 hour'
    );
    raise exception 'expected cross-authority challenge issuance refusal';
  exception when foreign_key_violation then
    null;
  end;
  if (select count(*) from forge.adr001_event_journal) <> v_before_journal
     or (select count(*) from forge.adr001_event_aggregate_heads) <> v_before_head
     or (select count(*) from forge.adr001_event_outbox) <> v_before_outbox
     or exists (
       select 1 from forge.adr001_proof_challenges
       where challenge_id = '56000000-0000-4000-8000-000000000099'
     ) then
    raise exception 'cross-authority challenge issuance created challenge or canonical mutation';
  end if;
end;
$$;

insert into forge.adr001_proof_challenges (
  challenge_id, owner_user_id, aggregate_id, trusted_runtime_tuple_id, issued_by_authority_id,
  nonce_digest, expires_at
) values (
  '56000000-0000-4000-8000-000000000002',
  '51000000-0000-4000-8000-000000000001',
  'run.authority.fixture',
  '53000000-0000-4000-8000-000000000002',
  'validator-authority.other',
  'sha256:' || repeat('1', 64),
  now() + interval '1 hour'
);

set local role service_role;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = 'service-role-fixture';
do $$
declare
  v_cross_proof jsonb;
  v_before_journal integer;
  v_before_head integer;
  v_before_outbox integer;
  v_before_receipts integer;
begin
  v_cross_proof := pg_temp.seal_adr001_v3_event(
    '55000000-0000-4000-8000-000000000009',
    'proof.submitted',
    'run.authority.fixture',
    2,
    'correlation.authority.fixture',
    '55000000-0000-4000-8000-000000000001',
    'idempotency.authority.fixture.cross-authority-proof',
    'learner',
    'device.111111111111111111111111',
    pg_temp.adr001_v3_proof_payload('sha256:' || repeat('1', 64))
  );
  select count(*) into v_before_journal from forge.adr001_event_journal;
  select count(*) into v_before_head from forge.adr001_event_aggregate_heads;
  select count(*) into v_before_outbox from forge.adr001_event_outbox;
  select count(*) into v_before_receipts from forge.adr001_event_projection_receipts;
  begin
    perform forge.append_adr001_v2_validated_event(
      '51000000-0000-4000-8000-000000000001',
      'validator-authority.fixture',
      '53000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      v_cross_proof
    );
    raise exception 'expected cross-authority challenge consumption refusal';
  exception when insufficient_privilege then
    null;
  end;
  if (select count(*) from forge.adr001_event_journal) <> v_before_journal
     or (select count(*) from forge.adr001_event_aggregate_heads) <> v_before_head
     or (select count(*) from forge.adr001_event_outbox) <> v_before_outbox
     or (select count(*) from forge.adr001_event_projection_receipts) <> v_before_receipts
     or (select status from forge.adr001_proof_challenges where challenge_id = '56000000-0000-4000-8000-000000000002') <> 'issued' then
    raise exception 'cross-authority challenge consumption mutated canonical or challenge state';
  end if;
end;
$$;

-- The database operator now issues the matching challenge used by the positive
-- projection below. Service role still has no direct INSERT/UPDATE grant.
reset role;
insert into forge.adr001_proof_challenges (
  challenge_id, owner_user_id, aggregate_id, trusted_runtime_tuple_id, issued_by_authority_id,
  nonce_digest, expires_at
) values (
  '56000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  'run.authority.fixture',
  '53000000-0000-4000-8000-000000000001',
  'validator-authority.fixture',
  'sha256:' || repeat('f', 64),
  now() + interval '1 hour'
);

set local role service_role;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = 'service-role-fixture';

do $$
declare
  v_proof jsonb;
  v_before_journal integer;
  v_before_head integer;
  v_before_outbox integer;
  v_before_receipts integer;
begin
  v_proof := pg_temp.seal_adr001_v3_event(
    '55000000-0000-4000-8000-000000000002',
    'proof.submitted',
    'run.authority.fixture',
    2,
    'correlation.authority.fixture',
    '55000000-0000-4000-8000-000000000001',
    'idempotency.authority.fixture.proof',
    'learner',
    'device.111111111111111111111111',
    pg_temp.adr001_v3_proof_payload('sha256:' || repeat('f', 64))
  );
  perform forge.append_adr001_v2_validated_event(
    '51000000-0000-4000-8000-000000000001',
    'validator-authority.fixture',
    '53000000-0000-4000-8000-000000000001',
    '54000000-0000-4000-8000-000000000001',
    v_proof
  );
  if (select status from forge.adr001_proof_challenges where challenge_id = '56000000-0000-4000-8000-000000000001') <> 'consumed'
     or (select count(*) from forge.adr001_event_journal where aggregate_id = 'run.authority.fixture') <> 2
     or (select count(*) from forge.adr001_event_outbox where event_id in (
       '55000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000002'
     )) <> 2 then
    raise exception 'server-issued nonce proof projection did not commit atomically';
  end if;

  select count(*) into v_before_journal from forge.adr001_event_journal;
  select count(*) into v_before_head from forge.adr001_event_aggregate_heads;
  select count(*) into v_before_outbox from forge.adr001_event_outbox;
  select count(*) into v_before_receipts from forge.adr001_event_projection_receipts;
  perform forge.append_adr001_v2_validated_event(
    '51000000-0000-4000-8000-000000000001',
    'validator-authority.fixture',
    '53000000-0000-4000-8000-000000000001',
    '54000000-0000-4000-8000-000000000001',
    v_proof
  );
  if (select count(*) from forge.adr001_event_journal) <> v_before_journal
     or (select count(*) from forge.adr001_event_aggregate_heads) <> v_before_head
     or (select count(*) from forge.adr001_event_outbox) <> v_before_outbox
     or (select count(*) from forge.adr001_event_projection_receipts) <> v_before_receipts then
    raise exception 'exact duplicate proof mutated canonical journal, head, outbox, or receipt state';
  end if;

  begin
    perform forge.append_adr001_v2_validated_event(
      '51000000-0000-4000-8000-000000000001',
      'validator-authority.fixture',
      '53000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      pg_temp.seal_adr001_v3_event(
        '55000000-0000-4000-8000-000000000003',
        'proof.submitted',
        'run.authority.fixture',
        3,
        'correlation.authority.fixture',
        '55000000-0000-4000-8000-000000000002',
        'idempotency.authority.fixture.forged-proof',
        'learner',
        'device.111111111111111111111111',
        v_proof -> 'payload'
      )
    );
    raise exception 'expected consumed nonce forged proof refusal';
  exception when insufficient_privilege then
    null;
  end;
  if (select count(*) from forge.adr001_event_journal) <> v_before_journal
     or (select count(*) from forge.adr001_event_aggregate_heads) <> v_before_head
     or (select count(*) from forge.adr001_event_outbox) <> v_before_outbox then
    raise exception 'forged or replayed proof mutated canonical journal, head, or outbox';
  end if;
end;
$$;

reset role;

select 'FORGE ADR-001 v3 evidence authority contract passed' as result;

rollback;
