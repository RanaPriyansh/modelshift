-- ADR-001 v2 persistence contract. This is deliberately additive: version-1
-- rows remain in forge.event_* and version-2 runtime evidence uses its own
-- adult-owned journal. The bridge trigger below rejects aggregate, event-ID,
-- and idempotency collisions across the two immutable histories.

begin;

-- The original helper predicates were STRICT, which turns a missing scalar
-- into SQL NULL. Callers use these predicates as guards, so make missing
-- values explicitly false rather than allowing three-valued logic to bypass a
-- malformed-envelope check. This retains every valid v1 result while closing
-- the fail-open NULL case for both schemas.
create or replace function forge_private.is_event_reference(p_value text)
returns boolean
language sql
immutable
called on null input
parallel safe
set search_path = ''
as $$
  select coalesce(
    char_length(p_value) between 3 and 180
    and p_value ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
    false
  );
$$;

create or replace function forge_private.is_identifier(p_value text)
returns boolean
language sql
immutable
called on null input
parallel safe
set search_path = ''
as $$
  select coalesce(
    char_length(p_value) between 3 and 128
    and p_value ~ '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$',
    false
  );
$$;

create or replace function forge_private.is_semver(p_value text)
returns boolean
language sql
immutable
called on null input
parallel safe
set search_path = ''
as $$
  select coalesce(p_value ~ '^\d+\.\d+\.\d+$', false);
$$;

create or replace function forge_private.is_sha256_digest(p_value text)
returns boolean
language sql
immutable
called on null input
parallel safe
set search_path = ''
as $$
  select coalesce(p_value ~ '^sha256:[a-f0-9]{64}$', false);
$$;

create or replace function forge_private.is_adr001_timestamp(p_value text)
returns boolean
language plpgsql
stable
called on null input
set search_path = ''
as $$
begin
  if p_value is null or p_value !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$' then
    return false;
  end if;

  perform p_value::timestamptz;
  return true;
exception when datetime_field_overflow or invalid_datetime_format then
  return false;
end;
$$;

create or replace function forge_private.is_adr001_runtime_stage(p_value text)
returns boolean
language sql
immutable
called on null input
parallel safe
set search_path = ''
as $$
  select coalesce(p_value in (
    'encounter', 'commit_model', 'interpret_two_readings', 'name_disagreement',
    'commit_test_prediction', 'run_separating_experience', 'governed_support',
    'reconstruct', 'withdraw_instructional_ai', 'cold_transfer', 'bounded_result',
    'return_or_apply'
  ), false);
$$;

