-- FORGE ADR-001 v2 evidence-authority correction (14-digit migration timestamp).
--
-- The original staged v2 appender accepted a complete canonical envelope from
-- an authenticated browser.  That made a well-formed client document capable
-- of choosing runtime, validator, proof-authority, nonce, and disposition
-- facts.  This additive correction retains every historical row for operator
-- audit, closes the client appender, removes the ambiguous owner-facing raw
-- journal surface, and introduces two strictly separate paths:
--
--   authenticated learner -> untrusted submission inbox
--   server validator      -> tuple-bound canonical projection
--
-- The inbox is deliberately not evidence.  It contains only bounded learner
-- observations.  A canonical journal/head/outbox row can be created only by
-- a service-role call carrying an active server validator authority and an
-- exact server-installed runtime tuple.  No browser field can supply either.

begin;

create or replace function forge_private.assert_adr001_untrusted_submission_shape(
  p_submission_kind text,
  p_submission_document jsonb
)
returns void
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_response_valid boolean;
begin
  if jsonb_typeof(p_submission_document) <> 'object'
     or octet_length(convert_to(p_submission_document::text, 'UTF8')) > 8192
     or forge_private.adr001_has_forbidden_text_key(p_submission_document) then
    raise exception 'ADR-001 learner submission is malformed or contains forbidden text' using errcode = '23514';
  end if;

  case p_submission_kind
    when 'attempt' then
      perform forge_private.assert_json_object_keys(
        p_submission_document,
        array['phase', 'stage_id', 'selection_ids', 'response_digest', 'explicit_uncertainty'],
        'ADR-001 learner attempt submission'
      );
      v_response_valid := p_submission_document -> 'response_digest' = 'null'::jsonb
        or forge_private.is_sha256_digest(p_submission_document ->> 'response_digest');
      if p_submission_document ->> 'phase' not in ('initial', 'reconstruction', 'proof')
         or not forge_private.is_adr001_runtime_stage(p_submission_document ->> 'stage_id')
         or not v_response_valid
         or jsonb_typeof(p_submission_document -> 'explicit_uncertainty') <> 'boolean' then
        raise exception 'ADR-001 learner attempt submission is invalid' using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_json_text_array(
        p_submission_document -> 'selection_ids', 'identifier', 0, 32, 'ADR-001 learner attempt selection_ids'
      );
      if jsonb_array_length(p_submission_document -> 'selection_ids') = 0
         and p_submission_document -> 'response_digest' = 'null'::jsonb
         and not (p_submission_document ->> 'explicit_uncertainty')::boolean then
        raise exception 'ADR-001 learner attempt requires a selection, digest, or explicit uncertainty' using errcode = '23514';
      end if;

    when 'proof' then
      -- Task identity, access state, accommodation classification, nonce,
      -- proof authority, validator, validity, and disposition are all server
      -- derived.  They are intentionally absent from this exact shape.
      perform forge_private.assert_json_object_keys(
        p_submission_document,
        array['selection_ids', 'response_digest', 'explicit_uncertainty'],
        'ADR-001 learner proof submission'
      );
      v_response_valid := p_submission_document -> 'response_digest' = 'null'::jsonb
        or forge_private.is_sha256_digest(p_submission_document ->> 'response_digest');
      if not v_response_valid
         or jsonb_typeof(p_submission_document -> 'explicit_uncertainty') <> 'boolean' then
        raise exception 'ADR-001 learner proof submission is invalid' using errcode = '23514';
      end if;
      perform forge_private.assert_adr001_json_text_array(
        p_submission_document -> 'selection_ids', 'identifier', 0, 32, 'ADR-001 learner proof selection_ids'
      );
      if jsonb_array_length(p_submission_document -> 'selection_ids') = 0
         and p_submission_document -> 'response_digest' = 'null'::jsonb
         and not (p_submission_document ->> 'explicit_uncertainty')::boolean then
        raise exception 'ADR-001 learner proof requires a selection, digest, or explicit uncertainty' using errcode = '23514';
      end if;

    when 'observation' then
      -- Observations can support later review but can never be replayed as a
      -- validator decision or an evidence event without a separate projection.
      perform forge_private.assert_json_object_keys(
        p_submission_document,
        array['observation_kind', 'observation_digest'],
        'ADR-001 learner observation submission'
      );
      if not forge_private.is_identifier(p_submission_document ->> 'observation_kind')
         or not forge_private.is_sha256_digest(p_submission_document ->> 'observation_digest') then
        raise exception 'ADR-001 learner observation submission is invalid' using errcode = '23514';
      end if;

    else
      raise exception 'ADR-001 learner submission kind is not allowed' using errcode = '23514';
  end case;
end;
$$;

create table forge.adr001_untrusted_learner_submissions (
  id bigint generated always as identity primary key,
  submission_id uuid not null unique default extensions.gen_random_uuid(),
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  aggregate_id text not null check (forge_private.is_event_reference(aggregate_id)),
  submission_kind text not null check (submission_kind in ('attempt', 'proof', 'observation')),
  client_submission_key text not null check (
    forge_private.is_event_reference(client_submission_key)
    and char_length(client_submission_key) between 16 and 180
  ),
  submission_document jsonb not null check (
    jsonb_typeof(submission_document) = 'object'
    and not forge_private.adr001_has_forbidden_text_key(submission_document)
    and octet_length(convert_to(submission_document::text, 'UTF8')) <= 8192
  ),
  received_at timestamptz not null default now(),
  unique (owner_user_id, client_submission_key)
);

