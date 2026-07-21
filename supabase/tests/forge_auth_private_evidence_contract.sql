-- Run after all migrations with psql -v ON_ERROR_STOP=1.

begin;

do $$
begin
  if to_regclass('forge.adult_private_evidence_entries') is null then
    raise exception 'adult private evidence table is missing';
  end if;

  if not exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'forge'
      and relation.relname = 'adult_private_evidence_entries'
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) then
    raise exception 'adult private evidence does not force RLS';
  end if;

  if has_table_privilege('anon', 'forge.adult_private_evidence_entries', 'SELECT')
     or has_table_privilege('anon', 'forge.adult_private_evidence_entries', 'INSERT')
     or has_table_privilege('anon', 'forge.adult_private_evidence_entries', 'DELETE') then
    raise exception 'anonymous role can access adult private evidence';
  end if;

  if not has_table_privilege('authenticated', 'forge.adult_private_evidence_entries', 'SELECT')
     or not has_table_privilege('authenticated', 'forge.adult_private_evidence_entries', 'INSERT')
     or not has_table_privilege('authenticated', 'forge.adult_private_evidence_entries', 'DELETE')
     or has_table_privilege('authenticated', 'forge.adult_private_evidence_entries', 'UPDATE') then
    raise exception 'authenticated private evidence privileges are not least-privilege';
  end if;

  if has_column_privilege('authenticated', 'forge.learner_profiles', 'age_band', 'UPDATE')
     or has_table_privilege('authenticated', 'forge.learner_profiles', 'INSERT') then
    raise exception 'authenticated clients can author age authority';
  end if;

  if has_function_privilege('anon', 'forge.activate_adult_account(boolean,boolean)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'forge.activate_adult_account(boolean,boolean)', 'EXECUTE') then
    raise exception 'adult activation RPC grants are incorrect';
  end if;

  if not exists (
    select 1
    from pg_proc as function_record
    join pg_namespace as namespace on namespace.oid = function_record.pronamespace
    where namespace.nspname = 'forge'
      and function_record.proname = 'activate_adult_account'
      and function_record.prosecdef
      and function_record.proconfig @> array['search_path=""']::text[]
  ) then
    raise exception 'adult activation RPC is not hardened';
  end if;
end;
$$;

insert into auth.users (id, email, email_confirmed_at)
values
  ('11111111-1111-4111-8111-111111111111', 'adult@example.test', now()),
  ('22222222-2222-4222-8222-222222222222', 'minor@example.test', now());

insert into forge.profiles (user_id, display_name)
values ('22222222-2222-4222-8222-222222222222', 'Minor fixture');
insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values ('22222222-2222-4222-8222-222222222222', '16_17', 'active');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);

do $$
begin
  begin
    perform forge.activate_adult_account(false, true);
    raise exception 'adult activation accepted missing confirmation';
  exception when others then
    if sqlerrm <> 'explicit adult and private persistence confirmations are required' then
      raise;
    end if;
  end;
end;
$$;

select forge.activate_adult_account(true, true);

do $$
begin
  if not exists (
    select 1 from forge.learner_profiles
    where user_id = auth.uid() and age_band = 'adult' and onboarding_status = 'active'
  ) then
    raise exception 'adult activation did not create an active adult profile';
  end if;

  if not exists (
    select 1 from forge.consent_records
    where learner_user_id = auth.uid()
      and purpose_key = 'private_evidence_persistence'
      and decision = 'granted'
      and policy_version = 'adult-private-evidence@1'
  ) then
    raise exception 'adult activation did not record private persistence consent';
  end if;
end;
$$;

insert into forge.adult_private_evidence_entries (
  learner_user_id,
  client_evidence_id,
  recorded_at,
  entry
) values (
  auth.uid(),
  'proof.private-1',
  '2026-07-22T10:00:00.000Z',
  '{
    "id":"proof.private-1",
    "capabilityId":"capability.force-motion.zero-net-force",
    "recordedAt":"2026-07-22T10:00:00.000Z",
    "source":{"kind":"authored_activity","refId":"world.force-motion.v1"},
    "proof":{"conditionId":"transfer.velocity-graph.v1","mode":"independent_transfer","assistanceAccess":"removed","outcome":"proved"},
    "assistance":[{"kind":"authored_hint","sourceId":"hint.net-force.v1"}],
    "sharing":{"status":"private","updatedAt":"2026-07-22T10:00:00.000Z"},
    "returnSchedule":{
      "anchorAt":"2026-07-22T10:00:00.000Z",
      "intervalsDays":[7,30],
      "completedCount":0,
      "nextDueAt":"2026-07-29T10:00:00.000Z",
      "lastCompletedAt":null
    }
  }'::jsonb
);

do $$
begin
  begin
    insert into forge.adult_private_evidence_entries (
      learner_user_id, client_evidence_id, recorded_at, entry
    ) values (
      auth.uid(),
      'proof.contaminated',
      '2026-07-22T10:00:00.000Z',
      '{
        "id":"proof.contaminated",
        "capabilityId":"capability.force-motion.zero-net-force",
        "recordedAt":"2026-07-22T10:00:00.000Z",
        "source":{"kind":"authored_activity","refId":"world.force-motion.v1"},
        "proof":{"conditionId":"transfer.velocity-graph.v1","mode":"independent_transfer","assistanceAccess":"available","outcome":"proved"},
        "assistance":[],
        "sharing":{"status":"private","updatedAt":"2026-07-22T10:00:00.000Z"},
        "returnSchedule":null
      }'::jsonb
    );
    raise exception 'contaminated proof was accepted';
  exception when check_violation then
    null;
  end;

  begin
    insert into forge.adult_private_evidence_entries (
      learner_user_id, client_evidence_id, recorded_at, entry
    ) values (
      '22222222-2222-4222-8222-222222222222',
      'proof.cross-owner',
      '2026-07-22T10:00:00.000Z',
      '{
        "id":"proof.cross-owner",
        "capabilityId":"capability.force-motion.zero-net-force",
        "recordedAt":"2026-07-22T10:00:00.000Z",
        "source":{"kind":"authored_activity","refId":"world.force-motion.v1"},
        "proof":{"conditionId":"transfer.velocity-graph.v1","mode":"independent_transfer","assistanceAccess":"removed","outcome":"proved"},
        "assistance":[],
        "sharing":{"status":"private","updatedAt":"2026-07-22T10:00:00.000Z"},
        "returnSchedule":null
      }'::jsonb
    );
    raise exception 'cross-owner evidence write was accepted';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

delete from forge.adult_private_evidence_entries
where learner_user_id = auth.uid() and client_evidence_id = 'proof.private-1';

do $$
begin
  if exists (
    select 1 from forge.adult_private_evidence_entries
    where learner_user_id = auth.uid() and client_evidence_id = 'proof.private-1'
  ) then
    raise exception 'learner-owned deletion failed';
  end if;
end;
$$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',
  true
);

do $$
begin
  begin
    perform forge.activate_adult_account(true, true);
    raise exception 'minor profile was converted by adult activation';
  exception when others then
    if sqlerrm <> 'minor profiles cannot be converted by adult self-attestation' then
      raise;
    end if;
  end;
end;
$$;

reset role;

select 'FORGE adult auth/private evidence contract passed' as result;

rollback;
