-- Disposable fresh-install fixture for ADR-001 v2 persistence. Run only
-- against an explicitly named empty local PostgreSQL database with
-- authenticated and service_role roles; it never addresses a Supabase project.

\set ON_ERROR_STOP on

select current_database() as fixture_database,
       current_user as fixture_role,
       coalesce(inet_server_addr()::text, 'local-socket') as server_address,
       inet_server_port() as server_port;
do $$
begin
  if current_database() !~ '^forge_w5c_fresh_[a-z0-9_]+$' then
    raise exception 'fresh ADR-001 fixture requires a verified forge_w5c_fresh_* disposable database, got %', current_database();
  end if;
end;
$$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
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
    raise exception 'the disposable fixture requires authenticated and service_role roles';
  end if;
end;
$$;

create temporary table forge_adr001_v2_fresh_migration_ledger (
  position integer primary key,
  migration_name text not null unique
);

insert into forge_adr001_v2_fresh_migration_ledger values (1, '202607220001_forge_learning_os.sql');
\ir ../migrations/202607220001_forge_learning_os.sql
insert into forge_adr001_v2_fresh_migration_ledger values (2, '202607220002_forge_event_spine.sql');
\ir ../migrations/202607220002_forge_event_spine.sql
insert into forge_adr001_v2_fresh_migration_ledger values (3, '20260722090640_adult_private_evidence_staging.sql');
\ir ../migrations/20260722090640_adult_private_evidence_staging.sql
insert into forge_adr001_v2_fresh_migration_ledger values (4, '20260722101500_packet_b_authority_correction.sql');
\ir ../migrations/20260722101500_packet_b_authority_correction.sql
insert into forge_adr001_v2_fresh_migration_ledger values (5, '20260722113000_packet_b_retire_private_evidence_consent.sql');
\ir ../migrations/20260722113000_packet_b_retire_private_evidence_consent.sql
insert into forge_adr001_v2_fresh_migration_ledger values (6, '20260722150000_adr001_v2_persistence_contract.sql');
\ir ../migrations/20260722150000_adr001_v2_persistence_contract.sql

do $$
begin
  if (select array_agg(migration_name order by position) from forge_adr001_v2_fresh_migration_ledger) is distinct from array[
    '202607220001_forge_learning_os.sql',
    '202607220002_forge_event_spine.sql',
    '20260722090640_adult_private_evidence_staging.sql',
    '20260722101500_packet_b_authority_correction.sql',
    '20260722113000_packet_b_retire_private_evidence_consent.sql',
    '20260722150000_adr001_v2_persistence_contract.sql'
  ] then
    raise exception 'ADR-001 v2 fresh fixture replayed an unexpected migration ledger';
  end if;
end;
$$;

\ir forge_adr001_v2_contract.sql
\ir forge_schema_contract.sql
\ir forge_adult_cloud_staging_contract.sql
\ir forge_event_spine_contract.sql

select 'FORGE ADR-001 v2 fresh fixture passed' as result;