create or replace function forge_private.is_adr001_uuid(p_value text)
returns boolean
language sql
immutable
called on null input
parallel safe
set search_path = ''
as $$
  select coalesce(p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', false);
$$;

create or replace function forge_private.is_adr001_trimmed_text(p_value text, p_maximum integer)
returns boolean
language sql
immutable
called on null input
parallel safe
set search_path = ''
as $$
  select coalesce(
    p_value = btrim(p_value)
    and char_length(p_value) between 1 and p_maximum,
    false
  );
$$;

create or replace function forge_private.assert_adr001_json_text_array(
  p_value jsonb,
  p_kind text,
  p_minimum integer,
  p_maximum integer,
  p_context text
)
returns void
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_value jsonb;
  v_text text;
  v_count integer;
  v_distinct_count integer;
begin
  if jsonb_typeof(p_value) <> 'array' then
    raise exception '% must be a JSON array', p_context using errcode = '23514';
  end if;

  select count(*), count(distinct entry.value #>> '{}')
  into v_count, v_distinct_count
  from jsonb_array_elements(p_value) as entry(value);

  if v_count not between p_minimum and p_maximum or v_distinct_count <> v_count then
    raise exception '% must contain between % and % unique values', p_context, p_minimum, p_maximum
      using errcode = '23514';
  end if;

  for v_value in select value from jsonb_array_elements(p_value) as entry(value)
  loop
    if jsonb_typeof(v_value) <> 'string' then
      raise exception '% must contain strings only', p_context using errcode = '23514';
    end if;
    v_text := v_value #>> '{}';
    if (p_kind = 'identifier' and not forge_private.is_identifier(v_text))
       or (p_kind = 'reference' and not forge_private.is_event_reference(v_text))
       or (p_kind = 'uuid' and not forge_private.is_adr001_uuid(v_text))
       or (p_kind = 'trimmed_text' and not forge_private.is_adr001_trimmed_text(v_text, 1200)) then
      raise exception '% contains an invalid %', p_context, p_kind using errcode = '23514';
    end if;
  end loop;
end;
$$;

create or replace function forge_private.adr001_has_forbidden_text_key(p_value jsonb)
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
      if item.key ~ '(^|_)(raw_chat|chat_transcript|raw_text|learner_text|learner_response|response_text|explanation|prompt|model_output|model_text|provider_key|api_key|secret|personality|emotion|precise_location|advertising_id)($|_)' then
        return true;
      end if;
      if forge_private.adr001_has_forbidden_text_key(item.value) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for item in select value from jsonb_array_elements(p_value)
    loop
      if forge_private.adr001_has_forbidden_text_key(item.value) then
        return true;
      end if;
    end loop;
  end if;
  return false;
end;
$$;

create or replace function forge_private.assert_adr001_access_accommodations(p_value jsonb, p_context text)
returns void
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_accommodation jsonb;
  v_count integer;
  v_distinct_count integer;
begin
  if jsonb_typeof(p_value) <> 'array' then
    raise exception '% must be a JSON array', p_context using errcode = '23514';
  end if;

  select count(*), count(distinct entry.value ->> 'accommodation_id')
  into v_count, v_distinct_count
  from jsonb_array_elements(p_value) as entry(value);

  if v_count > 32 or v_distinct_count <> v_count then
    raise exception '% must contain at most 32 unique accommodations', p_context using errcode = '23514';
  end if;

  for v_accommodation in select value from jsonb_array_elements(p_value) as entry(value)
  loop
    perform forge_private.assert_json_object_keys(v_accommodation, array[
      'accommodation_id', 'stage_id', 'kind', 'modality', 'representation',
      'construct_preservation', 'answer_changing', 'policy_version', 'nonvisual_alternative'
    ], p_context || ' item');
    if not forge_private.is_identifier(v_accommodation ->> 'accommodation_id')
       or not forge_private.is_adr001_runtime_stage(v_accommodation ->> 'stage_id')
       or v_accommodation ->> 'kind' not in ('text_alternative', 'keyboard_operation', 'motion_reduction')
       or v_accommodation ->> 'modality' not in ('textual', 'keyboard', 'motion')
       or v_accommodation ->> 'representation' not in ('text_description', 'native_control', 'reduced_motion')
       or v_accommodation ->> 'construct_preservation' <> 'preserves_construct'
       or v_accommodation -> 'answer_changing' <> 'false'::jsonb
       or not forge_private.is_event_reference(v_accommodation ->> 'policy_version')
       or jsonb_typeof(v_accommodation -> 'nonvisual_alternative') <> 'boolean' then
      raise exception '% contains an invalid accommodation', p_context using errcode = '23514';
    end if;
  end loop;
end;
$$;

create or replace function forge_private.assert_adr001_source_bindings(
  p_bindings jsonb,
  p_status text,
  p_context text
)
returns void
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_binding jsonb;
  v_count integer;
  v_refs integer;
  v_items integer;
  v_all_bound boolean;
begin
  if jsonb_typeof(p_bindings) <> 'array' then
    raise exception '% source_bindings must be a JSON array', p_context using errcode = '23514';
  end if;

  select count(*), count(distinct entry.value ->> 'domain_source_ref'), count(distinct entry.value ->> 'source_item_id'),
    coalesce(bool_and(entry.value ->> 'provenance_status' = 'bound'), false)
  into v_count, v_refs, v_items, v_all_bound
  from jsonb_array_elements(p_bindings) as entry(value);

  if v_count not between 1 and 32 or v_refs <> v_count or v_items <> v_count then
    raise exception '% source_bindings must contain 1 to 32 unique source references and source items', p_context
      using errcode = '23514';
  end if;

  for v_binding in select value from jsonb_array_elements(p_bindings) as entry(value)
  loop
    if v_binding ->> 'provenance_status' = 'bound' then
      perform forge_private.assert_json_object_keys(v_binding, array[
        'domain_source_ref', 'source_item_id', 'source_package_id', 'source_package_version',
        'source_snapshot_digest', 'locator_ids', 'claim_ids', 'rights_record_id',
        'review_decision_ids', 'provenance_status'
      ], p_context || ' bound source');
      if not forge_private.is_identifier(v_binding ->> 'domain_source_ref')
         or not forge_private.is_identifier(v_binding ->> 'source_item_id')
         or not forge_private.is_identifier(v_binding ->> 'source_package_id')
         or not forge_private.is_semver(v_binding ->> 'source_package_version')
         or not forge_private.is_sha256_digest(v_binding ->> 'source_snapshot_digest')
         or not forge_private.is_identifier(v_binding ->> 'rights_record_id') then
        raise exception '% contains an invalid bound source identity', p_context using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_json_text_array(v_binding -> 'locator_ids', 'identifier', 1, 32, p_context || ' locator_ids');
      perform forge_private.assert_adr001_json_text_array(v_binding -> 'claim_ids', 'identifier', 1, 32, p_context || ' claim_ids');
      perform forge_private.assert_adr001_json_text_array(v_binding -> 'review_decision_ids', 'identifier', 1, 32, p_context || ' review_decision_ids');
    elsif v_binding ->> 'provenance_status' = 'legacy_metadata_only' then
      perform forge_private.assert_json_object_keys(v_binding, array[
        'domain_source_ref', 'source_item_id', 'source_package_id', 'source_package_version',
        'source_snapshot_digest', 'locator_ids', 'claim_ids', 'rights_record_id',
        'review_decision_ids', 'provenance_status'
      ], p_context || ' legacy source');
      if not forge_private.is_identifier(v_binding ->> 'domain_source_ref')
         or not forge_private.is_identifier(v_binding ->> 'source_item_id')
         or v_binding -> 'source_package_id' <> 'null'::jsonb
         or v_binding -> 'source_package_version' <> 'null'::jsonb
         or v_binding -> 'source_snapshot_digest' <> 'null'::jsonb
         or v_binding -> 'rights_record_id' <> 'null'::jsonb then
        raise exception '% contains an invalid legacy source identity', p_context using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_json_text_array(v_binding -> 'locator_ids', 'identifier', 0, 0, p_context || ' legacy locator_ids');
      perform forge_private.assert_adr001_json_text_array(v_binding -> 'claim_ids', 'identifier', 0, 0, p_context || ' legacy claim_ids');
      perform forge_private.assert_adr001_json_text_array(v_binding -> 'review_decision_ids', 'identifier', 0, 0, p_context || ' legacy review_decision_ids');
    else
      raise exception '% has an unknown source provenance status', p_context using errcode = '23514';
    end if;
  end loop;

  if p_status <> (case when v_all_bound then 'bound' else 'incomplete' end) then
    raise exception '% source_provenance_status does not match source_bindings', p_context using errcode = '23514';
  end if;
end;
$$;

create or replace function forge_private.assert_adr001_validity(
  p_validity jsonb,
  p_outcome text,
  p_disposition text,
  p_explicit_uncertainty boolean,
  p_exception_reference jsonb,
  p_context text
)
returns void
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_expected text;
  v_invalidated boolean;
begin
  perform forge_private.assert_json_object_keys(p_validity, array[
    'package_integrity_matches', 'proof_authority_matches', 'contamination_reason_codes',
    'construct_changing_accommodation'
  ], p_context || ' validity');
  if jsonb_typeof(p_validity -> 'package_integrity_matches') <> 'boolean'
     or jsonb_typeof(p_validity -> 'proof_authority_matches') <> 'boolean'
     or jsonb_typeof(p_validity -> 'construct_changing_accommodation') <> 'boolean' then
    raise exception '% validity flags must be booleans', p_context using errcode = '23514';
  end if;
  perform forge_private.assert_adr001_json_text_array(
    p_validity -> 'contamination_reason_codes', 'identifier', 0, 32, p_context || ' contamination_reason_codes'
  );

  v_invalidated := not (p_validity ->> 'package_integrity_matches')::boolean
    or not (p_validity ->> 'proof_authority_matches')::boolean
    or jsonb_array_length(p_validity -> 'contamination_reason_codes') > 0;
  v_expected := case
    when v_invalidated then 'invalidated'
    when (p_validity ->> 'construct_changing_accommodation')::boolean then 'not_evaluated'
    when p_outcome = 'fail' and p_explicit_uncertainty and p_exception_reference <> 'null'::jsonb then 'open_question'
    when p_outcome = 'pass' then 'demonstrated'
    when p_outcome = 'fail' then 'not_demonstrated'
    when p_outcome = 'inconclusive' then 'open_question'
    else 'not_evaluated'
  end;

  if p_disposition <> v_expected then
    raise exception '% disposition must be % for its outcome and validity facts', p_context, v_expected
      using errcode = '23514';
  end if;
  if p_exception_reference <> 'null'::jsonb
     and (
       not forge_private.is_event_reference(p_exception_reference #>> '{}')
       or v_invalidated
       or (p_validity ->> 'construct_changing_accommodation')::boolean
       or p_outcome <> 'fail'
       or not p_explicit_uncertainty
     ) then
    raise exception '% has an invalid authored uncertainty exception reference', p_context using errcode = '23514';
  end if;
end;
$$;

create or replace function forge_private.assert_adr001_event_shape(p_event jsonb)
returns void
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_event_type text := p_event ->> 'event_type';
  v_payload jsonb := p_event -> 'payload';
  v_response_valid boolean;
  v_explicit_uncertainty boolean;
begin
  if jsonb_typeof(p_event) <> 'object'
     or octet_length(convert_to(p_event::text, 'UTF8')) > 32768 then
    raise exception 'ADR-001 event envelope must be an object no larger than 32 KiB' using errcode = '23514';
  end if;
  perform forge_private.assert_json_object_keys(p_event, array[
    'event_id', 'event_type', 'schema_version', 'aggregate', 'actor', 'authority',
    'occurred_at', 'recorded_at', 'correlation_id', 'causation_id', 'idempotency_key',
    'payload', 'integrity_hash'
  ], 'ADR-001 event envelope');
  perform forge_private.assert_json_object_keys(p_event -> 'aggregate', array['type', 'id', 'version'], 'ADR-001 aggregate');
  perform forge_private.assert_json_object_keys(p_event -> 'actor', array['type', 'id'], 'ADR-001 actor');
  perform forge_private.assert_json_object_keys(p_event -> 'authority', array['policy_version', 'consent_grant_ids'], 'ADR-001 authority');

  if not forge_private.is_adr001_uuid(p_event ->> 'event_id')
     or p_event -> 'schema_version' <> '2'::jsonb
     or v_event_type not in (
       'world_run.started', 'attempt.committed', 'assistance.recorded', 'proof.submitted',
       'evidence.recorded', 'world_run.paused', 'world_run.resumed', 'world_run.completed', 'world_run.corrected'
     )
     or p_event #>> '{aggregate,type}' <> 'world_run'
     or not forge_private.is_event_reference(p_event #>> '{aggregate,id}')
     or p_event #>> '{aggregate,version}' !~ '^[1-9][0-9]*$'
     or p_event #>> '{actor,type}' not in ('learner', 'system', 'validator', 'policy', 'human')
     or not forge_private.is_event_reference(p_event #>> '{actor,id}')
     or not forge_private.is_event_reference(p_event #>> '{authority,policy_version}')
     or not forge_private.is_adr001_timestamp(p_event ->> 'occurred_at')
     or not forge_private.is_adr001_timestamp(p_event ->> 'recorded_at')
     or (p_event ->> 'recorded_at')::timestamptz < (p_event ->> 'occurred_at')::timestamptz
     or not forge_private.is_event_reference(p_event ->> 'correlation_id')
     or (p_event -> 'causation_id' <> 'null'::jsonb and not forge_private.is_adr001_uuid(p_event ->> 'causation_id'))
     or not forge_private.is_event_reference(p_event ->> 'idempotency_key')
     or char_length(p_event ->> 'idempotency_key') not between 16 and 180
     or not forge_private.is_sha256_digest(p_event ->> 'integrity_hash')
     or forge_private.adr001_has_forbidden_text_key(p_event) then
    raise exception 'ADR-001 event envelope contains an invalid or forbidden field' using errcode = '23514';
  end if;
  perform forge_private.assert_adr001_json_text_array(
    p_event #> '{authority,consent_grant_ids}', 'reference', 0, 32, 'ADR-001 authority consent_grant_ids'
  );

  if octet_length(convert_to(v_payload::text, 'UTF8')) > 24576 then
    raise exception 'ADR-001 event payload exceeds 24 KiB' using errcode = '23514';
  end if;

  case v_event_type
    when 'world_run.started' then
      perform forge_private.assert_json_object_keys(v_payload, array[
        'world_id', 'world_version', 'content_version', 'package_integrity_hash', 'protocol_version',
        'runtime_binding_digest', 'capability_id', 'proof_claim_id', 'task_id', 'task_version', 'task_family_id',
        'representation_id', 'context_id', 'bounded_claim', 'validator_id', 'validator_version',
        'proof_authority', 'source_bindings', 'source_provenance_status'
      ], 'ADR-001 world_run.started payload');
      if not forge_private.is_identifier(v_payload ->> 'world_id')
         or not forge_private.is_semver(v_payload ->> 'world_version')
         or not forge_private.is_semver(v_payload ->> 'content_version')
         or not forge_private.is_sha256_digest(v_payload ->> 'package_integrity_hash')
         or not forge_private.is_sha256_digest(v_payload ->> 'runtime_binding_digest')
         or not forge_private.is_semver(v_payload ->> 'protocol_version')
         or not forge_private.is_identifier(v_payload ->> 'capability_id')
         or not forge_private.is_identifier(v_payload ->> 'proof_claim_id')
         or not forge_private.is_identifier(v_payload ->> 'task_id')
         or not forge_private.is_semver(v_payload ->> 'task_version')
         or not forge_private.is_identifier(v_payload ->> 'task_family_id')
         or not forge_private.is_identifier(v_payload ->> 'representation_id')
         or not forge_private.is_identifier(v_payload ->> 'context_id')
         or not forge_private.is_adr001_trimmed_text(v_payload ->> 'bounded_claim', 1200)
         or not forge_private.is_identifier(v_payload ->> 'validator_id')
         or not forge_private.is_semver(v_payload ->> 'validator_version')
         or v_payload ->> 'proof_authority' not in ('honour_based', 'server_enforced', 'human_observed')
         or v_payload ->> 'source_provenance_status' not in ('bound', 'incomplete') then
        raise exception 'ADR-001 world_run.started payload is invalid' using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_source_bindings(
        v_payload -> 'source_bindings', v_payload ->> 'source_provenance_status', 'ADR-001 world_run.started payload'
      );

    when 'attempt.committed' then
      perform forge_private.assert_json_object_keys(v_payload, array[
        'phase', 'stage_id', 'selection_ids', 'response_digest', 'explicit_uncertainty'
      ], 'ADR-001 attempt.committed payload');
      v_response_valid := v_payload -> 'response_digest' = 'null'::jsonb
        or forge_private.is_sha256_digest(v_payload ->> 'response_digest');
      if v_payload ->> 'phase' not in ('initial', 'reconstruction', 'proof')
         or not forge_private.is_adr001_runtime_stage(v_payload ->> 'stage_id')
         or not v_response_valid
         or jsonb_typeof(v_payload -> 'explicit_uncertainty') <> 'boolean' then
        raise exception 'ADR-001 attempt.committed payload is invalid' using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_json_text_array(v_payload -> 'selection_ids', 'identifier', 0, 32, 'ADR-001 attempt selection_ids');
      if jsonb_array_length(v_payload -> 'selection_ids') = 0
         and v_payload -> 'response_digest' = 'null'::jsonb
         and not (v_payload ->> 'explicit_uncertainty')::boolean then
        raise exception 'ADR-001 attempt requires a selection, digest, or explicit uncertainty' using errcode = '23514';
      end if;

    when 'assistance.recorded' then
      perform forge_private.assert_json_object_keys(v_payload, array[
        'support_id', 'stage_id', 'tier', 'source', 'content_reference', 'policy_version',
        'provider_id', 'model_id', 'fallback_reason', 'protected_operation_overlap'
      ], 'ADR-001 assistance.recorded payload');
      if not forge_private.is_identifier(v_payload ->> 'support_id')
         or not forge_private.is_adr001_runtime_stage(v_payload ->> 'stage_id')
         or v_payload ->> 'tier' not in ('attention', 'cue', 'representation', 'example', 'repair', 'solution')
         or v_payload ->> 'source' not in ('authored', 'model', 'human')
         or not forge_private.is_identifier(v_payload ->> 'content_reference')
         or not forge_private.is_event_reference(v_payload ->> 'policy_version')
         or jsonb_typeof(v_payload -> 'protected_operation_overlap') <> 'number'
         or (v_payload ->> 'protected_operation_overlap')::numeric not between 0 and 1 then
        raise exception 'ADR-001 assistance.recorded payload is invalid' using errcode = '23514';
      end if;
      if (
        v_payload ->> 'source' = 'model'
        and (
          not forge_private.is_event_reference(v_payload ->> 'provider_id')
          or not forge_private.is_event_reference(v_payload ->> 'model_id')
          or v_payload -> 'fallback_reason' <> 'null'::jsonb
        )
      ) or (
        v_payload ->> 'source' <> 'model'
        and (
          v_payload -> 'provider_id' <> 'null'::jsonb
          or v_payload -> 'model_id' <> 'null'::jsonb
        )
      ) or (
        v_payload ->> 'source' <> 'authored'
        and v_payload -> 'fallback_reason' <> 'null'::jsonb
      ) or (
        v_payload ->> 'source' = 'authored'
        and not (
          v_payload -> 'fallback_reason' = 'null'::jsonb
          or forge_private.is_event_reference(v_payload ->> 'fallback_reason')
        )
      ) then
        raise exception 'ADR-001 assistance provenance does not match its source' using errcode = '23514';
      end if;

    when 'proof.submitted' then
      perform forge_private.assert_json_object_keys(v_payload, array[
        'task_id', 'task_version', 'task_family_id', 'representation_id', 'context_id', 'selection_ids',
        'response_digest', 'explicit_uncertainty', 'assistance_access', 'proof_nonce_digest', 'access_accommodations'
      ], 'ADR-001 proof.submitted payload');
      if not forge_private.is_identifier(v_payload ->> 'task_id')
         or not forge_private.is_semver(v_payload ->> 'task_version')
         or not forge_private.is_identifier(v_payload ->> 'task_family_id')
         or not forge_private.is_identifier(v_payload ->> 'representation_id')
         or not forge_private.is_identifier(v_payload ->> 'context_id')
         or not (v_payload -> 'response_digest' = 'null'::jsonb or forge_private.is_sha256_digest(v_payload ->> 'response_digest'))
         or jsonb_typeof(v_payload -> 'explicit_uncertainty') <> 'boolean'
         or v_payload ->> 'assistance_access' <> 'removed'
         or not (v_payload -> 'proof_nonce_digest' = 'null'::jsonb or forge_private.is_sha256_digest(v_payload ->> 'proof_nonce_digest')) then
        raise exception 'ADR-001 proof.submitted payload is invalid' using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_json_text_array(v_payload -> 'selection_ids', 'identifier', 0, 32, 'ADR-001 proof selection_ids');
      if jsonb_array_length(v_payload -> 'selection_ids') = 0
         and v_payload -> 'response_digest' = 'null'::jsonb
         and not (v_payload ->> 'explicit_uncertainty')::boolean then
        raise exception 'ADR-001 proof requires a selection, digest, or explicit uncertainty' using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_access_accommodations(v_payload -> 'access_accommodations', 'ADR-001 proof access_accommodations');

    when 'evidence.recorded' then
      perform forge_private.assert_json_object_keys(v_payload, array[
        'evidence_id', 'disposition', 'validator_outcome', 'validator_id', 'validator_version', 'task_id',
        'task_version', 'task_family_id', 'representation_id', 'context_id', 'criteria', 'proof_authority',
        'cognitive_support_event_ids', 'access_accommodations', 'source_bindings', 'source_provenance_status',
        'runtime_binding_digest', 'response_digest', 'explicit_uncertainty', 'authored_uncertainty_exception_reference', 'validity',
        'remains_untested', 'bounded_claim'
      ], 'ADR-001 evidence.recorded payload');
      if not forge_private.is_identifier(v_payload ->> 'evidence_id')
         or v_payload ->> 'disposition' not in ('demonstrated', 'not_demonstrated', 'open_question', 'not_evaluated', 'invalidated')
         or v_payload ->> 'validator_outcome' not in ('pass', 'fail', 'inconclusive', 'not_scored')
         or not forge_private.is_identifier(v_payload ->> 'validator_id')
         or not forge_private.is_semver(v_payload ->> 'validator_version')
         or not forge_private.is_identifier(v_payload ->> 'task_id')
         or not forge_private.is_semver(v_payload ->> 'task_version')
         or not forge_private.is_identifier(v_payload ->> 'task_family_id')
         or not forge_private.is_identifier(v_payload ->> 'representation_id')
         or not forge_private.is_identifier(v_payload ->> 'context_id')
         or v_payload ->> 'proof_authority' not in ('honour_based', 'server_enforced', 'human_observed')
         or not (v_payload -> 'response_digest' = 'null'::jsonb or forge_private.is_sha256_digest(v_payload ->> 'response_digest'))
         or jsonb_typeof(v_payload -> 'explicit_uncertainty') <> 'boolean'
         or not (v_payload -> 'authored_uncertainty_exception_reference' = 'null'::jsonb or forge_private.is_event_reference(v_payload ->> 'authored_uncertainty_exception_reference'))
         or v_payload ->> 'source_provenance_status' not in ('bound', 'incomplete')
         or not forge_private.is_sha256_digest(v_payload ->> 'runtime_binding_digest')
         or not forge_private.is_adr001_trimmed_text(v_payload ->> 'bounded_claim', 1200) then
        raise exception 'ADR-001 evidence.recorded payload is invalid' using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_json_text_array(v_payload -> 'criteria', 'trimmed_text', 1, 32, 'ADR-001 evidence criteria');
      perform forge_private.assert_adr001_json_text_array(v_payload -> 'cognitive_support_event_ids', 'uuid', 0, 64, 'ADR-001 evidence cognitive_support_event_ids');
      perform forge_private.assert_adr001_json_text_array(v_payload -> 'remains_untested', 'trimmed_text', 1, 32, 'ADR-001 evidence remains_untested');
      perform forge_private.assert_adr001_access_accommodations(v_payload -> 'access_accommodations', 'ADR-001 evidence access_accommodations');
      perform forge_private.assert_adr001_source_bindings(
        v_payload -> 'source_bindings', v_payload ->> 'source_provenance_status', 'ADR-001 evidence payload'
      );
      v_explicit_uncertainty := (v_payload ->> 'explicit_uncertainty')::boolean;
      perform forge_private.assert_adr001_validity(
        v_payload -> 'validity', v_payload ->> 'validator_outcome', v_payload ->> 'disposition',
        v_explicit_uncertainty, v_payload -> 'authored_uncertainty_exception_reference', 'ADR-001 evidence payload'
      );

    when 'world_run.paused' then
      perform forge_private.assert_json_object_keys(v_payload, array['stage_id', 'reason_code'], 'ADR-001 world_run.paused payload');
      if not forge_private.is_identifier(v_payload ->> 'stage_id') or not forge_private.is_identifier(v_payload ->> 'reason_code') then
        raise exception 'ADR-001 world_run.paused payload is invalid' using errcode = '23514';
      end if;

    when 'world_run.resumed' then
      perform forge_private.assert_json_object_keys(v_payload, array['stage_id'], 'ADR-001 world_run.resumed payload');
      if not forge_private.is_identifier(v_payload ->> 'stage_id') then
        raise exception 'ADR-001 world_run.resumed payload is invalid' using errcode = '23514';
      end if;

    when 'world_run.completed' then
      perform forge_private.assert_json_object_keys(v_payload, array['disposition', 'evidence_id', 'next_review_at'], 'ADR-001 world_run.completed payload');
      if v_payload ->> 'disposition' not in ('demonstrated', 'not_demonstrated', 'open_question', 'not_evaluated', 'invalidated')
         or not forge_private.is_identifier(v_payload ->> 'evidence_id')
         or not (v_payload -> 'next_review_at' = 'null'::jsonb or forge_private.is_adr001_timestamp(v_payload ->> 'next_review_at')) then
        raise exception 'ADR-001 world_run.completed payload is invalid' using errcode = '23514';
      end if;

    when 'world_run.corrected' then
      perform forge_private.assert_json_object_keys(v_payload, array[
        'supersedes_event_id', 'correction_id', 'reason_code', 'correction_reference', 'replacement_disposition',
        'replacement_validator_outcome', 'replacement_criteria', 'replacement_explicit_uncertainty',
        'replacement_authored_uncertainty_exception_reference', 'replacement_validity'
      ], 'ADR-001 world_run.corrected payload');
      if not forge_private.is_adr001_uuid(v_payload ->> 'supersedes_event_id')
         or not forge_private.is_identifier(v_payload ->> 'correction_id')
         or not forge_private.is_identifier(v_payload ->> 'reason_code')
         or not forge_private.is_identifier(v_payload ->> 'correction_reference')
         or v_payload ->> 'replacement_disposition' not in ('demonstrated', 'not_demonstrated', 'open_question', 'not_evaluated', 'invalidated')
         or v_payload ->> 'replacement_validator_outcome' not in ('pass', 'fail', 'inconclusive', 'not_scored')
         or jsonb_typeof(v_payload -> 'replacement_explicit_uncertainty') <> 'boolean'
         or not (
           v_payload -> 'replacement_authored_uncertainty_exception_reference' = 'null'::jsonb
           or forge_private.is_event_reference(v_payload ->> 'replacement_authored_uncertainty_exception_reference')
         )
         or (p_event #>> '{actor,type}') not in ('validator', 'human') then
        raise exception 'ADR-001 world_run.corrected payload is invalid' using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_json_text_array(v_payload -> 'replacement_criteria', 'trimmed_text', 1, 32, 'ADR-001 correction replacement_criteria');
      perform forge_private.assert_adr001_validity(
        v_payload -> 'replacement_validity', v_payload ->> 'replacement_validator_outcome',
        v_payload ->> 'replacement_disposition', (v_payload ->> 'replacement_explicit_uncertainty')::boolean,
        v_payload -> 'replacement_authored_uncertainty_exception_reference', 'ADR-001 correction payload'
      );
  end case;
end;
$$;

create or replace function forge_private.is_active_adult_owner(p_owner_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner_user_id is not null
    and exists (
      select 1
      from forge.profiles as profile
      join forge.learner_profiles as learner on learner.user_id = profile.user_id
      where profile.user_id = p_owner_user_id
        and profile.account_status = 'active'
        and learner.age_band = 'adult'
        and learner.onboarding_status = 'active'
    );
$$;

create table forge.adr001_event_aggregate_heads (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  aggregate_type text not null check (aggregate_type = 'world_run'),
  aggregate_id text not null check (forge_private.is_event_reference(aggregate_id)),
  current_version bigint not null check (current_version > 0),
  correlation_id text not null check (forge_private.is_event_reference(correlation_id)),
  last_event_id uuid not null,
  lifecycle_state text not null check (lifecycle_state in ('active', 'paused', 'proof_submitted', 'evidence_recorded', 'completed')),
  state_data jsonb not null check (
    jsonb_typeof(state_data) = 'object'
    and not forge_private.adr001_has_forbidden_text_key(state_data)
    and octet_length(convert_to(state_data::text, 'UTF8')) <= 16384
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aggregate_type, aggregate_id)
);

create table forge.adr001_event_journal (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  event_id uuid not null unique,
  event_type text not null check (event_type in (
    'world_run.started', 'attempt.committed', 'assistance.recorded', 'proof.submitted',
    'evidence.recorded', 'world_run.paused', 'world_run.resumed', 'world_run.completed', 'world_run.corrected'
  )),
  schema_version integer not null default 2 check (schema_version = 2),
  aggregate_type text not null check (aggregate_type = 'world_run'),
  aggregate_id text not null check (forge_private.is_event_reference(aggregate_id)),
  aggregate_version bigint not null check (aggregate_version > 0),
  actor_type text not null check (actor_type in ('learner', 'system', 'validator', 'policy', 'human')),
  actor_id text not null check (forge_private.is_event_reference(actor_id)),
  authority jsonb not null check (
    jsonb_typeof(authority) = 'object'
    and not forge_private.adr001_has_forbidden_text_key(authority)
  ),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null check (recorded_at >= occurred_at),
  correlation_id text not null check (forge_private.is_event_reference(correlation_id)),
  causation_id uuid references forge.adr001_event_journal (event_id) on delete restrict,
  idempotency_key text not null unique check (forge_private.is_event_reference(idempotency_key) and char_length(idempotency_key) between 16 and 180),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and not forge_private.adr001_has_forbidden_text_key(payload)
    and octet_length(convert_to(payload::text, 'UTF8')) <= 24576
  ),
  integrity_hash text not null check (forge_private.is_sha256_digest(integrity_hash)),
  event_document jsonb not null check (
    jsonb_typeof(event_document) = 'object'
    and not forge_private.adr001_has_forbidden_text_key(event_document)
    and octet_length(convert_to(event_document::text, 'UTF8')) <= 32768
  ),
  created_at timestamptz not null default now(),
  unique (aggregate_type, aggregate_id, aggregate_version)
);

create table forge.adr001_event_outbox (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  event_id uuid not null unique references forge.adr001_event_journal (event_id) on delete restrict,
  topic text not null check (topic ~ '^forge\.[a-z][a-z0-9_.-]*$'),
  event_document jsonb not null check (
    jsonb_typeof(event_document) = 'object'
    and not forge_private.adr001_has_forbidden_text_key(event_document)
    and octet_length(convert_to(event_document::text, 'UTF8')) <= 32768
  ),
  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  created_at timestamptz not null default now()
);

-- One immutable global claim is the transaction boundary shared by the legacy
-- v1 journal and ADR-001 v2 journal. It is intentionally separate from both
-- history tables so no UUID can be accepted twice across schema versions.
create table forge.event_identity_claims (
  id bigint generated always as identity unique,
  event_id uuid primary key,
  schema_version integer not null check (schema_version in (1, 2)),
  journal_kind text not null check (journal_kind in ('v1', 'v2')),
  event_document jsonb not null check (
    jsonb_typeof(event_document) = 'object'
    and not forge_private.jsonb_has_forbidden_event_key(event_document)
  ),
  claimed_at timestamptz not null default now(),
  check ((schema_version = 1 and journal_kind = 'v1') or (schema_version = 2 and journal_kind = 'v2'))
);

-- Upgrade preservation: every immutable v1 row acquires its global claim in
-- the same migration that installs v2. The unique v1 event_id constraint makes
-- this backfill deterministic and detects any unexpected damaged history.
insert into forge.event_identity_claims (event_id, schema_version, journal_kind, event_document)
select event_id, 1, 'v1', event_document
from forge.event_journal;

create or replace function forge_private.claim_event_identity(
  p_event_id uuid,
  p_schema_version integer,
  p_journal_kind text,
  p_event_document jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing forge.event_identity_claims%rowtype;
begin
  insert into forge.event_identity_claims (event_id, schema_version, journal_kind, event_document)
  values (p_event_id, p_schema_version, p_journal_kind, p_event_document)
  on conflict (event_id) do nothing;

  if found then
    return;
  end if;

  select * into v_existing
  from forge.event_identity_claims
  where event_id = p_event_id;

  if v_existing.schema_version = p_schema_version
     and v_existing.journal_kind = p_journal_kind
     and v_existing.event_document = p_event_document then
    return;
  end if;

  raise exception 'global event ID collision across immutable journals' using errcode = '23505';
end;
$$;

create or replace function forge_private.reject_event_identity_claim_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'forge.event_identity_claims is immutable' using errcode = '55000';
end;
$$;

create trigger event_identity_claims_append_only
before update or delete on forge.event_identity_claims
for each row execute function forge_private.reject_event_identity_claim_mutation();

create trigger event_identity_claims_reject_truncate
before truncate on forge.event_identity_claims
for each statement execute function forge_private.reject_event_identity_claim_mutation();

create index adr001_event_journal_owner_replay_idx
  on forge.adr001_event_journal (owner_user_id, aggregate_type, aggregate_id, aggregate_version, id);
create index adr001_event_aggregate_heads_owner_user_id_idx
  on forge.adr001_event_aggregate_heads (owner_user_id);
create index adr001_event_journal_causation_id_idx on forge.adr001_event_journal (causation_id);
create index adr001_event_outbox_owner_user_id_idx on forge.adr001_event_outbox (owner_user_id);
create index adr001_event_outbox_pending_delivery_idx
  on forge.adr001_event_outbox (available_at, id)
  where delivered_at is null;

create or replace function forge_private.reject_adr001_event_journal_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'forge.adr001_event_journal is append-only; no direct mutation is permitted'
    using errcode = '55000';
end;
$$;

create trigger adr001_event_journal_append_only
before update or delete on forge.adr001_event_journal
for each row execute function forge_private.reject_adr001_event_journal_mutation();

create trigger adr001_event_journal_reject_truncate
before truncate on forge.adr001_event_journal
for each statement execute function forge_private.reject_adr001_event_journal_mutation();

-- Outbox identity is part of the immutable event record. Delivery workers may
-- only advance a row through the narrow functions below; no role receives
-- direct UPDATE on either outbox table after this migration.
create or replace function forge_private.reject_adr001_event_outbox_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'forge.adr001_event_outbox is immutable' using errcode = '55000';
  end if;
  if new.event_id is distinct from old.event_id
     or new.topic is distinct from old.topic
     or new.event_document is distinct from old.event_document
     or new.owner_user_id is distinct from old.owner_user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'ADR-001 outbox event identity and document are immutable' using errcode = '55000';
  end if;
  if old.delivered_at is not null
     or new.delivery_attempts <> old.delivery_attempts + 1
     or new.available_at < old.available_at
     or (new.delivered_at is not null and new.delivered_at < old.created_at) then
    raise exception 'ADR-001 outbox delivery transition is invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger adr001_event_outbox_delivery_only
before update or delete on forge.adr001_event_outbox
for each row execute function forge_private.reject_adr001_event_outbox_mutation();

create trigger adr001_event_outbox_reject_truncate
before truncate on forge.adr001_event_outbox
for each statement execute function forge_private.reject_adr001_event_outbox_mutation();

create or replace function forge.mark_adr001_event_outbox_delivery(
  p_event_id uuid,
  p_delivered boolean,
  p_next_available_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outbox forge.adr001_event_outbox%rowtype;
begin
  if p_event_id is null or (not p_delivered and p_next_available_at is null) then
    raise exception 'ADR-001 delivery requires an event ID and a next availability time for retries'
      using errcode = '22023';
  end if;

  update forge.adr001_event_outbox
  set delivery_attempts = delivery_attempts + 1,
      delivered_at = case when p_delivered then now() else null end,
      available_at = case when p_delivered then available_at else p_next_available_at end
  where event_id = p_event_id
    and delivered_at is null
  returning * into v_outbox;

  if not found then
    raise exception 'ADR-001 outbox row is unavailable for delivery' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'event_id', v_outbox.event_id,
    'delivery_attempts', v_outbox.delivery_attempts,
    'delivered_at', v_outbox.delivered_at,
    'available_at', v_outbox.available_at
  );
end;
$$;

create or replace function forge_private.reject_event_outbox_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'forge.event_outbox is immutable' using errcode = '55000';
  end if;
  if new.event_id is distinct from old.event_id
     or new.topic is distinct from old.topic
     or new.event_document is distinct from old.event_document
     or new.created_at is distinct from old.created_at then
    raise exception 'legacy outbox event identity and document are immutable' using errcode = '55000';
  end if;
  if old.status <> 'pending'
     or new.attempts <> old.attempts + 1
     or new.claimed_at is null
     or new.updated_at < old.updated_at
     or (new.status = 'published' and new.published_at is null)
     or (new.status <> 'published' and new.published_at is not null)
     or (new.status = 'pending' and new.available_at < old.available_at) then
    raise exception 'legacy outbox delivery transition is invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger event_outbox_delivery_only
before update or delete on forge.event_outbox
for each row execute function forge_private.reject_event_outbox_mutation();

create trigger event_outbox_reject_truncate
before truncate on forge.event_outbox
for each statement execute function forge_private.reject_event_outbox_mutation();

-- Historical v1 rows may contain delivery errors authored before this bounded
-- contract. NOT VALID preserves those rows during upgrade, while PostgreSQL
-- still enforces the check for every new or subsequently updated row.
alter table forge.event_outbox
add constraint event_outbox_last_error_code_shape check (
  last_error_code is null
  or (
    char_length(last_error_code) between 3 and 80
    and last_error_code ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
  )
) not valid;

create or replace function forge.mark_event_outbox_delivery(
  p_event_id uuid,
  p_status text,
  p_next_available_at timestamptz default null,
  p_last_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outbox forge.event_outbox%rowtype;
begin
  if p_event_id is null
     or p_status not in ('pending', 'published', 'dead_letter')
     or (p_status = 'pending' and p_next_available_at is null)
     or (
       p_last_error_code is not null
       and (
         char_length(p_last_error_code) not between 3 and 80
         or p_last_error_code !~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
       )
     ) then
    raise exception 'legacy outbox delivery arguments are invalid' using errcode = '22023';
  end if;

  update forge.event_outbox
  set attempts = attempts + 1,
      status = p_status,
      available_at = case when p_status = 'pending' then p_next_available_at else available_at end,
      claimed_at = now(),
      published_at = case when p_status = 'published' then now() else null end,
      last_error_code = p_last_error_code,
      updated_at = now()
  where event_id = p_event_id
    and status = 'pending'
  returning * into v_outbox;

  if not found then
    raise exception 'legacy outbox row is unavailable for delivery' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'event_id', v_outbox.event_id,
    'status', v_outbox.status,
    'attempts', v_outbox.attempts,
    'published_at', v_outbox.published_at,
    'available_at', v_outbox.available_at
  );
end;
$$;

-- The original v1 appender still owns forge.event_journal. This trigger is a
-- migration-safe bridge: it makes a version-1 write fail if v2 has already
-- claimed the same aggregate, event ID, or idempotency key.
create or replace function forge_private.reject_v1_adr001_collision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Direct legacy inserts must serialize through the same boundary as
  -- forge.append_event: idempotency first, then aggregate. The legacy
  -- appender already takes these locks, so re-entry is harmless there.
  perform pg_advisory_xact_lock(hashtextextended('forge:idempotency:' || new.idempotency_key, 0));
  perform pg_advisory_xact_lock(hashtextextended(
    'forge:aggregate:' || new.aggregate_type || ':' || new.aggregate_id,
    0
  ));
  perform forge_private.claim_event_identity(new.event_id, 1, 'v1', new.event_document);

  if exists (select 1 from forge.adr001_event_journal where event_id = new.event_id) then
    raise exception 'event ID collision with ADR-001 version 2 history' using errcode = '23505';
  end if;
  if exists (select 1 from forge.adr001_event_journal where idempotency_key = new.idempotency_key) then
    raise exception 'idempotency key collision with ADR-001 version 2 history' using errcode = '23505';
  end if;
  if exists (
    select 1
    from forge.adr001_event_aggregate_heads
    where aggregate_type = new.aggregate_type and aggregate_id = new.aggregate_id
  ) then
    raise exception 'schema version mismatch: aggregate already belongs to ADR-001 version 2 history'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger event_journal_reject_adr001_collision
before insert on forge.event_journal
for each row execute function forge_private.reject_v1_adr001_collision();

create or replace function forge.append_adr001_v2_event(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_user_id uuid;
  v_event_id uuid;
  v_event_type text;
  v_aggregate_id text;
  v_aggregate_version bigint;
  v_correlation_id text;
  v_causation_id uuid;
  v_idempotency_key text;
  v_payload jsonb;
  v_head forge.adr001_event_aggregate_heads%rowtype;
  v_existing forge.adr001_event_journal%rowtype;
  v_head_exists boolean;
  v_lifecycle_state text;
  v_state_data jsonb;
  v_outbox_id bigint;
begin
  -- Shape and semantic validation are deliberately before role validation so a
  -- service-role/BYPASSRLS caller cannot make malformed v2 data valid.
  perform forge_private.assert_adr001_event_shape(p_event);
  if p_event ->> 'integrity_hash' <> forge_private.sha256_jsonb(p_event - 'integrity_hash') then
    raise exception 'ADR-001 event integrity hash does not match the canonical envelope' using errcode = '22000';
  end if;

  v_event_type := p_event ->> 'event_type';
  if v_event_type = 'world_run.corrected'
     or p_event #>> '{actor,type}' <> 'learner'
     or p_event #>> '{actor,id}' !~ '^device\.[a-f0-9]{24}$' then
    raise exception 'direct ADR-001 persistence accepts learner runtime events only' using errcode = '42501';
  end if;

  if current_setting('request.jwt.claim.role', true) is distinct from 'authenticated' then
    raise exception 'ADR-001 persistence requires an authenticated request role' using errcode = '42501';
  end if;

  v_owner_user_id := auth.uid();
  if not forge_private.is_active_adult_owner(v_owner_user_id) then
    raise exception 'ADR-001 persistence requires an authenticated active adult owner' using errcode = '42501';
  end if;

  v_event_id := (p_event ->> 'event_id')::uuid;
  v_aggregate_id := p_event #>> '{aggregate,id}';
  v_aggregate_version := (p_event #>> '{aggregate,version}')::bigint;
  v_correlation_id := p_event ->> 'correlation_id';
  v_causation_id := nullif(p_event ->> 'causation_id', '')::uuid;
  v_idempotency_key := p_event ->> 'idempotency_key';
  v_payload := p_event -> 'payload';

  -- The v1 appender takes these same locks, so cross-version aggregate claims
  -- cannot race past the bridge checks.
  perform pg_advisory_xact_lock(hashtextextended('forge:idempotency:' || v_idempotency_key, 0));
  perform pg_advisory_xact_lock(hashtextextended('forge:aggregate:world_run:' || v_aggregate_id, 0));

  if exists (select 1 from forge.event_journal where idempotency_key = v_idempotency_key) then
    raise exception 'idempotency key collision with version 1 history' using errcode = '23505';
  end if;
  if exists (select 1 from forge.event_journal where event_id = v_event_id) then
    raise exception 'event ID collision with version 1 history' using errcode = '23505';
  end if;
  if exists (
    select 1 from forge.event_aggregate_heads
    where aggregate_type = 'world_run' and aggregate_id = v_aggregate_id
  ) then
    raise exception 'schema version mismatch: aggregate already belongs to version 1 history' using errcode = '23514';
  end if;

  select * into v_existing
  from forge.adr001_event_journal
  where idempotency_key = v_idempotency_key;
  if found then
    if v_existing.event_document = p_event and v_existing.owner_user_id = v_owner_user_id then
      return jsonb_build_object(
        'disposition', 'duplicate',
        'event_id', v_existing.event_id,
        'aggregate_version', v_existing.aggregate_version,
        'outbox_id', (select id from forge.adr001_event_outbox where event_id = v_existing.event_id)
      );
    end if;
    raise exception 'idempotency key collision' using errcode = '23505';
  end if;

  -- This insert is the immutable, cross-schema event-ID boundary. If any
  -- later journal, head, or outbox work fails, the transaction rolls it back.
  perform forge_private.claim_event_identity(v_event_id, 2, 'v2', p_event);

  select * into v_existing
  from forge.adr001_event_journal
  where event_id = v_event_id;
  if found then
    raise exception 'event ID collision' using errcode = '23505';
  end if;

  select * into v_head
  from forge.adr001_event_aggregate_heads
  where aggregate_type = 'world_run' and aggregate_id = v_aggregate_id
  for update;
  v_head_exists := found;

  if not v_head_exists then
    if v_aggregate_version <> 1 or v_causation_id is not null or v_event_type <> 'world_run.started' then
      raise exception 'ADR-001 run must begin at version 1 with world_run.started and no cause' using errcode = '23514';
    end if;
    v_lifecycle_state := 'active';
    v_state_data := jsonb_build_object(
      'world_id', v_payload ->> 'world_id',
      'world_version', v_payload ->> 'world_version',
      'content_version', v_payload ->> 'content_version',
      'package_integrity_hash', v_payload ->> 'package_integrity_hash',
      'runtime_binding_digest', v_payload ->> 'runtime_binding_digest',
      'actor_id', p_event #>> '{actor,id}',
      'validator_id', v_payload ->> 'validator_id',
      'validator_version', v_payload ->> 'validator_version',
      'proof_authority', v_payload ->> 'proof_authority',
      'task_id', v_payload ->> 'task_id',
      'task_version', v_payload ->> 'task_version',
      'task_family_id', v_payload ->> 'task_family_id',
      'representation_id', v_payload ->> 'representation_id',
      'context_id', v_payload ->> 'context_id',
      'source_bindings', v_payload -> 'source_bindings',
      'source_provenance_status', v_payload ->> 'source_provenance_status',
      'cognitive_support_event_ids', '[]'::jsonb
    );
  else
    if v_head.owner_user_id <> v_owner_user_id then
      raise exception 'ADR-001 aggregate belongs to a different adult owner' using errcode = '42501';
    end if;
    if p_event #>> '{actor,id}' <> v_head.state_data ->> 'actor_id' then
      raise exception 'ADR-001 aggregate actor identity does not match its learner runtime owner' using errcode = '42501';
    end if;
    if v_aggregate_version <> v_head.current_version + 1 then
      raise exception 'aggregate version conflict: expected %, received %', v_head.current_version + 1, v_aggregate_version
        using errcode = '40001';
    end if;
    if v_correlation_id <> v_head.correlation_id then
      raise exception 'correlation mismatch' using errcode = '23514';
    end if;
    if v_causation_id is distinct from v_head.last_event_id then
      raise exception 'causation mismatch: event must follow the current aggregate head' using errcode = '23514';
    end if;

    v_lifecycle_state := v_head.lifecycle_state;
    v_state_data := v_head.state_data;
    case v_event_type
      when 'attempt.committed' then
        if v_lifecycle_state <> 'active' then
          raise exception 'forbidden transition: attempt while run is %', v_lifecycle_state using errcode = '23514';
        end if;
      when 'assistance.recorded' then
        if v_lifecycle_state <> 'active' then
          raise exception 'forbidden transition: assistance while run is %', v_lifecycle_state using errcode = '23514';
        end if;
        v_state_data := v_state_data || jsonb_build_object(
          'cognitive_support_event_ids',
          coalesce(v_state_data -> 'cognitive_support_event_ids', '[]'::jsonb) || jsonb_build_array(v_event_id::text)
        );
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
        if v_payload ->> 'task_id' <> v_state_data ->> 'task_id'
           or v_payload ->> 'task_version' <> v_state_data ->> 'task_version'
           or v_payload ->> 'task_family_id' <> v_state_data ->> 'task_family_id'
           or v_payload ->> 'representation_id' <> v_state_data ->> 'representation_id'
           or v_payload ->> 'context_id' <> v_state_data ->> 'context_id' then
          raise exception 'ADR-001 proof task, representation, and context must match the run start' using errcode = '23514';
        end if;
        v_lifecycle_state := 'proof_submitted';
        v_state_data := v_state_data || jsonb_build_object(
          'proof_event_id', v_event_id,
          'proof_response_digest', v_payload -> 'response_digest',
          'proof_explicit_uncertainty', v_payload -> 'explicit_uncertainty',
          'proof_access_accommodations', v_payload -> 'access_accommodations'
        );
      when 'evidence.recorded' then
        if v_lifecycle_state <> 'proof_submitted' then
          raise exception 'forbidden transition: evidence while run is %', v_lifecycle_state using errcode = '23514';
        end if;
        if v_payload ->> 'validator_id' <> v_state_data ->> 'validator_id'
           or v_payload ->> 'validator_version' <> v_state_data ->> 'validator_version'
           or v_payload ->> 'proof_authority' <> v_state_data ->> 'proof_authority'
           or v_payload ->> 'runtime_binding_digest' <> v_state_data ->> 'runtime_binding_digest'
           or v_payload ->> 'task_id' <> v_state_data ->> 'task_id'
           or v_payload ->> 'task_version' <> v_state_data ->> 'task_version'
           or v_payload ->> 'task_family_id' <> v_state_data ->> 'task_family_id'
           or v_payload ->> 'representation_id' <> v_state_data ->> 'representation_id'
           or v_payload ->> 'context_id' <> v_state_data ->> 'context_id'
           or v_payload -> 'response_digest' <> v_state_data -> 'proof_response_digest'
           or v_payload -> 'explicit_uncertainty' <> v_state_data -> 'proof_explicit_uncertainty'
           or v_payload -> 'access_accommodations' <> v_state_data -> 'proof_access_accommodations'
           or v_payload -> 'source_bindings' <> v_state_data -> 'source_bindings'
           or v_payload ->> 'source_provenance_status' <> v_state_data ->> 'source_provenance_status' then
          raise exception 'ADR-001 evidence must preserve run, proof, access, and source facts' using errcode = '23514';
        end if;
        if v_payload -> 'cognitive_support_event_ids' <> v_state_data -> 'cognitive_support_event_ids' then
          raise exception 'ADR-001 evidence must preserve the exact cognitive support sequence in the run' using errcode = '23514';
        end if;
        if v_payload ->> 'disposition' = 'demonstrated'
           and exists (
             select 1
             from forge.adr001_event_journal as assistance
             where assistance.aggregate_type = 'world_run'
               and assistance.aggregate_id = v_aggregate_id
               and assistance.event_type = 'assistance.recorded'
               and (assistance.payload ->> 'protected_operation_overlap')::numeric > 0
           ) then
          raise exception 'demonstrated evidence cannot follow protected-operation cognitive support' using errcode = '23514';
        end if;
        v_lifecycle_state := 'evidence_recorded';
        v_state_data := v_state_data || jsonb_build_object(
          'evidence_event_id', v_event_id,
          'evidence_id', v_payload ->> 'evidence_id',
          'evidence_disposition', v_payload ->> 'disposition'
        );
      when 'world_run.completed' then
        if v_lifecycle_state <> 'evidence_recorded'
           or v_payload ->> 'evidence_id' <> v_state_data ->> 'evidence_id'
           or v_payload ->> 'disposition' <> v_state_data ->> 'evidence_disposition' then
          raise exception 'ADR-001 completion must preserve the recorded evidence disposition' using errcode = '23514';
        end if;
        v_lifecycle_state := 'completed';
        v_state_data := v_state_data || jsonb_build_object('completion_event_id', v_event_id);
      when 'world_run.corrected' then
        if v_lifecycle_state <> 'completed' then
          raise exception 'forbidden transition: correction before completion' using errcode = '23514';
        end if;
        if not exists (
          select 1 from forge.adr001_event_journal as target
          where target.event_id = (v_payload ->> 'supersedes_event_id')::uuid
            and target.aggregate_type = 'world_run'
            and target.aggregate_id = v_aggregate_id
            and target.event_type = 'evidence.recorded'
        ) or exists (
          select 1 from forge.adr001_event_journal as prior_correction
          where prior_correction.aggregate_type = 'world_run'
            and prior_correction.aggregate_id = v_aggregate_id
            and prior_correction.event_type = 'world_run.corrected'
            and prior_correction.payload ->> 'supersedes_event_id' = v_payload ->> 'supersedes_event_id'
        ) then
          raise exception 'ADR-001 correction must uniquely supersede an earlier evidence event in the same run' using errcode = '23514';
        end if;
      else
        raise exception 'forbidden ADR-001 event type %', v_event_type using errcode = '23514';
    end case;
  end if;

  insert into forge.adr001_event_journal (
    owner_user_id, event_id, event_type, schema_version, aggregate_type, aggregate_id, aggregate_version,
    actor_type, actor_id, authority, occurred_at, recorded_at, correlation_id, causation_id,
    idempotency_key, payload, integrity_hash, event_document
  ) values (
    v_owner_user_id, v_event_id, v_event_type, 2, 'world_run', v_aggregate_id, v_aggregate_version,
    p_event #>> '{actor,type}', p_event #>> '{actor,id}', p_event -> 'authority',
    (p_event ->> 'occurred_at')::timestamptz, (p_event ->> 'recorded_at')::timestamptz,
    v_correlation_id, v_causation_id, v_idempotency_key, v_payload, p_event ->> 'integrity_hash', p_event
  );

  if v_head_exists then
    update forge.adr001_event_aggregate_heads
    set current_version = v_aggregate_version,
        last_event_id = v_event_id,
        lifecycle_state = v_lifecycle_state,
        state_data = v_state_data,
        updated_at = now()
    where id = v_head.id;
  else
    insert into forge.adr001_event_aggregate_heads (
      owner_user_id, aggregate_type, aggregate_id, current_version, correlation_id,
      last_event_id, lifecycle_state, state_data
    ) values (
      v_owner_user_id, 'world_run', v_aggregate_id, v_aggregate_version, v_correlation_id,
      v_event_id, v_lifecycle_state, v_state_data
    );
  end if;

  insert into forge.adr001_event_outbox (owner_user_id, event_id, topic, event_document)
  values (v_owner_user_id, v_event_id, 'forge.' || v_event_type, p_event)
  returning id into v_outbox_id;

  return jsonb_build_object(
    'disposition', 'appended',
    'event_id', v_event_id,
    'aggregate_version', v_aggregate_version,
    'outbox_id', v_outbox_id
  );
end;
$$;

alter table forge.adr001_event_aggregate_heads enable row level security;
alter table forge.adr001_event_aggregate_heads force row level security;
alter table forge.adr001_event_journal enable row level security;
alter table forge.adr001_event_journal force row level security;
alter table forge.adr001_event_outbox enable row level security;
alter table forge.adr001_event_outbox force row level security;
alter table forge.event_identity_claims enable row level security;
alter table forge.event_identity_claims force row level security;

create policy adr001_event_aggregate_heads_select_owner on forge.adr001_event_aggregate_heads
for select to authenticated
using (owner_user_id = (select auth.uid()) and (select forge_private.is_active_adult_owner(owner_user_id)));

create policy adr001_event_journal_select_owner on forge.adr001_event_journal
for select to authenticated
using (owner_user_id = (select auth.uid()) and (select forge_private.is_active_adult_owner(owner_user_id)));

create policy adr001_event_outbox_select_owner on forge.adr001_event_outbox
for select to authenticated
using (owner_user_id = (select auth.uid()) and (select forge_private.is_active_adult_owner(owner_user_id)));

revoke all on table forge.adr001_event_aggregate_heads, forge.adr001_event_journal, forge.adr001_event_outbox,
  forge.event_identity_claims
  from public, anon, authenticated, service_role;
revoke all on sequence forge.adr001_event_aggregate_heads_id_seq, forge.adr001_event_journal_id_seq, forge.adr001_event_outbox_id_seq,
  forge.event_identity_claims_id_seq
  from public, anon, authenticated, service_role;
grant select on table forge.adr001_event_aggregate_heads, forge.adr001_event_journal, forge.adr001_event_outbox to authenticated;

-- The historical migration granted broad service-role UPDATE on the v1
-- outbox. Replace it with two small, state-only delivery contracts.
revoke update on table forge.event_outbox from service_role;

revoke all on function forge.append_adr001_v2_event(jsonb) from public, anon, service_role;
grant execute on function forge.append_adr001_v2_event(jsonb) to authenticated;
revoke all on function forge.mark_adr001_event_outbox_delivery(uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function forge.mark_adr001_event_outbox_delivery(uuid, boolean, timestamptz) to service_role;
revoke all on function forge.mark_event_outbox_delivery(uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function forge.mark_event_outbox_delivery(uuid, text, timestamptz, text) to service_role;
revoke all on function
  forge_private.is_adr001_timestamp(text),
  forge_private.is_adr001_runtime_stage(text),
  forge_private.is_adr001_uuid(text),
  forge_private.is_adr001_trimmed_text(text, integer),
  forge_private.assert_adr001_json_text_array(jsonb, text, integer, integer, text),
  forge_private.adr001_has_forbidden_text_key(jsonb),
  forge_private.assert_adr001_access_accommodations(jsonb, text),
  forge_private.assert_adr001_source_bindings(jsonb, text, text),
  forge_private.assert_adr001_validity(jsonb, text, text, boolean, jsonb, text),
  forge_private.assert_adr001_event_shape(jsonb),
  forge_private.is_active_adult_owner(uuid),
  forge_private.reject_adr001_event_journal_mutation(),
  forge_private.reject_adr001_event_outbox_mutation(),
  forge_private.reject_event_outbox_mutation(),
  forge_private.claim_event_identity(uuid, integer, text, jsonb),
  forge_private.reject_event_identity_claim_mutation(),
  forge_private.reject_v1_adr001_collision()
from public, anon, authenticated;
-- This SECURITY DEFINER predicate is referenced by the owner-only RLS
-- policies. It exposes only the caller's active-adult eligibility result.
grant execute on function forge_private.is_active_adult_owner(uuid) to authenticated, service_role;

comment on table forge.adr001_event_journal is
  'Adult-owned ADR-001 version-2 runtime history. Public persistence remains disabled pending configured-project gates.';
comment on function forge.append_adr001_v2_event(jsonb) is
  'Validated, append-only ADR-001 version-2 learner runtime boundary. It requires an authenticated active adult owner, rejects corrections and non-learner actors, and creates an immutable outbox row in the same transaction.';

commit;
