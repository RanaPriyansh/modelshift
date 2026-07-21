-- FORGE G1 event spine: strict canonical envelopes, append-only replay, and a
-- transactionally coupled outbox. Event payloads contain bounded references and
-- digests only; raw learner dialogue and model transcripts are rejected.

begin;

create schema if not exists forge;
create schema if not exists forge_private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function forge_private.is_event_reference(p_value text)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select char_length(p_value) between 3 and 180
    and p_value ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$';
$$;

create or replace function forge_private.is_identifier(p_value text)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select char_length(p_value) between 3 and 128
    and p_value ~ '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$';
$$;

create or replace function forge_private.is_semver(p_value text)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select p_value ~ '^\d+\.\d+\.\d+$';
$$;

create or replace function forge_private.is_sha256_digest(p_value text)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select p_value ~ '^sha256:[a-f0-9]{64}$';
$$;

create or replace function forge_private.jsonb_text_array_matches(
  p_value jsonb,
  p_pattern text,
  p_minimum integer,
  p_maximum integer
)
returns boolean
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  value_count integer;
  distinct_count integer;
  values_match boolean;
begin
  if jsonb_typeof(p_value) <> 'array' then
    return false;
  end if;

  select
    count(*),
    count(distinct item.value #>> '{}'),
    coalesce(bool_and(jsonb_typeof(item.value) = 'string' and (item.value #>> '{}') ~ p_pattern), true)
  into value_count, distinct_count, values_match
  from jsonb_array_elements(p_value) as item(value);

  return value_count between p_minimum and p_maximum
    and distinct_count = value_count
    and values_match;
end;
$$;

create or replace function forge_private.assert_json_object_keys(
  p_value jsonb,
  p_expected_keys text[],
  p_context text
)
returns void
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  actual_keys text[];
  expected_keys text[];
begin
  if jsonb_typeof(p_value) <> 'object' then
    raise exception '% must be a JSON object', p_context using errcode = '23514';
  end if;

  select coalesce(array_agg(key order by key collate "C"), array[]::text[])
  into actual_keys
  from jsonb_object_keys(p_value) as keys(key);

  select coalesce(array_agg(key order by key collate "C"), array[]::text[])
  into expected_keys
  from unnest(p_expected_keys) as keys(key);

  if actual_keys is distinct from expected_keys then
    raise exception '% has unexpected keys (expected %, received %)', p_context, expected_keys, actual_keys
      using errcode = '23514';
  end if;
end;
$$;

create or replace function forge_private.jsonb_has_forbidden_event_key(p_value jsonb)
returns boolean
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  item record;
begin
  if jsonb_typeof(p_value) = 'object' then
    for item in select key, value from jsonb_each(p_value)
    loop
      if item.key ~ '(^|_)(raw_chat|chat_transcript|raw_text|learner_text|explanation|prompt|model_output|personality|emotion|precise_location|advertising_id)($|_)' then
        return true;
      end if;
      if forge_private.jsonb_has_forbidden_event_key(item.value) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for item in select value from jsonb_array_elements(p_value)
    loop
      if forge_private.jsonb_has_forbidden_event_key(item.value) then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$$;

-- Recursive canonical JSON matches src/forge/events.ts: object keys use bytewise
-- lexical ordering, arrays preserve order, and no insignificant whitespace is emitted.
create or replace function forge_private.canonical_jsonb(p_value jsonb)
returns text
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  canonical text;
begin
  case jsonb_typeof(p_value)
    when 'object' then
      select '{' || coalesce(
        string_agg(
          to_json(entry.key)::text || ':' || forge_private.canonical_jsonb(entry.value),
          ',' order by entry.key collate "C"
        ),
        ''
      ) || '}'
      into canonical
      from jsonb_each(p_value) as entry(key, value);
    when 'array' then
      select '[' || coalesce(
        string_agg(forge_private.canonical_jsonb(entry.value), ',' order by entry.ordinality),
        ''
      ) || ']'
      into canonical
      from jsonb_array_elements(p_value) with ordinality as entry(value, ordinality);
    else
      canonical := p_value::text;
  end case;
  return canonical;
end;
$$;

create or replace function forge_private.sha256_jsonb(p_value jsonb)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select 'sha256:' || encode(
    extensions.digest(convert_to(forge_private.canonical_jsonb(p_value), 'UTF8'), 'sha256'),
    'hex'
  );
$$;

create or replace function forge_private.assert_forge_event_shape(p_event jsonb)
returns void
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  event_type text := p_event ->> 'event_type';
  aggregate_type text := p_event #>> '{aggregate,type}';
  payload jsonb := p_event -> 'payload';
  response_is_valid boolean;
begin
  perform forge_private.assert_json_object_keys(
    p_event,
    array[
      'event_id', 'event_type', 'schema_version', 'aggregate', 'actor', 'authority',
      'occurred_at', 'recorded_at', 'correlation_id', 'causation_id',
      'idempotency_key', 'payload', 'integrity_hash'
    ],
    'event envelope'
  );
  perform forge_private.assert_json_object_keys(
    p_event -> 'aggregate', array['type', 'id', 'version'], 'event aggregate'
  );
  perform forge_private.assert_json_object_keys(
    p_event -> 'actor', array['type', 'id'], 'event actor'
  );
  perform forge_private.assert_json_object_keys(
    p_event -> 'authority', array['policy_version', 'consent_grant_ids'], 'event authority'
  );

  if p_event ->> 'event_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or p_event -> 'schema_version' <> '1'::jsonb
     or event_type not in (
       'world_run.started', 'attempt.committed', 'assistance.recorded',
       'proof.submitted', 'evidence.recorded', 'world_run.paused',
       'world_run.resumed', 'world_run.completed', 'world_run.corrected',
       'world_package.published', 'world_package.disabled', 'world_package.superseded'
     )
     or aggregate_type not in ('world_run', 'world_package')
     or not forge_private.is_event_reference(p_event #>> '{aggregate,id}')
     or p_event #>> '{aggregate,version}' !~ '^[1-9][0-9]*$'
     or p_event #>> '{actor,type}' not in ('learner', 'system', 'validator', 'policy', 'human')
     or not forge_private.is_event_reference(p_event #>> '{actor,id}')
     or not forge_private.is_event_reference(p_event #>> '{authority,policy_version}')
     or not forge_private.jsonb_text_array_matches(
       p_event #> '{authority,consent_grant_ids}', '^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$', 0, 32
     )
     or p_event ->> 'occurred_at' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
     or p_event ->> 'recorded_at' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
     or (p_event ->> 'recorded_at')::timestamptz < (p_event ->> 'occurred_at')::timestamptz
     or not forge_private.is_event_reference(p_event ->> 'correlation_id')
     or (
       p_event -> 'causation_id' <> 'null'::jsonb
       and p_event ->> 'causation_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     )
     or char_length(p_event ->> 'idempotency_key') not between 16 and 180
     or p_event ->> 'idempotency_key' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
     or not forge_private.is_sha256_digest(p_event ->> 'integrity_hash') then
    raise exception 'event envelope contains an invalid typed field' using errcode = '23514';
  end if;

  if (event_type like 'world_package.%') is distinct from (aggregate_type = 'world_package') then
    raise exception 'event type % does not belong to aggregate type %', event_type, aggregate_type
      using errcode = '23514';
  end if;

  case event_type
    when 'world_run.started' then
      perform forge_private.assert_json_object_keys(payload, array[
        'world_id', 'world_version', 'content_version', 'capability_id', 'proof_claim_id',
        'validator_id', 'validator_version', 'package_integrity_hash', 'assistance_mode',
        'source_ids', 'proof_authority'
      ], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'world_id')
         or not forge_private.is_semver(payload ->> 'world_version')
         or not forge_private.is_semver(payload ->> 'content_version')
         or not forge_private.is_identifier(payload ->> 'capability_id')
         or not forge_private.is_identifier(payload ->> 'proof_claim_id')
         or not forge_private.is_identifier(payload ->> 'validator_id')
         or not forge_private.is_semver(payload ->> 'validator_version')
         or not forge_private.is_sha256_digest(payload ->> 'package_integrity_hash')
         or payload ->> 'assistance_mode' not in ('closed', 'hints_only', 'collaborative_ai', 'ai_required')
         or not forge_private.jsonb_text_array_matches(
           payload -> 'source_ids', '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$', 0, 32
         )
         or payload ->> 'proof_authority' not in ('honour_based', 'server_enforced', 'human_observed') then
        raise exception 'world_run.started payload is invalid' using errcode = '23514';
      end if;

    when 'attempt.committed' then
      perform forge_private.assert_json_object_keys(payload, array[
        'phase', 'stage_id', 'selection_ids', 'response_digest', 'explicit_uncertainty'
      ], event_type || ' payload');
      response_is_valid := payload -> 'response_digest' = 'null'::jsonb
        or forge_private.is_sha256_digest(payload ->> 'response_digest');
      if payload ->> 'phase' not in ('initial', 'reconstruction', 'proof')
         or not forge_private.is_identifier(payload ->> 'stage_id')
         or not forge_private.jsonb_text_array_matches(
           payload -> 'selection_ids', '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$', 0, 32
         )
         or not response_is_valid
         or jsonb_typeof(payload -> 'explicit_uncertainty') <> 'boolean'
         or (
           jsonb_array_length(payload -> 'selection_ids') = 0
           and payload -> 'response_digest' = 'null'::jsonb
           and not (payload ->> 'explicit_uncertainty')::boolean
         ) then
        raise exception 'attempt.committed payload is invalid' using errcode = '23514';
      end if;

    when 'assistance.recorded' then
      perform forge_private.assert_json_object_keys(payload, array[
        'assistance_id', 'stage_id', 'kind', 'source', 'content_reference',
        'policy_decision', 'protected_operation_overlap'
      ], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'assistance_id')
         or not forge_private.is_identifier(payload ->> 'stage_id')
         or payload ->> 'kind' not in ('accessibility', 'attention-cue', 'contrast', 'representation', 'explanation', 'solution')
         or payload ->> 'source' not in ('authored', 'model', 'accessibility', 'human')
         or not forge_private.is_identifier(payload ->> 'content_reference')
         or payload ->> 'policy_decision' not in ('allowed', 'fallback')
         or jsonb_typeof(payload -> 'protected_operation_overlap') <> 'number'
         or (payload ->> 'protected_operation_overlap')::numeric not between 0 and 1 then
        raise exception 'assistance.recorded payload is invalid' using errcode = '23514';
      end if;

    when 'proof.submitted' then
      perform forge_private.assert_json_object_keys(payload, array[
        'task_id', 'task_version', 'transfer_family_id', 'selection_ids',
        'response_digest', 'assistance_access', 'proof_nonce_digest'
      ], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'task_id')
         or not forge_private.is_semver(payload ->> 'task_version')
         or not forge_private.is_identifier(payload ->> 'transfer_family_id')
         or not forge_private.jsonb_text_array_matches(
           payload -> 'selection_ids', '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$', 0, 32
         )
         or not (
           payload -> 'response_digest' = 'null'::jsonb
           or forge_private.is_sha256_digest(payload ->> 'response_digest')
         )
         or payload ->> 'assistance_access' <> 'removed'
         or not (
           payload -> 'proof_nonce_digest' = 'null'::jsonb
           or forge_private.is_sha256_digest(payload ->> 'proof_nonce_digest')
         ) then
        raise exception 'proof.submitted payload is invalid' using errcode = '23514';
      end if;

    when 'evidence.recorded' then
      perform forge_private.assert_json_object_keys(payload, array[
        'evidence_id', 'result', 'validator_id', 'validator_version', 'source_ids',
        'assistance_event_ids', 'remains_untested'
      ], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'evidence_id')
         or payload ->> 'result' not in ('proved', 'not_proved', 'open_question')
         or not forge_private.is_identifier(payload ->> 'validator_id')
         or not forge_private.is_semver(payload ->> 'validator_version')
         or not forge_private.jsonb_text_array_matches(
           payload -> 'source_ids', '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$', 0, 32
         )
         or not forge_private.jsonb_text_array_matches(
           payload -> 'assistance_event_ids',
           '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
           0,
           64
         )
         or not forge_private.jsonb_text_array_matches(
           payload -> 'remains_untested', '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$', 0, 32
         ) then
        raise exception 'evidence.recorded payload is invalid' using errcode = '23514';
      end if;

    when 'world_run.paused' then
      perform forge_private.assert_json_object_keys(payload, array['stage_id', 'reason_code'], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'stage_id')
         or not forge_private.is_identifier(payload ->> 'reason_code') then
        raise exception 'world_run.paused payload is invalid' using errcode = '23514';
      end if;

    when 'world_run.resumed' then
      perform forge_private.assert_json_object_keys(payload, array['stage_id'], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'stage_id') then
        raise exception 'world_run.resumed payload is invalid' using errcode = '23514';
      end if;

    when 'world_run.completed' then
      perform forge_private.assert_json_object_keys(payload, array['result', 'evidence_id', 'next_review_at'], event_type || ' payload');
      if payload ->> 'result' not in ('proved', 'not_proved', 'open_question')
         or not forge_private.is_identifier(payload ->> 'evidence_id')
         or not (
           payload -> 'next_review_at' = 'null'::jsonb
           or payload ->> 'next_review_at' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
         ) then
        raise exception 'world_run.completed payload is invalid' using errcode = '23514';
      end if;

    when 'world_run.corrected' then
      perform forge_private.assert_json_object_keys(payload, array[
        'supersedes_event_id', 'reason_code', 'correction_reference'
      ], event_type || ' payload');
      if payload ->> 'supersedes_event_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or not forge_private.is_identifier(payload ->> 'reason_code')
         or not forge_private.is_identifier(payload ->> 'correction_reference') then
        raise exception 'world_run.corrected payload is invalid' using errcode = '23514';
      end if;

    when 'world_package.published' then
      perform forge_private.assert_json_object_keys(payload, array[
        'world_id', 'world_version', 'content_version', 'bundle_integrity_hash'
      ], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'world_id')
         or not forge_private.is_semver(payload ->> 'world_version')
         or not forge_private.is_semver(payload ->> 'content_version')
         or not forge_private.is_sha256_digest(payload ->> 'bundle_integrity_hash') then
        raise exception 'world_package.published payload is invalid' using errcode = '23514';
      end if;

    when 'world_package.disabled' then
      perform forge_private.assert_json_object_keys(payload, array[
        'world_id', 'world_version', 'reason_code'
      ], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'world_id')
         or not forge_private.is_semver(payload ->> 'world_version')
         or not forge_private.is_identifier(payload ->> 'reason_code') then
        raise exception 'world_package.disabled payload is invalid' using errcode = '23514';
      end if;

    when 'world_package.superseded' then
      perform forge_private.assert_json_object_keys(payload, array[
        'world_id', 'world_version', 'successor_version', 'successor_bundle_integrity_hash'
      ], event_type || ' payload');
      if not forge_private.is_identifier(payload ->> 'world_id')
         or not forge_private.is_semver(payload ->> 'world_version')
         or not forge_private.is_semver(payload ->> 'successor_version')
         or not forge_private.is_sha256_digest(payload ->> 'successor_bundle_integrity_hash') then
        raise exception 'world_package.superseded payload is invalid' using errcode = '23514';
      end if;
  end case;
end;
$$;

create table forge.event_aggregate_heads (
  id bigint generated always as identity primary key,
  aggregate_type text not null check (aggregate_type in ('world_run', 'world_package')),
  aggregate_id text not null check (forge_private.is_event_reference(aggregate_id)),
  current_version bigint not null check (current_version > 0),
  correlation_id text not null check (forge_private.is_event_reference(correlation_id)),
  last_event_id uuid not null,
  lifecycle_state text not null check (lifecycle_state in (
    'active', 'paused', 'proof_submitted', 'evidence_recorded', 'completed',
    'published', 'disabled', 'superseded'
  )),
  state_data jsonb not null check (
    jsonb_typeof(state_data) = 'object'
    and not forge_private.jsonb_has_forbidden_event_key(state_data)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aggregate_type, aggregate_id)
);

create table forge.event_journal (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  event_type text not null check (event_type in (
    'world_run.started', 'attempt.committed', 'assistance.recorded',
    'proof.submitted', 'evidence.recorded', 'world_run.paused',
    'world_run.resumed', 'world_run.completed', 'world_run.corrected',
    'world_package.published', 'world_package.disabled', 'world_package.superseded'
  )),
  schema_version integer not null check (schema_version = 1),
  aggregate_type text not null check (aggregate_type in ('world_run', 'world_package')),
  aggregate_id text not null check (forge_private.is_event_reference(aggregate_id)),
  aggregate_version bigint not null check (aggregate_version > 0),
  actor_type text not null check (actor_type in ('learner', 'system', 'validator', 'policy', 'human')),
  actor_id text not null check (forge_private.is_event_reference(actor_id)),
  authority jsonb not null check (jsonb_typeof(authority) = 'object'),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null,
  correlation_id text not null check (forge_private.is_event_reference(correlation_id)),
  causation_id uuid references forge.event_journal (event_id) on delete restrict,
  idempotency_key text not null unique check (
    char_length(idempotency_key) between 16 and 180
    and idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and not forge_private.jsonb_has_forbidden_event_key(payload)
  ),
  integrity_hash text not null check (forge_private.is_sha256_digest(integrity_hash)),
  event_document jsonb not null check (
    jsonb_typeof(event_document) = 'object'
    and not forge_private.jsonb_has_forbidden_event_key(event_document)
  ),
  appended_at timestamptz not null default now(),
  unique (aggregate_type, aggregate_id, aggregate_version),
  check (recorded_at >= occurred_at),
  check ((event_type like 'world_package.%') = (aggregate_type = 'world_package'))
);

create table forge.event_outbox (
  id bigint generated always as identity primary key,
  event_id uuid not null unique references forge.event_journal (event_id) on delete restrict,
  topic text not null check (topic ~ '^forge\.[a-z0-9_.-]+$'),
  event_document jsonb not null check (
    jsonb_typeof(event_document) = 'object'
    and not forge_private.jsonb_has_forbidden_event_key(event_document)
  ),
  status text not null default 'pending' check (status in ('pending', 'published', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  published_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

comment on table forge.event_journal is
  'Canonical append-only FORGE events. Corrections and package lifecycle changes are new events, never rewrites.';
comment on table forge.event_aggregate_heads is
  'Transactional concurrency head and derived state cache; canonical history remains event_journal.';
comment on table forge.event_outbox is
  'Exactly one durable delivery row inserted in the same transaction as each accepted event.';

create index event_journal_causation_id_idx on forge.event_journal (causation_id);
create index event_journal_correlation_recorded_idx
  on forge.event_journal (correlation_id, recorded_at, id);
create index event_journal_aggregate_replay_idx
  on forge.event_journal (aggregate_type, aggregate_id, aggregate_version, id);
create index event_outbox_pending_delivery_idx
  on forge.event_outbox (available_at, id)
  where status = 'pending';

create or replace function forge_private.reject_event_journal_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'forge.event_journal is append-only; append a correction or lifecycle event instead'
    using errcode = '55000';
end;
$$;

create trigger event_journal_append_only
before update or delete on forge.event_journal
for each row execute function forge_private.reject_event_journal_mutation();

create trigger event_journal_reject_truncate
before truncate on forge.event_journal
for each statement execute function forge_private.reject_event_journal_mutation();

create or replace function forge.append_event(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_event_type text;
  v_aggregate_type text;
  v_aggregate_id text;
  v_aggregate_version bigint;
  v_correlation_id text;
  v_causation_id uuid;
  v_idempotency_key text;
  v_integrity_hash text;
  v_payload jsonb;
  v_existing forge.event_journal%rowtype;
  v_head forge.event_aggregate_heads%rowtype;
  v_head_exists boolean;
  v_lifecycle_state text;
  v_state_data jsonb;
  v_outbox_id bigint;
begin
  perform forge_private.assert_forge_event_shape(p_event);
  if forge_private.jsonb_has_forbidden_event_key(p_event) then
    raise exception 'raw dialogue, model output, and surveillance keys are forbidden in the event spine'
      using errcode = '23514';
  end if;

  v_integrity_hash := p_event ->> 'integrity_hash';
  if v_integrity_hash <> forge_private.sha256_jsonb(p_event - 'integrity_hash') then
    raise exception 'event integrity hash does not match the canonical envelope' using errcode = '22000';
  end if;

  v_event_id := (p_event ->> 'event_id')::uuid;
  v_event_type := p_event ->> 'event_type';
  v_aggregate_type := p_event #>> '{aggregate,type}';
  v_aggregate_id := p_event #>> '{aggregate,id}';
  v_aggregate_version := (p_event #>> '{aggregate,version}')::bigint;
  v_correlation_id := p_event ->> 'correlation_id';
  v_causation_id := nullif(p_event ->> 'causation_id', '')::uuid;
  v_idempotency_key := p_event ->> 'idempotency_key';
  v_payload := p_event -> 'payload';

  -- Every writer takes locks in the same order: idempotency key, then aggregate.
  perform pg_advisory_xact_lock(hashtextextended('forge:idempotency:' || v_idempotency_key, 0));
  perform pg_advisory_xact_lock(hashtextextended(
    'forge:aggregate:' || v_aggregate_type || ':' || v_aggregate_id,
    0
  ));

  select * into v_existing
  from forge.event_journal
  where idempotency_key = v_idempotency_key;

  if found then
    if v_existing.event_document = p_event then
      return jsonb_build_object(
        'disposition', 'duplicate',
        'event_id', v_existing.event_id,
        'aggregate_version', v_existing.aggregate_version,
        'outbox_id', (select id from forge.event_outbox where event_id = v_existing.event_id)
      );
    end if;
    raise exception 'idempotency key collision' using errcode = '23505';
  end if;

  select * into v_existing
  from forge.event_journal
  where event_id = v_event_id;
  if found then
    raise exception 'event ID collision' using errcode = '23505';
  end if;

  select * into v_head
  from forge.event_aggregate_heads
  where aggregate_type = v_aggregate_type
    and aggregate_id = v_aggregate_id
  for update;
  v_head_exists := found;

  if not v_head_exists then
    if v_aggregate_version <> 1 then
      raise exception 'aggregate version conflict: first version must be 1' using errcode = '40001';
    end if;
    if v_causation_id is not null then
      raise exception 'causation mismatch: first event cannot have a cause' using errcode = '23514';
    end if;

    if v_aggregate_type = 'world_run' then
      if v_event_type <> 'world_run.started' then
        raise exception 'forbidden transition: a run must start with world_run.started' using errcode = '23514';
      end if;
      v_lifecycle_state := 'active';
      v_state_data := jsonb_build_object(
        'world_id', v_payload ->> 'world_id',
        'world_version', v_payload ->> 'world_version',
        'content_version', v_payload ->> 'content_version',
        'package_integrity_hash', v_payload ->> 'package_integrity_hash',
        'validator_id', v_payload ->> 'validator_id',
        'validator_version', v_payload ->> 'validator_version',
        'proof_authority', v_payload ->> 'proof_authority'
      );
    else
      if v_event_type <> 'world_package.published' then
        raise exception 'forbidden transition: a package must start with world_package.published' using errcode = '23514';
      end if;
      v_lifecycle_state := 'published';
      v_state_data := jsonb_build_object(
        'world_id', v_payload ->> 'world_id',
        'world_version', v_payload ->> 'world_version',
        'content_version', v_payload ->> 'content_version',
        'bundle_integrity_hash', v_payload ->> 'bundle_integrity_hash'
      );
    end if;
  else
    if v_aggregate_version <> v_head.current_version + 1 then
      raise exception 'aggregate version conflict: expected %, received %',
        v_head.current_version + 1, v_aggregate_version using errcode = '40001';
    end if;
    if v_correlation_id <> v_head.correlation_id then
      raise exception 'correlation mismatch' using errcode = '23514';
    end if;
    if v_causation_id is distinct from v_head.last_event_id then
      raise exception 'causation mismatch: event must follow the current aggregate head' using errcode = '23514';
    end if;

    v_lifecycle_state := v_head.lifecycle_state;
    v_state_data := v_head.state_data;

    if v_aggregate_type = 'world_run' then
      case v_event_type
        when 'attempt.committed', 'assistance.recorded' then
          if v_lifecycle_state <> 'active' then
            raise exception 'forbidden transition: % while run is %', v_event_type, v_lifecycle_state using errcode = '23514';
          end if;
        when 'world_run.paused' then
          if v_lifecycle_state <> 'active' then
            raise exception 'forbidden transition: pause while run is %', v_lifecycle_state using errcode = '23514';
          end if;
          v_lifecycle_state := 'paused';
        when 'world_run.resumed' then
          if v_lifecycle_state <> 'paused' then
            raise exception 'forbidden transition: resume while run is %', v_lifecycle_state using errcode = '23514';
          end if;
          v_lifecycle_state := 'active';
        when 'proof.submitted' then
          if v_lifecycle_state <> 'active' then
            raise exception 'forbidden transition: proof while run is %', v_lifecycle_state using errcode = '23514';
          end if;
          v_lifecycle_state := 'proof_submitted';
          v_state_data := v_state_data || jsonb_build_object('proof_event_id', v_event_id);
        when 'evidence.recorded' then
          if v_lifecycle_state <> 'proof_submitted' then
            raise exception 'forbidden transition: evidence while run is %', v_lifecycle_state using errcode = '23514';
          end if;
          if v_payload ->> 'validator_id' <> v_state_data ->> 'validator_id'
             or v_payload ->> 'validator_version' <> v_state_data ->> 'validator_version' then
            raise exception 'evidence validator does not match the pinned run validator' using errcode = '23514';
          end if;
          if exists (
            select 1
            from jsonb_array_elements_text(v_payload -> 'assistance_event_ids') as assistance(event_id)
            where not exists (
              select 1
              from forge.event_journal as candidate
              where candidate.event_id = assistance.event_id::uuid
                and candidate.aggregate_type = v_aggregate_type
                and candidate.aggregate_id = v_aggregate_id
                and candidate.event_type = 'assistance.recorded'
            )
          ) then
            raise exception 'evidence references assistance outside this run' using errcode = '23514';
          end if;
          v_lifecycle_state := 'evidence_recorded';
          v_state_data := v_state_data || jsonb_build_object(
            'evidence_event_id', v_event_id,
            'evidence_id', v_payload ->> 'evidence_id',
            'evidence_result', v_payload ->> 'result'
          );
        when 'world_run.completed' then
          if v_lifecycle_state <> 'evidence_recorded' then
            raise exception 'forbidden transition: completion while run is %', v_lifecycle_state using errcode = '23514';
          end if;
          if v_payload ->> 'evidence_id' <> v_state_data ->> 'evidence_id'
             or v_payload ->> 'result' <> v_state_data ->> 'evidence_result' then
            raise exception 'completion does not preserve the recorded bounded evidence result' using errcode = '23514';
          end if;
          v_lifecycle_state := 'completed';
          v_state_data := v_state_data || jsonb_build_object('completion_event_id', v_event_id);
        when 'world_run.corrected' then
          if v_lifecycle_state <> 'completed' then
            raise exception 'forbidden transition: correction before completion' using errcode = '23514';
          end if;
          if not exists (
            select 1 from forge.event_journal as target
            where target.event_id = (v_payload ->> 'supersedes_event_id')::uuid
              and target.aggregate_type = v_aggregate_type
              and target.aggregate_id = v_aggregate_id
              and target.event_type <> 'world_run.corrected'
          ) then
            raise exception 'correction target is not an earlier event in this run' using errcode = '23514';
          end if;
          if exists (
            select 1 from forge.event_journal as correction
            where correction.aggregate_type = v_aggregate_type
              and correction.aggregate_id = v_aggregate_id
              and correction.event_type = 'world_run.corrected'
              and correction.payload ->> 'supersedes_event_id' = v_payload ->> 'supersedes_event_id'
          ) then
            raise exception 'correction target already has a correction' using errcode = '23514';
          end if;
        else
          raise exception 'forbidden event type % for an existing run', v_event_type using errcode = '23514';
      end case;
    else
      if v_lifecycle_state <> 'published' then
        raise exception 'forbidden package transition while package is %', v_lifecycle_state using errcode = '23514';
      end if;
      if v_payload ->> 'world_id' <> v_state_data ->> 'world_id'
         or v_payload ->> 'world_version' <> v_state_data ->> 'world_version' then
        raise exception 'package lifecycle identity does not match the published package' using errcode = '23514';
      end if;
      if v_event_type = 'world_package.disabled' then
        v_lifecycle_state := 'disabled';
        v_state_data := v_state_data || jsonb_build_object('disabled_reason_code', v_payload ->> 'reason_code');
      elsif v_event_type = 'world_package.superseded' then
        if string_to_array(v_payload ->> 'successor_version', '.')::integer[]
           <= string_to_array(v_state_data ->> 'world_version', '.')::integer[] then
          raise exception 'successor version must be greater than the published package version' using errcode = '23514';
        end if;
        v_lifecycle_state := 'superseded';
        v_state_data := v_state_data || jsonb_build_object(
          'successor_version', v_payload ->> 'successor_version',
          'successor_bundle_integrity_hash', v_payload ->> 'successor_bundle_integrity_hash'
        );
      else
        raise exception 'forbidden event type % for an existing package', v_event_type using errcode = '23514';
      end if;
    end if;
  end if;

  insert into forge.event_journal (
    event_id, event_type, schema_version, aggregate_type, aggregate_id, aggregate_version,
    actor_type, actor_id, authority, occurred_at, recorded_at, correlation_id,
    causation_id, idempotency_key, payload, integrity_hash, event_document
  ) values (
    v_event_id,
    v_event_type,
    (p_event ->> 'schema_version')::integer,
    v_aggregate_type,
    v_aggregate_id,
    v_aggregate_version,
    p_event #>> '{actor,type}',
    p_event #>> '{actor,id}',
    p_event -> 'authority',
    (p_event ->> 'occurred_at')::timestamptz,
    (p_event ->> 'recorded_at')::timestamptz,
    v_correlation_id,
    v_causation_id,
    v_idempotency_key,
    v_payload,
    v_integrity_hash,
    p_event
  );

  if v_head_exists then
    update forge.event_aggregate_heads
    set current_version = v_aggregate_version,
        last_event_id = v_event_id,
        lifecycle_state = v_lifecycle_state,
        state_data = v_state_data,
        updated_at = now()
    where id = v_head.id;
  else
    insert into forge.event_aggregate_heads (
      aggregate_type, aggregate_id, current_version, correlation_id,
      last_event_id, lifecycle_state, state_data
    ) values (
      v_aggregate_type, v_aggregate_id, v_aggregate_version, v_correlation_id,
      v_event_id, v_lifecycle_state, v_state_data
    );
  end if;

  insert into forge.event_outbox (event_id, topic, event_document)
  values (v_event_id, 'forge.' || v_event_type, p_event)
  returning id into v_outbox_id;

  return jsonb_build_object(
    'disposition', 'appended',
    'event_id', v_event_id,
    'aggregate_version', v_aggregate_version,
    'outbox_id', v_outbox_id
  );
end;
$$;

alter table forge.event_aggregate_heads enable row level security;
alter table forge.event_aggregate_heads force row level security;
alter table forge.event_journal enable row level security;
alter table forge.event_journal force row level security;
alter table forge.event_outbox enable row level security;
alter table forge.event_outbox force row level security;

revoke all on table
  forge.event_aggregate_heads,
  forge.event_journal,
  forge.event_outbox
from public, anon, authenticated, service_role;
revoke all on sequence
  forge.event_aggregate_heads_id_seq,
  forge.event_journal_id_seq,
  forge.event_outbox_id_seq
from public, anon, authenticated, service_role;
revoke all on function forge.append_event(jsonb) from public, anon, authenticated;
revoke all on all functions in schema forge_private from public, anon, authenticated;

grant select on table forge.event_aggregate_heads, forge.event_journal to service_role;
grant select, update on table forge.event_outbox to service_role;
grant execute on function forge.append_event(jsonb) to service_role;

commit;
