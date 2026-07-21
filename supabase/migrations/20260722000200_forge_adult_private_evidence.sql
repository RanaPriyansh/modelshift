-- Adult-only private evidence sync for the FORGE browser ledger.
--
-- This is intentionally separate from forge.evidence_events. The latter is the
-- canonical, server-authored evidence ledger; this table is a learner-owned,
-- deletable private copy of the bounded browser record.

begin;

-- Private evidence is a separate learner choice from using the learning
-- service. Preserve that choice in the append-only consent ledger.
alter table forge.consent_records
  drop constraint consent_records_purpose_key_check,
  add constraint consent_records_purpose_key_check
    check (purpose_key in (
      'learning_service', 'private_evidence_persistence', 'guardian_access',
      'research', 'sensitive_artifact_capture', 'model_improvement'
    ));

create or replace function forge_private.jsonb_has_exact_keys(
  p_value jsonb,
  p_keys text[]
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    pg_catalog.jsonb_typeof(p_value) = 'object'
    and coalesce(
      (
        select pg_catalog.array_agg(actual.key order by actual.key)
        from pg_catalog.jsonb_object_keys(p_value) as actual(key)
      ) = (
        select pg_catalog.array_agg(expected.key order by expected.key)
        from pg_catalog.unnest(p_keys) as expected(key)
      ),
      false
    )
$$;

create or replace function forge_private.is_adult_private_evidence_entry(
  p_entry jsonb,
  p_client_evidence_id text,
  p_recorded_at timestamptz
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  assistance_item jsonb;
  interval_item jsonb;
  return_schedule jsonb;
  sharing jsonb;
  completed_count integer;
  interval_count integer;
  current_interval integer;
  previous_interval integer := 0;
  expected_due_at timestamptz;
  schedule_base_at timestamptz;
begin
  if not forge_private.jsonb_has_exact_keys(
    p_entry,
    array['id', 'capabilityId', 'recordedAt', 'source', 'proof', 'assistance', 'sharing', 'returnSchedule']
  ) then
    return false;
  end if;

  if p_client_evidence_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
     or p_entry ->> 'id' <> p_client_evidence_id
     or p_entry ->> 'capabilityId' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
     or p_entry ->> 'recordedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
     or (p_entry ->> 'recordedAt')::timestamptz <> p_recorded_at then
    return false;
  end if;

  if not forge_private.jsonb_has_exact_keys(p_entry -> 'source', array['kind', 'refId'])
     or p_entry #>> '{source,kind}' not in ('authored_activity', 'return_challenge', 'learner_project')
     or p_entry #>> '{source,refId}' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' then
    return false;
  end if;

  if not forge_private.jsonb_has_exact_keys(
    p_entry -> 'proof',
    array['conditionId', 'mode', 'assistanceAccess', 'outcome']
  )
     or p_entry #>> '{proof,conditionId}' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
     or p_entry #>> '{proof,mode}' not in (
       'supported_practice', 'independent_transfer', 'return_proof', 'project_application'
     )
     or p_entry #>> '{proof,assistanceAccess}' not in ('available', 'removed')
     or p_entry #>> '{proof,outcome}' not in ('practice_completed', 'proved', 'not_proved', 'open_question') then
    return false;
  end if;

  -- Proof may follow recorded help, but the protected proof attempt itself must
  -- have every instructional assistance surface removed.
  if p_entry #>> '{proof,mode}' <> 'supported_practice'
     and p_entry #>> '{proof,assistanceAccess}' <> 'removed' then
    return false;
  end if;

  if (p_entry #>> '{proof,outcome}' = 'practice_completed')
     <> (p_entry #>> '{proof,mode}' = 'supported_practice') then
    return false;
  end if;

  if (p_entry #>> '{source,kind}' = 'learner_project')
     <> (p_entry #>> '{proof,mode}' = 'project_application') then
    return false;
  end if;

  if (p_entry #>> '{source,kind}' = 'return_challenge')
     <> (p_entry #>> '{proof,mode}' = 'return_proof') then
    return false;
  end if;

  if pg_catalog.jsonb_typeof(p_entry -> 'assistance') <> 'array'
     or pg_catalog.jsonb_array_length(p_entry -> 'assistance') > 8 then
    return false;
  end if;

  for assistance_item in
    select value from pg_catalog.jsonb_array_elements(p_entry -> 'assistance')
  loop
    if not forge_private.jsonb_has_exact_keys(assistance_item, array['kind', 'sourceId'])
       or assistance_item ->> 'kind' not in (
         'authored_hint', 'authored_contrast', 'authored_principle', 'model_interpretation'
       )
       or assistance_item ->> 'sourceId' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' then
      return false;
    end if;
  end loop;

  sharing := p_entry -> 'sharing';
  if sharing ->> 'status' = 'private' then
    if not forge_private.jsonb_has_exact_keys(sharing, array['status', 'updatedAt']) then
      return false;
    end if;
  elsif sharing ->> 'status' = 'shared_by_learner' then
    if not forge_private.jsonb_has_exact_keys(sharing, array['status', 'scope', 'updatedAt'])
       or sharing ->> 'scope' not in ('educator', 'project_collaborators') then
      return false;
    end if;
  else
    return false;
  end if;

  if sharing ->> 'updatedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
     or (sharing ->> 'updatedAt')::timestamptz < p_recorded_at then
    return false;
  end if;

  return_schedule := p_entry -> 'returnSchedule';
  if pg_catalog.jsonb_typeof(return_schedule) = 'null' then
    return true;
  end if;

  if not forge_private.jsonb_has_exact_keys(
    return_schedule,
    array['anchorAt', 'intervalsDays', 'completedCount', 'nextDueAt', 'lastCompletedAt']
  )
     or p_entry #>> '{proof,outcome}' <> 'proved'
     or p_entry #>> '{proof,assistanceAccess}' <> 'removed'
     or return_schedule ->> 'anchorAt' <> p_entry ->> 'recordedAt'
     or return_schedule ->> 'anchorAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
     or pg_catalog.jsonb_typeof(return_schedule -> 'intervalsDays') <> 'array'
     or pg_catalog.jsonb_array_length(return_schedule -> 'intervalsDays') not between 1 and 16
     or pg_catalog.jsonb_typeof(return_schedule -> 'completedCount') <> 'number'
     or (return_schedule ->> 'completedCount') !~ '^\d+$' then
    return false;
  end if;

  completed_count := (return_schedule ->> 'completedCount')::integer;
  interval_count := pg_catalog.jsonb_array_length(return_schedule -> 'intervalsDays');
  if completed_count not between 0 and interval_count then
    return false;
  end if;

  for interval_item in
    select value from pg_catalog.jsonb_array_elements(return_schedule -> 'intervalsDays')
  loop
    if pg_catalog.jsonb_typeof(interval_item) <> 'number'
       or (interval_item #>> '{}') !~ '^\d+$' then
      return false;
    end if;
    current_interval := (interval_item #>> '{}')::integer;
    if current_interval not between 1 and 3650 or current_interval <= previous_interval then
      return false;
    end if;
    previous_interval := current_interval;
  end loop;

  if (completed_count = 0) <> ((return_schedule ->> 'lastCompletedAt') is null) then
    return false;
  end if;

  if (return_schedule ->> 'lastCompletedAt') is not null
     and return_schedule ->> 'lastCompletedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' then
    return false;
  end if;

  if (return_schedule ->> 'lastCompletedAt') is not null
     and (return_schedule ->> 'lastCompletedAt')::timestamptz
       < (return_schedule ->> 'anchorAt')::timestamptz then
    return false;
  end if;

  if completed_count = interval_count then
    return (return_schedule ->> 'nextDueAt') is null;
  end if;

  if (return_schedule ->> 'nextDueAt') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' then
    return false;
  end if;

  schedule_base_at := case
    when completed_count = 0 then (return_schedule ->> 'anchorAt')::timestamptz
    else (return_schedule ->> 'lastCompletedAt')::timestamptz
  end;
  expected_due_at := schedule_base_at
    + ((return_schedule -> 'intervalsDays' ->> completed_count)::integer * interval '1 day');

  if (return_schedule ->> 'nextDueAt')::timestamptz <> expected_due_at then
    return false;
  end if;

  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function forge_private.jsonb_has_exact_keys(jsonb, text[]) from public, anon;
revoke all on function forge_private.is_adult_private_evidence_entry(jsonb, text, timestamptz) from public, anon;
grant execute on function forge_private.jsonb_has_exact_keys(jsonb, text[]) to authenticated, service_role;
grant execute on function forge_private.is_adult_private_evidence_entry(jsonb, text, timestamptz)
  to authenticated, service_role;

create table forge.adult_private_evidence_entries (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  client_evidence_id text not null,
  recorded_at timestamptz not null,
  entry jsonb not null,
  created_at timestamptz not null default now(),
  unique (learner_user_id, client_evidence_id),
  check (forge_private.is_adult_private_evidence_entry(entry, client_evidence_id, recorded_at))
);

comment on table forge.adult_private_evidence_entries is
  'Adult-only, learner-owned private sync of the bounded browser ledger; not canonical assessed evidence.';
comment on column forge.adult_private_evidence_entries.entry is
  'Strict structured proof metadata only. Raw explanations, chat, identity, confidence, and trait inference are rejected.';

create index adult_private_evidence_learner_recorded_idx
  on forge.adult_private_evidence_entries (learner_user_id, recorded_at desc);

alter table forge.adult_private_evidence_entries enable row level security;
alter table forge.adult_private_evidence_entries force row level security;

create policy adult_private_evidence_select_own_adult
on forge.adult_private_evidence_entries
for select
to authenticated
using (
  learner_user_id = (select auth.uid())
  and exists (
    select 1
    from forge.learner_profiles as learner
    where learner.user_id = (select auth.uid())
      and learner.age_band = 'adult'
      and learner.onboarding_status = 'active'
  )
);

create policy adult_private_evidence_insert_own_adult
on forge.adult_private_evidence_entries
for insert
to authenticated
with check (
  learner_user_id = (select auth.uid())
  and exists (
    select 1
    from forge.learner_profiles as learner
    where learner.user_id = (select auth.uid())
      and learner.age_band = 'adult'
      and learner.onboarding_status = 'active'
  )
);

create policy adult_private_evidence_delete_own_adult
on forge.adult_private_evidence_entries
for delete
to authenticated
using (
  learner_user_id = (select auth.uid())
  and exists (
    select 1
    from forge.learner_profiles as learner
    where learner.user_id = (select auth.uid())
      and learner.age_band = 'adult'
      and learner.onboarding_status = 'active'
  )
);

-- Account activation is an explicit adult self-attestation flow. It never reads
-- mutable user_metadata for authorization and it will not convert an existing
-- minor profile into an adult profile.
create or replace function forge.activate_adult_account(
  p_adult_self_attested boolean,
  p_private_persistence_opt_in boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if p_adult_self_attested is not true or p_private_persistence_opt_in is not true then
    raise exception 'explicit adult and private persistence confirmations are required';
  end if;

  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  if coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'anonymous authentication cannot activate private evidence';
  end if;

  if not exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = current_user_id
      and auth_user.email_confirmed_at is not null
  ) then
    raise exception 'a confirmed email is required';
  end if;

  if exists (
    select 1
    from forge.learner_profiles as learner
    where learner.user_id = current_user_id
      and learner.age_band <> 'adult'
  ) then
    raise exception 'minor profiles cannot be converted by adult self-attestation';
  end if;

  insert into forge.profiles (user_id, display_name)
  values (current_user_id, 'FORGE learner')
  on conflict (user_id) do nothing;

  if exists (
    select 1 from forge.profiles as profile
    where profile.user_id = current_user_id
      and profile.account_status <> 'active'
  ) then
    raise exception 'account is not active';
  end if;

  insert into forge.learner_profiles (user_id, age_band, onboarding_status)
  values (current_user_id, 'adult', 'active')
  on conflict (user_id) do update
    set onboarding_status = 'active', updated_at = now()
    where forge.learner_profiles.age_band = 'adult';

  if not exists (
    select 1
    from forge.consent_records as consent
    where consent.learner_user_id = current_user_id
      and consent.purpose_key = 'private_evidence_persistence'
      and consent.decision = 'granted'
      and consent.effective_at <= now()
      and (consent.expires_at is null or consent.expires_at > now())
      and not exists (
        select 1
        from forge.consent_records as later
        where later.learner_user_id = consent.learner_user_id
          and later.purpose_key = consent.purpose_key
          and later.effective_at > consent.effective_at
      )
  ) then
    insert into forge.consent_records (
      learner_user_id,
      purpose_key,
      decision,
      actor_user_id,
      actor_capacity,
      policy_version
    ) values (
      current_user_id,
      'private_evidence_persistence',
      'granted',
      current_user_id,
      'learner',
      'adult-private-evidence@1'
    );
  end if;
end;
$$;

revoke all on function forge.activate_adult_account(boolean, boolean) from public, anon;
grant execute on function forge.activate_adult_account(boolean, boolean) to authenticated;

-- Age band and onboarding state become server-owned. Authenticated learners may
-- still maintain non-authority preferences on their own row.
revoke insert, update on forge.learner_profiles from authenticated;
grant update (learning_context, preferred_languages, access_needs)
  on forge.learner_profiles to authenticated;

revoke all on forge.adult_private_evidence_entries from public, anon, authenticated;
revoke all on sequence forge.adult_private_evidence_entries_id_seq from public, anon, authenticated;
grant select, insert, delete on forge.adult_private_evidence_entries to authenticated;
grant usage on sequence forge.adult_private_evidence_entries_id_seq to authenticated;
grant all on forge.adult_private_evidence_entries to service_role;
grant all on sequence forge.adult_private_evidence_entries_id_seq to service_role;

commit;