create index adr001_untrusted_learner_submissions_owner_replay_idx
  on forge.adr001_untrusted_learner_submissions (owner_user_id, aggregate_id, received_at, id);

create or replace function forge_private.enforce_adr001_untrusted_learner_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_user_id is distinct from auth.uid()
     or not forge_private.is_active_adult_owner(new.owner_user_id) then
    raise exception 'ADR-001 learner submission must belong to the authenticated active adult owner' using errcode = '42501';
  end if;
  perform forge_private.assert_adr001_untrusted_submission_shape(new.submission_kind, new.submission_document);
  return new;
end;
$$;

create or replace function forge_private.reject_adr001_untrusted_learner_submission_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ADR-001 learner submissions are append-only observations' using errcode = '55000';
end;
$$;

create trigger adr001_untrusted_learner_submissions_validate
before insert on forge.adr001_untrusted_learner_submissions
for each row execute function forge_private.enforce_adr001_untrusted_learner_submission();

create trigger adr001_untrusted_learner_submissions_append_only
before update or delete on forge.adr001_untrusted_learner_submissions
for each row execute function forge_private.reject_adr001_untrusted_learner_submission_mutation();

create trigger adr001_untrusted_learner_submissions_reject_truncate
before truncate on forge.adr001_untrusted_learner_submissions
for each statement execute function forge_private.reject_adr001_untrusted_learner_submission_mutation();

-- This digest is the machine-readable validator scope, not an operator label.
-- It deliberately covers every identity that may change which validator,
-- runtime, task, representation, or proof regime is authoritative. Source and
-- package integrity remain covered by the tuple_digest over the full payload.
create or replace function forge_private.adr001_validator_scope_digest(
  p_start_payload jsonb
)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_scope jsonb;
begin
  if jsonb_typeof(p_start_payload) <> 'object'
     or not forge_private.is_identifier(p_start_payload ->> 'validator_id')
     or not forge_private.is_semver(p_start_payload ->> 'validator_version')
     or p_start_payload ->> 'proof_authority' not in ('honour_based', 'server_enforced', 'human_observed')
     or not forge_private.is_identifier(p_start_payload ->> 'capability_id')
     or not forge_private.is_identifier(p_start_payload ->> 'proof_claim_id')
     or not forge_private.is_identifier(p_start_payload ->> 'task_id')
     or not forge_private.is_semver(p_start_payload ->> 'task_version')
     or not forge_private.is_identifier(p_start_payload ->> 'task_family_id')
     or not forge_private.is_identifier(p_start_payload ->> 'representation_id')
     or not forge_private.is_identifier(p_start_payload ->> 'context_id')
     or not forge_private.is_identifier(p_start_payload ->> 'world_id')
     or not forge_private.is_semver(p_start_payload ->> 'world_version')
     or not forge_private.is_semver(p_start_payload ->> 'content_version')
     or not forge_private.is_semver(p_start_payload ->> 'protocol_version')
     or not forge_private.is_sha256_digest(p_start_payload ->> 'package_integrity_hash')
     or not forge_private.is_sha256_digest(p_start_payload ->> 'runtime_binding_digest') then
    raise exception 'ADR-001 validator scope requires a complete valid trusted start payload' using errcode = '23514';
  end if;

  v_scope := jsonb_build_object(
    'validator_id', p_start_payload ->> 'validator_id',
    'validator_version', p_start_payload ->> 'validator_version',
    'proof_authority', p_start_payload ->> 'proof_authority',
    'capability_id', p_start_payload ->> 'capability_id',
    'proof_claim_id', p_start_payload ->> 'proof_claim_id',
    'task_id', p_start_payload ->> 'task_id',
    'task_version', p_start_payload ->> 'task_version',
    'task_family_id', p_start_payload ->> 'task_family_id',
    'representation_id', p_start_payload ->> 'representation_id',
    'context_id', p_start_payload ->> 'context_id',
    'world_id', p_start_payload ->> 'world_id',
    'world_version', p_start_payload ->> 'world_version',
    'content_version', p_start_payload ->> 'content_version',
    'protocol_version', p_start_payload ->> 'protocol_version',
    'package_integrity_hash', p_start_payload ->> 'package_integrity_hash',
    'runtime_binding_digest', p_start_payload ->> 'runtime_binding_digest'
  );
  return forge_private.sha256_jsonb(v_scope);
end;
$$;

