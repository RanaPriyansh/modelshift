-- Disposable PostgreSQL upgrade fixture. Run this file only against an empty
-- local database whose cluster supplies Supabase-like `authenticated` and
-- `service_role` roles. It replays the migration files in order, never touches
-- a remote project, and leaves an auditable fixture-local migration ledger.

\set ON_ERROR_STOP on

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'the disposable fixture requires authenticated and service_role database roles';
  end if;
end;
$$;

create temporary table forge_packet_b_fixture_migration_ledger (
  position integer primary key,
  migration_name text not null unique
);

insert into forge_packet_b_fixture_migration_ledger values
  (1, '202607220001_forge_learning_os.sql');
\ir ../migrations/202607220001_forge_learning_os.sql

insert into forge_packet_b_fixture_migration_ledger values
  (2, '202607220002_forge_event_spine.sql');
\ir ../migrations/202607220002_forge_event_spine.sql

insert into forge_packet_b_fixture_migration_ledger values
  (3, '20260722090640_adult_private_evidence_staging.sql');
\ir ../migrations/20260722090640_adult_private_evidence_staging.sql

-- This represents the pre-correction upgrade state. The row is inserted by
-- service_role only in this local setup fixture; it is not a browser client.
insert into auth.users (id) values ('20000000-0000-4000-8000-000000000001');

begin;
set local role service_role;

insert into forge.profiles (user_id, display_name)
values ('20000000-0000-4000-8000-000000000001', 'Legacy adult fixture');

insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values ('20000000-0000-4000-8000-000000000001', 'adult', 'active');

insert into forge.consent_records (
  learner_user_id,
  purpose_key,
  decision,
  actor_user_id,
  actor_capacity,
  policy_version
) values (
  '20000000-0000-4000-8000-000000000001',
  'private_evidence_persistence',
  'granted',
  '20000000-0000-4000-8000-000000000001',
  'learner',
  'legacy.fixture.2026.07'
);

commit;

insert into forge_packet_b_fixture_migration_ledger values
  (4, '20260722101500_packet_b_authority_correction.sql');
\ir ../migrations/20260722101500_packet_b_authority_correction.sql

insert into forge_packet_b_fixture_migration_ledger values
  (5, '20260722113000_packet_b_retire_private_evidence_consent.sql');
\ir ../migrations/20260722113000_packet_b_retire_private_evidence_consent.sql

do $$
begin
  if (select count(*) from forge.consent_records
      where learner_user_id = '20000000-0000-4000-8000-000000000001'
        and purpose_key = 'private_evidence_persistence') <> 1 then
    raise exception 'the immutable legacy private-evidence consent row was not retained';
  end if;

  if has_table_privilege('authenticated', 'forge.profiles', 'INSERT')
     or has_table_privilege('authenticated', 'forge.profiles', 'UPDATE')
     or has_table_privilege('authenticated', 'forge.learner_profiles', 'INSERT')
     or has_table_privilege('authenticated', 'forge.learner_profiles', 'UPDATE') then
    raise exception 'the authority-revocation correction did not survive the legacy-row upgrade';
  end if;

  if (select array_agg(migration_name order by position)
      from forge_packet_b_fixture_migration_ledger) is distinct from array[
        '202607220001_forge_learning_os.sql',
        '202607220002_forge_event_spine.sql',
        '20260722090640_adult_private_evidence_staging.sql',
        '20260722101500_packet_b_authority_correction.sql',
        '20260722113000_packet_b_retire_private_evidence_consent.sql'
      ] then
    raise exception 'the disposable upgrade fixture did not replay the expected migration ledger';
  end if;
end;
$$;

-- service_role bypasses RLS and retains table privileges. The retirement
-- trigger is therefore the elevated-path guard and must reject the same write.
begin;
set local role service_role;

do $$
declare
  refused boolean := false;
begin
  begin
    insert into forge.consent_records (
      learner_user_id,
      purpose_key,
      decision,
      actor_user_id,
      actor_capacity,
      policy_version
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'private_evidence_persistence',
      'granted',
      '20000000-0000-4000-8000-000000000001',
      'learner',
      'direct.service_role.fixture.2026.07'
    );
  exception
    when check_violation then
      refused := true;
  end;

  if not refused then
    raise exception 'service_role can create retired private-evidence consent';
  end if;

  if (select count(*) from forge.consent_records
      where learner_user_id = '20000000-0000-4000-8000-000000000001'
        and purpose_key = 'private_evidence_persistence') <> 1 then
    raise exception 'service_role refusal added a retired private-evidence consent row';
  end if;
end;
$$;

commit;

-- Simulate the direct authenticated Data API insert after the correction. The
-- purpose-aware WITH CHECK and role-independent trigger must reject it.
begin;
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';

do $$
declare
  refused boolean := false;
begin
  begin
    insert into forge.consent_records (
      learner_user_id,
      purpose_key,
      decision,
      actor_user_id,
      actor_capacity,
      policy_version
    ) values (
      '20000000-0000-4000-8000-000000000001',
      'private_evidence_persistence',
      'granted',
      '20000000-0000-4000-8000-000000000001',
      'learner',
      'direct.authenticated.fixture.2026.07'
    );
  exception
    when check_violation or insufficient_privilege then
      refused := true;
  end;

  if not refused then
    raise exception 'authenticated callers can create retired private-evidence consent';
  end if;
end;
$$;

commit;

\ir forge_adult_cloud_staging_contract.sql
\ir forge_schema_contract.sql
\ir forge_event_spine_contract.sql

select 'FORGE adult-cloud legacy upgrade fixture passed' as result;
