-- Disposable PostgreSQL fresh-replay companion fixture. Run only against an
-- empty local database whose cluster supplies `authenticated` and
-- `service_role` roles. This proves the current ordered migration sequence
-- remains fresh-installable after the legacy-upgrade repair.

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

insert into forge_packet_b_fixture_migration_ledger values
  (4, '20260722101500_packet_b_authority_correction.sql');
\ir ../migrations/20260722101500_packet_b_authority_correction.sql

insert into forge_packet_b_fixture_migration_ledger values
  (5, '20260722113000_packet_b_retire_private_evidence_consent.sql');
\ir ../migrations/20260722113000_packet_b_retire_private_evidence_consent.sql

do $$
begin
  if (select array_agg(migration_name order by position)
      from forge_packet_b_fixture_migration_ledger) is distinct from array[
        '202607220001_forge_learning_os.sql',
        '202607220002_forge_event_spine.sql',
        '20260722090640_adult_private_evidence_staging.sql',
        '20260722101500_packet_b_authority_correction.sql',
        '20260722113000_packet_b_retire_private_evidence_consent.sql'
      ] then
    raise exception 'the disposable fresh fixture did not replay the expected migration ledger';
  end if;
end;
$$;

\ir forge_adult_cloud_staging_contract.sql
\ir forge_schema_contract.sql
\ir forge_event_spine_contract.sql

select 'FORGE adult-cloud fresh replay fixture passed' as result;