-- Only trusted server deployment/validator machinery may install or revoke an
-- authority and its tuple.  The records are not in the learner API surface.
create table forge.adr001_server_validator_authorities (
  id bigint generated always as identity unique,
  authority_id text primary key check (forge_private.is_event_reference(authority_id)),
  authority_kind text not null check (authority_kind in ('server_validator', 'human_assessor')),
  authority_scope_digest text not null check (forge_private.is_sha256_digest(authority_scope_digest)),
  status text not null default 'active' check (status in ('active', 'revoked')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason_code text,
  check (
    (status = 'active' and revoked_at is null and revocation_reason_code is null)
    or (status = 'revoked' and revoked_at is not null and revocation_reason_code is not null
        and forge_private.is_identifier(revocation_reason_code))
  ),
  check (expires_at is null or expires_at > issued_at),
  unique (authority_id, authority_scope_digest)
);

create table forge.adr001_trusted_runtime_tuples (
  id bigint generated always as identity unique,
  tuple_id uuid primary key default extensions.gen_random_uuid(),
  validator_authority_id text not null,
  tuple_digest text not null unique check (forge_private.is_sha256_digest(tuple_digest)),
  start_payload jsonb not null check (
    jsonb_typeof(start_payload) = 'object'
    and not forge_private.adr001_has_forbidden_text_key(start_payload)
    and octet_length(convert_to(start_payload::text, 'UTF8')) <= 24576
  ),
  validator_scope_digest text generated always as (
    forge_private.adr001_validator_scope_digest(start_payload)
  ) stored,
  status text not null default 'active' check (status in ('active', 'revoked')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason_code text,
  check (
    (status = 'active' and revoked_at is null and revocation_reason_code is null)
    or (status = 'revoked' and revoked_at is not null and revocation_reason_code is not null
        and forge_private.is_identifier(revocation_reason_code))
  ),
  check (expires_at is null or expires_at > issued_at),
  check (tuple_digest = forge_private.sha256_jsonb(start_payload)),
  unique (tuple_id, validator_authority_id),
  foreign key (validator_authority_id, validator_scope_digest)
    references forge.adr001_server_validator_authorities (authority_id, authority_scope_digest)
    on delete restrict
);

create table forge.adr001_run_authority_bindings (
  id bigint generated always as identity unique,
  aggregate_id text primary key check (forge_private.is_event_reference(aggregate_id)),
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  validator_authority_id text not null references forge.adr001_server_validator_authorities (authority_id) on delete restrict,
  trusted_runtime_tuple_id uuid not null references forge.adr001_trusted_runtime_tuples (tuple_id) on delete restrict,
  started_event_id uuid not null unique references forge.adr001_event_journal (event_id) on delete restrict,
  bound_at timestamptz not null default now()
);

create table forge.adr001_proof_challenges (
  id bigint generated always as identity unique,
  challenge_id uuid primary key default extensions.gen_random_uuid(),
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  aggregate_id text not null references forge.adr001_run_authority_bindings (aggregate_id) on delete restrict,
  trusted_runtime_tuple_id uuid not null,
  issued_by_authority_id text not null,
  nonce_digest text not null unique check (forge_private.is_sha256_digest(nonce_digest)),
  status text not null default 'issued' check (status in ('issued', 'consumed', 'revoked', 'expired')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_event_id uuid unique references forge.adr001_event_journal (event_id) on delete restrict,
  terminal_at timestamptz,
  terminal_reason_code text,
  check (expires_at > issued_at),
  check (
    (status = 'issued' and consumed_event_id is null and terminal_at is null and terminal_reason_code is null)
    or (status = 'consumed' and consumed_event_id is not null and terminal_at is not null and terminal_reason_code is null)
    or (status in ('revoked', 'expired') and consumed_event_id is null and terminal_at is not null
        and terminal_reason_code is not null and forge_private.is_identifier(terminal_reason_code))
  ),
  foreign key (trusted_runtime_tuple_id, issued_by_authority_id)
    references forge.adr001_trusted_runtime_tuples (tuple_id, validator_authority_id)
    on delete restrict
);

create table forge.adr001_event_projection_receipts (
  id bigint generated always as identity unique,
  canonical_event_id uuid primary key references forge.adr001_event_journal (event_id) on delete restrict,
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  validator_authority_id text not null references forge.adr001_server_validator_authorities (authority_id) on delete restrict,
  trusted_runtime_tuple_id uuid not null references forge.adr001_trusted_runtime_tuples (tuple_id) on delete restrict,
  learner_submission_id uuid references forge.adr001_untrusted_learner_submissions (submission_id) on delete restrict,
  projection_kind text not null check (projection_kind in ('run_start', 'attempt', 'proof', 'evidence', 'completion')),
  projected_at timestamptz not null default now(),
  unique (learner_submission_id, projection_kind)
);

create index adr001_event_projection_receipts_submission_idx
  on forge.adr001_event_projection_receipts (learner_submission_id)
  where learner_submission_id is not null;

create index adr001_proof_challenges_owner_aggregate_idx
  on forge.adr001_proof_challenges (owner_user_id, aggregate_id, status, expires_at);

-- Every identity foreign key has a matching lookup index; indexes on primary
-- keys and unique constraints are provided by PostgreSQL automatically.
create index adr001_trusted_runtime_tuples_validator_authority_idx
  on forge.adr001_trusted_runtime_tuples (validator_authority_id, validator_scope_digest);
create index adr001_run_authority_bindings_owner_idx
  on forge.adr001_run_authority_bindings (owner_user_id);
create index adr001_run_authority_bindings_validator_authority_idx
  on forge.adr001_run_authority_bindings (validator_authority_id);
create index adr001_run_authority_bindings_trusted_tuple_idx
  on forge.adr001_run_authority_bindings (trusted_runtime_tuple_id);
create index adr001_proof_challenges_aggregate_idx
  on forge.adr001_proof_challenges (aggregate_id);
create index adr001_proof_challenges_trusted_tuple_idx
  on forge.adr001_proof_challenges (trusted_runtime_tuple_id, issued_by_authority_id);
create index adr001_proof_challenges_issued_by_authority_idx
  on forge.adr001_proof_challenges (issued_by_authority_id);
create index adr001_event_projection_receipts_owner_idx
  on forge.adr001_event_projection_receipts (owner_user_id);
create index adr001_event_projection_receipts_validator_authority_idx
  on forge.adr001_event_projection_receipts (validator_authority_id);
create index adr001_event_projection_receipts_trusted_tuple_idx
  on forge.adr001_event_projection_receipts (trusted_runtime_tuple_id);

-- Historical v2 browser-authored rows have no projection receipt because they
-- predate this authority boundary.  They remain immutable operator-audit
-- history, but must never be returned through an owner-facing authoritative
-- read.  This function exposes only exact journal/receipt/run/tuple/authority
-- joins.  Revocation or expiry after projection remains visible as current
-- state; it does not rewrite the immutable fact that the receipt was created
-- atomically with the projection.
create or replace function forge.read_adr001_v2_authoritative_events()
returns table (
  event_id uuid,
  event_type text,
  aggregate_id text,
  aggregate_version bigint,
  event_document jsonb,
  projection_kind text,
  projected_at timestamptz,
  validator_authority_id text,
  trusted_runtime_tuple_id uuid,
  current_authority_status text,
  current_authority_expires_at timestamptz,
  current_tuple_status text,
  current_tuple_expires_at timestamptz,
  authority_receipt_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    journal.event_id,
    journal.event_type,
    journal.aggregate_id,
    journal.aggregate_version,
    journal.event_document,
    receipt.projection_kind,
    receipt.projected_at,
    receipt.validator_authority_id,
    receipt.trusted_runtime_tuple_id,
    authority.status,
    authority.expires_at,
    runtime_tuple.status,
    runtime_tuple.expires_at,
    true
  from forge.adr001_event_journal as journal
  join forge.adr001_event_projection_receipts as receipt
    on receipt.canonical_event_id = journal.event_id
   and receipt.owner_user_id = journal.owner_user_id
  join forge.adr001_run_authority_bindings as run_binding
    on run_binding.aggregate_id = journal.aggregate_id
   and run_binding.owner_user_id = journal.owner_user_id
   and run_binding.validator_authority_id = receipt.validator_authority_id
   and run_binding.trusted_runtime_tuple_id = receipt.trusted_runtime_tuple_id
  join forge.adr001_trusted_runtime_tuples as runtime_tuple
    on runtime_tuple.tuple_id = receipt.trusted_runtime_tuple_id
   and runtime_tuple.validator_authority_id = receipt.validator_authority_id
  join forge.adr001_server_validator_authorities as authority
    on authority.authority_id = receipt.validator_authority_id
   and authority.authority_scope_digest = runtime_tuple.validator_scope_digest
  where journal.owner_user_id = (select auth.uid())
    and (select forge_private.is_active_adult_owner(auth.uid()))
    and (
      (
        journal.event_type = 'world_run.started'
        and receipt.projection_kind = 'run_start'
        and receipt.learner_submission_id is null
        and run_binding.started_event_id = journal.event_id
        and journal.payload = runtime_tuple.start_payload
      )
      or (
        journal.event_type = 'attempt.committed'
        and receipt.projection_kind = 'attempt'
        and receipt.learner_submission_id is not null
      )
      or (
        journal.event_type = 'proof.submitted'
        and receipt.projection_kind = 'proof'
        and receipt.learner_submission_id is not null
      )
      or (
        journal.event_type = 'evidence.recorded'
        and receipt.projection_kind = 'evidence'
        and receipt.learner_submission_id is not null
      )
      or (
        journal.event_type = 'world_run.completed'
        and receipt.projection_kind = 'completion'
        and receipt.learner_submission_id is not null
      )
    )
  order by journal.aggregate_id, journal.aggregate_version, journal.id;
$$;

create or replace function forge_private.enforce_adr001_monotonic_authority_revocation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'active'
     and new.status = 'revoked'
     and new.authority_id = old.authority_id
     and new.authority_kind = old.authority_kind
     and new.authority_scope_digest = old.authority_scope_digest
     and new.issued_at = old.issued_at
     and new.expires_at is not distinct from old.expires_at
     and new.revoked_at is not null
     and new.revocation_reason_code is not null then
    return new;
  end if;
  raise exception 'ADR-001 validator authority permits only monotonic active-to-revoked transition' using errcode = '55000';
end;
$$;

create or replace function forge_private.enforce_adr001_monotonic_tuple_revocation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'active'
     and new.status = 'revoked'
     and new.tuple_id = old.tuple_id
     and new.validator_authority_id = old.validator_authority_id
     and new.tuple_digest = old.tuple_digest
     and new.start_payload = old.start_payload
     and new.issued_at = old.issued_at
     and new.expires_at is not distinct from old.expires_at
     and new.revoked_at is not null
     and new.revocation_reason_code is not null then
    return new;
  end if;
  raise exception 'ADR-001 trusted runtime tuple permits only monotonic active-to-revoked transition' using errcode = '55000';
end;
$$;

create or replace function forge_private.enforce_adr001_proof_challenge_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'issued'
     and new.status in ('consumed', 'revoked', 'expired')
     and new.challenge_id = old.challenge_id
     and new.owner_user_id = old.owner_user_id
     and new.aggregate_id = old.aggregate_id
     and new.trusted_runtime_tuple_id = old.trusted_runtime_tuple_id
     and new.issued_by_authority_id = old.issued_by_authority_id
     and new.nonce_digest = old.nonce_digest
     and new.issued_at = old.issued_at
     and new.expires_at = old.expires_at
     and new.terminal_at is not null then
    return new;
  end if;
  raise exception 'ADR-001 proof challenge permits only one terminal transition' using errcode = '55000';
end;
$$;

create or replace function forge_private.reject_adr001_authority_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ADR-001 authority and projection records are immutable' using errcode = '55000';
end;
$$;

create trigger adr001_server_validator_authorities_monotonic_revocation
before update on forge.adr001_server_validator_authorities
for each row execute function forge_private.enforce_adr001_monotonic_authority_revocation();
create trigger adr001_server_validator_authorities_reject_delete
before delete or truncate on forge.adr001_server_validator_authorities
for each statement execute function forge_private.reject_adr001_authority_ledger_mutation();

create trigger adr001_trusted_runtime_tuples_monotonic_revocation
before update on forge.adr001_trusted_runtime_tuples
for each row execute function forge_private.enforce_adr001_monotonic_tuple_revocation();
create trigger adr001_trusted_runtime_tuples_reject_delete
before delete or truncate on forge.adr001_trusted_runtime_tuples
for each statement execute function forge_private.reject_adr001_authority_ledger_mutation();

create trigger adr001_run_authority_bindings_append_only
before update or delete on forge.adr001_run_authority_bindings
for each row execute function forge_private.reject_adr001_authority_ledger_mutation();
create trigger adr001_run_authority_bindings_reject_truncate
before truncate on forge.adr001_run_authority_bindings
for each statement execute function forge_private.reject_adr001_authority_ledger_mutation();

create trigger adr001_proof_challenges_one_terminal_transition
before update on forge.adr001_proof_challenges
for each row execute function forge_private.enforce_adr001_proof_challenge_transition();
create trigger adr001_proof_challenges_reject_delete
before delete or truncate on forge.adr001_proof_challenges
for each statement execute function forge_private.reject_adr001_authority_ledger_mutation();

create trigger adr001_event_projection_receipts_append_only
before update or delete on forge.adr001_event_projection_receipts
for each row execute function forge_private.reject_adr001_authority_ledger_mutation();
create trigger adr001_event_projection_receipts_reject_truncate
before truncate on forge.adr001_event_projection_receipts
for each statement execute function forge_private.reject_adr001_authority_ledger_mutation();

-- This is the only canonical v2 writer left after the correction.  It is not
-- callable by authenticated clients.  The historical v2 appender remains an
-- implementation primitive for replay compatibility, but its execute grants
-- are removed below and it is reached only inside this security-definer gate.
create or replace function forge.append_adr001_v2_validated_event(
  p_owner_user_id uuid,
  p_validator_authority_id text,
  p_trusted_runtime_tuple_id uuid,
  p_learner_submission_id uuid,
  p_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authority forge.adr001_server_validator_authorities%rowtype;
  v_tuple forge.adr001_trusted_runtime_tuples%rowtype;
  v_binding forge.adr001_run_authority_bindings%rowtype;
  v_submission forge.adr001_untrusted_learner_submissions%rowtype;
  v_challenge forge.adr001_proof_challenges%rowtype;
  v_existing_receipt forge.adr001_event_projection_receipts%rowtype;
  v_event_type text;
  v_aggregate_id text;
  v_event_id uuid;
  v_actor_id text;
  v_legacy_event jsonb;
  v_result jsonb;
  v_projection_kind text;
  v_nonce_consumed_now boolean := false;
  v_prior_request_role text := current_setting('request.jwt.claim.role', true);
  v_prior_request_sub text := current_setting('request.jwt.claim.sub', true);
begin
  -- EXECUTE privilege is the primary caller boundary.  This redundant check
  -- catches accidental server-side use under the wrong request context.
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'ADR-001 canonical projection requires service-role server authority' using errcode = '42501';
  end if;
  if not forge_private.is_active_adult_owner(p_owner_user_id) then
    raise exception 'ADR-001 canonical projection requires an active adult owner' using errcode = '42501';
  end if;

  perform forge_private.assert_adr001_event_shape(p_event);
  if p_event ->> 'integrity_hash' <> forge_private.sha256_jsonb(p_event - 'integrity_hash') then
    raise exception 'ADR-001 projection envelope integrity hash does not match' using errcode = '22000';
  end if;

  select * into v_authority
  from forge.adr001_server_validator_authorities
  where authority_id = p_validator_authority_id
    and status = 'active'
    and (expires_at is null or expires_at > now())
  for update;
  if not found then
    raise exception 'ADR-001 projection requires an active, unexpired server validator authority' using errcode = '42501';
  end if;

  select * into v_tuple
  from forge.adr001_trusted_runtime_tuples
  where tuple_id = p_trusted_runtime_tuple_id
    and validator_authority_id = p_validator_authority_id
    and status = 'active'
    and (expires_at is null or expires_at > now())
  for update;
  if not found then
    raise exception 'ADR-001 projection requires an active tuple bound to the server validator authority' using errcode = '42501';
  end if;
  if v_tuple.tuple_digest <> forge_private.sha256_jsonb(v_tuple.start_payload)
     or v_tuple.validator_scope_digest <> forge_private.adr001_validator_scope_digest(v_tuple.start_payload)
     or v_authority.authority_scope_digest <> v_tuple.validator_scope_digest then
    raise exception 'ADR-001 trusted runtime tuple digest or validator authority scope is invalid' using errcode = '23514';
  end if;

  v_event_type := p_event ->> 'event_type';
  v_aggregate_id := p_event #>> '{aggregate,id}';
  v_event_id := (p_event ->> 'event_id')::uuid;
  if v_event_type not in ('world_run.started', 'attempt.committed', 'proof.submitted', 'evidence.recorded', 'world_run.completed') then
    raise exception 'ADR-001 authority correction permits only start, attempt, proof, evidence, and completion projection' using errcode = '42501';
  end if;

  if v_event_type = 'world_run.started' then
    if p_learner_submission_id is not null
       or p_event -> 'payload' is distinct from v_tuple.start_payload
       or p_event #>> '{aggregate,version}' <> '1'
       or p_event -> 'causation_id' <> 'null'::jsonb
       or p_event #>> '{actor,type}' <> 'learner'
       or p_event #>> '{actor,id}' !~ '^device\.[a-f0-9]{24}$' then
      raise exception 'ADR-001 run start must be server-created from the exact trusted tuple' using errcode = '23514';
    end if;
    v_actor_id := p_event #>> '{actor,id}';
    v_projection_kind := 'run_start';
  else
    select * into v_binding
    from forge.adr001_run_authority_bindings
    where aggregate_id = v_aggregate_id
      and owner_user_id = p_owner_user_id
    for update;
    if not found
       or v_binding.validator_authority_id <> p_validator_authority_id
       or v_binding.trusted_runtime_tuple_id <> p_trusted_runtime_tuple_id then
      raise exception 'ADR-001 run has no matching immutable server authority binding' using errcode = '42501';
    end if;
    select state_data ->> 'actor_id' into v_actor_id
    from forge.adr001_event_aggregate_heads
    where aggregate_id = v_aggregate_id
      and owner_user_id = p_owner_user_id
    for share;
    if v_actor_id is null
       or (
         v_event_type in ('attempt.committed', 'proof.submitted', 'world_run.completed')
         and p_event #>> '{actor,id}' <> v_actor_id
       ) then
      raise exception 'ADR-001 projection actor must match the server-bound learner runtime actor' using errcode = '42501';
    end if;
  end if;

  if v_event_type in ('attempt.committed', 'proof.submitted', 'evidence.recorded', 'world_run.completed') then
    select * into v_submission
    from forge.adr001_untrusted_learner_submissions
    where submission_id = p_learner_submission_id
      and owner_user_id = p_owner_user_id
      and aggregate_id = v_aggregate_id
    for update;
    if not found then
      raise exception 'ADR-001 projection requires a matching learner submission observation' using errcode = '42501';
    end if;
  end if;

  case v_event_type
    when 'world_run.started' then
      -- Exact tuple equality and the no-submission rule were checked above.
      null;

    when 'attempt.committed' then
      if v_submission.submission_kind <> 'attempt'
         or p_event -> 'payload' is distinct from v_submission.submission_document then
        raise exception 'ADR-001 attempt projection must exactly preserve the untrusted attempt observation' using errcode = '23514';
      end if;
      v_projection_kind := 'attempt';

    when 'proof.submitted' then
      if v_submission.submission_kind <> 'proof'
         or p_event #> '{payload,selection_ids}' is distinct from v_submission.submission_document -> 'selection_ids'
         or p_event #> '{payload,response_digest}' is distinct from v_submission.submission_document -> 'response_digest'
         or p_event #> '{payload,explicit_uncertainty}' is distinct from v_submission.submission_document -> 'explicit_uncertainty'
         or p_event #>> '{payload,assistance_access}' <> 'removed' then
        raise exception 'ADR-001 proof projection must preserve only learner proof observation fields' using errcode = '23514';
      end if;
      select * into v_challenge
      from forge.adr001_proof_challenges
      where owner_user_id = p_owner_user_id
        and aggregate_id = v_aggregate_id
        and trusted_runtime_tuple_id = p_trusted_runtime_tuple_id
        and issued_by_authority_id = p_validator_authority_id
        and nonce_digest = p_event #>> '{payload,proof_nonce_digest}'
      for update;
      if not found
         or v_challenge.expires_at <= now()
         or (v_challenge.status = 'consumed' and v_challenge.consumed_event_id <> v_event_id)
         or v_challenge.status not in ('issued', 'consumed') then
        raise exception 'ADR-001 proof nonce must be an unexpired server-issued one-time challenge' using errcode = '42501';
      end if;
      v_nonce_consumed_now := v_challenge.status = 'issued';
      v_projection_kind := 'proof';

    when 'evidence.recorded' then
      if v_submission.submission_kind <> 'proof'
         or not exists (
           select 1
           from forge.adr001_event_projection_receipts as receipt
           join forge.adr001_event_journal as proof_event on proof_event.event_id = receipt.canonical_event_id
           where receipt.learner_submission_id = v_submission.submission_id
             and receipt.validator_authority_id = p_validator_authority_id
             and receipt.trusted_runtime_tuple_id = p_trusted_runtime_tuple_id
             and receipt.projection_kind = 'proof'
             and proof_event.event_type = 'proof.submitted'
         ) then
        raise exception 'ADR-001 evidence projection requires a prior server-projected proof observation' using errcode = '42501';
      end if;
      if (v_authority.authority_kind = 'server_validator' and p_event #>> '{actor,type}' <> 'validator')
         or (v_authority.authority_kind = 'human_assessor' and p_event #>> '{actor,type}' <> 'human')
         or p_event #>> '{actor,id}' <> p_validator_authority_id then
        raise exception 'ADR-001 evidence disposition must be authored by the bound server validator or human assessor' using errcode = '42501';
      end if;
      v_projection_kind := 'evidence';

    when 'world_run.completed' then
      if v_submission.submission_kind <> 'proof'
         or not exists (
           select 1 from forge.adr001_event_projection_receipts
           where learner_submission_id = v_submission.submission_id
             and validator_authority_id = p_validator_authority_id
             and trusted_runtime_tuple_id = p_trusted_runtime_tuple_id
             and projection_kind = 'evidence'
         ) then
        raise exception 'ADR-001 completion requires a server-projected evidence event' using errcode = '42501';
      end if;
      v_projection_kind := 'completion';
  end case;

  -- The historical v2 envelope records the learner runtime actor.  The new,
  -- distinct validation authority is captured immutably in the projection
  -- receipt below.  Canonical identity is resealed after this normalization.
  v_legacy_event := (p_event - 'integrity_hash') || jsonb_build_object(
    'actor', jsonb_build_object('type', 'learner', 'id', v_actor_id)
  );
  v_legacy_event := v_legacy_event || jsonb_build_object(
    'integrity_hash', forge_private.sha256_jsonb(v_legacy_event)
  );

  -- The old appender remains a transaction primitive only.  It is granted to
  -- nobody after this migration; this scoped setting exists only within the
  -- security-definer call so its existing owner/sequence invariants still run.
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_owner_user_id::text, true);
  v_result := forge.append_adr001_v2_event(v_legacy_event);
  perform set_config('request.jwt.claim.role', coalesce(v_prior_request_role, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(v_prior_request_sub, ''), true);

  if v_result ->> 'disposition' = 'duplicate' then
    select * into v_existing_receipt
    from forge.adr001_event_projection_receipts
    where canonical_event_id = v_event_id;
    if not found
       or v_existing_receipt.owner_user_id <> p_owner_user_id
       or v_existing_receipt.validator_authority_id <> p_validator_authority_id
       or v_existing_receipt.trusted_runtime_tuple_id <> p_trusted_runtime_tuple_id
       or v_existing_receipt.learner_submission_id is distinct from p_learner_submission_id
       or v_existing_receipt.projection_kind <> v_projection_kind then
      raise exception 'ADR-001 duplicate canonical event lacks a matching authority receipt' using errcode = '23505';
    end if;
    return v_result;
  end if;

  if v_event_type = 'world_run.started' then
    insert into forge.adr001_run_authority_bindings (
      aggregate_id, owner_user_id, validator_authority_id, trusted_runtime_tuple_id, started_event_id
    ) values (
      v_aggregate_id, p_owner_user_id, p_validator_authority_id, p_trusted_runtime_tuple_id, v_event_id
    );
  end if;

  if v_nonce_consumed_now then
    update forge.adr001_proof_challenges
    set status = 'consumed', consumed_event_id = v_event_id, terminal_at = now()
    where challenge_id = v_challenge.challenge_id
      and status = 'issued';
    if not found then
      raise exception 'ADR-001 proof nonce was consumed concurrently' using errcode = '40001';
    end if;
  end if;

  insert into forge.adr001_event_projection_receipts (
    canonical_event_id, owner_user_id, validator_authority_id, trusted_runtime_tuple_id,
    learner_submission_id, projection_kind
  ) values (
    v_event_id, p_owner_user_id, p_validator_authority_id, p_trusted_runtime_tuple_id,
    p_learner_submission_id, v_projection_kind
  );

  return v_result;
end;
$$;

alter table forge.adr001_untrusted_learner_submissions enable row level security;
alter table forge.adr001_untrusted_learner_submissions force row level security;
alter table forge.adr001_server_validator_authorities enable row level security;
alter table forge.adr001_server_validator_authorities force row level security;
alter table forge.adr001_trusted_runtime_tuples enable row level security;
alter table forge.adr001_trusted_runtime_tuples force row level security;
alter table forge.adr001_run_authority_bindings enable row level security;
alter table forge.adr001_run_authority_bindings force row level security;
alter table forge.adr001_proof_challenges enable row level security;
alter table forge.adr001_proof_challenges force row level security;
alter table forge.adr001_event_projection_receipts enable row level security;
alter table forge.adr001_event_projection_receipts force row level security;

create policy adr001_untrusted_learner_submissions_select_owner
on forge.adr001_untrusted_learner_submissions
for select to authenticated
using (owner_user_id = (select auth.uid()));

create policy adr001_untrusted_learner_submissions_insert_owner
on forge.adr001_untrusted_learner_submissions
for insert to authenticated
with check (
  owner_user_id = (select auth.uid())
  and forge_private.is_active_adult_owner(owner_user_id)
);

-- The pre-correction owner policies made raw browser-authored rows look like
-- canonical evidence.  Preserve the rows for operator audit, but remove every
-- authenticated raw journal/head/outbox read path.  Owner-facing reads must go
-- through the receipt-required function above.
drop policy if exists adr001_event_aggregate_heads_select_owner
  on forge.adr001_event_aggregate_heads;
drop policy if exists adr001_event_journal_select_owner
  on forge.adr001_event_journal;
drop policy if exists adr001_event_outbox_select_owner
  on forge.adr001_event_outbox;

-- No learner policy exists for authorities, tuples, run bindings, challenges,
-- receipts, heads, journals, or outboxes.  Do not add one as a convenience
-- read: it would turn an internal authority boundary into a client API.
revoke all on table forge.adr001_untrusted_learner_submissions,
  forge.adr001_server_validator_authorities,
  forge.adr001_trusted_runtime_tuples,
  forge.adr001_run_authority_bindings,
  forge.adr001_proof_challenges,
  forge.adr001_event_projection_receipts
from public, anon, authenticated;
revoke all on table forge.adr001_event_aggregate_heads,
  forge.adr001_event_journal,
  forge.adr001_event_outbox
from public, anon, authenticated;
revoke all on sequence forge.adr001_untrusted_learner_submissions_id_seq
from public, anon, authenticated;
grant select, insert on forge.adr001_untrusted_learner_submissions to authenticated;
grant select on forge.adr001_untrusted_learner_submissions,
  forge.adr001_server_validator_authorities,
  forge.adr001_trusted_runtime_tuples,
  forge.adr001_run_authority_bindings,
  forge.adr001_proof_challenges,
  forge.adr001_event_projection_receipts,
  forge.adr001_event_aggregate_heads,
  forge.adr001_event_journal,
  forge.adr001_event_outbox
to service_role;

-- These immutable predicates are used by the learner inbox CHECK constraints.
-- They expose no rows or side effects; without EXECUTE, PostgreSQL rejects a
-- valid constrained insert before RLS/trigger authority can make the decision.
grant execute on function forge_private.is_event_reference(text),
  forge_private.adr001_has_forbidden_text_key(jsonb)
to authenticated;

revoke all on function forge.append_adr001_v2_event(jsonb)
from public, anon, authenticated, service_role;
revoke all on function forge.append_adr001_v2_validated_event(uuid, text, uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function forge.append_adr001_v2_validated_event(uuid, text, uuid, uuid, jsonb)
to service_role;
revoke all on function forge.read_adr001_v2_authoritative_events()
from public, anon, authenticated, service_role;
grant execute on function forge.read_adr001_v2_authoritative_events()
to authenticated;

revoke all on function forge_private.assert_adr001_untrusted_submission_shape(text, jsonb),
  forge_private.adr001_validator_scope_digest(jsonb),
  forge_private.enforce_adr001_untrusted_learner_submission(),
  forge_private.reject_adr001_untrusted_learner_submission_mutation(),
  forge_private.enforce_adr001_monotonic_authority_revocation(),
  forge_private.enforce_adr001_monotonic_tuple_revocation(),
  forge_private.enforce_adr001_proof_challenge_transition(),
  forge_private.reject_adr001_authority_ledger_mutation()
from public, anon, authenticated, service_role;

comment on table forge.adr001_untrusted_learner_submissions is
  'Learner-owned, append-only observations. Never canonical evidence or a validator decision.';
comment on table forge.adr001_event_projection_receipts is
  'Immutable server validator and trusted tuple receipt for every v2 canonical projection after authority correction.';
comment on function forge.read_adr001_v2_authoritative_events() is
  'Owner-facing authoritative v2 history. Returns only exact canonical event, immutable projection receipt, run binding, trusted tuple, and validator authority joins; pre-correction raw browser events are excluded.';
comment on table forge.adr001_server_validator_authorities is
  'Installed or revoked only by a separately authorized project operator/database owner; service_role may project against, but not create or revoke, an authority.';
comment on table forge.adr001_trusted_runtime_tuples is
  'Installed or revoked only by a separately authorized project operator/database owner; service_role may project against, but not create or revoke, a tuple.';
comment on table forge.adr001_proof_challenges is
  'Issued or terminally revoked only by a separately authorized project operator/database owner until a distinct issuance service is accepted.';
comment on function forge.append_adr001_v2_validated_event(uuid, text, uuid, uuid, jsonb) is
  'Server-only v2 canonical projection. Requires an active validator authority, exact trusted runtime tuple, and bounded learner submission where applicable.';

commit;
