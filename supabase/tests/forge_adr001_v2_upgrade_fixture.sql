-- Disposable legacy-upgrade fixture for ADR-001 v2 persistence. It first
-- creates an immutable historical consent under the pre-retirement staging
-- state, then upgrades through the retirement and v2 migrations.

\set ON_ERROR_STOP on

select current_database() as fixture_database,
       current_user as fixture_role,
       coalesce(inet_server_addr()::text, 'local-socket') as server_address,
       inet_server_port() as server_port;
do $$
begin
  if current_database() !~ '^forge_w5c_upgrade_[a-z0-9_]+$' then
    raise exception 'legacy-upgrade ADR-001 fixture requires a verified forge_w5c_upgrade_* disposable database, got %', current_database();
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

create temporary table forge_adr001_v2_upgrade_migration_ledger (
  position integer primary key,
  migration_name text not null unique
);

insert into forge_adr001_v2_upgrade_migration_ledger values (1, '202607220001_forge_learning_os.sql');
\ir ../migrations/202607220001_forge_learning_os.sql
insert into forge_adr001_v2_upgrade_migration_ledger values (2, '202607220002_forge_event_spine.sql');
\ir ../migrations/202607220002_forge_event_spine.sql
insert into forge_adr001_v2_upgrade_migration_ledger values (3, '20260722090640_adult_private_evidence_staging.sql');
\ir ../migrations/20260722090640_adult_private_evidence_staging.sql

-- The historic v1 contract runs while its journal is still empty; the legacy
-- row below is then the state that the remaining upgrade must preserve.
\ir forge_event_spine_contract.sql

insert into auth.users (id) values ('20000000-0000-4000-8000-000000000001');
begin;
set local role service_role;
insert into forge.profiles (user_id, display_name)
values ('20000000-0000-4000-8000-000000000001', 'ADR-001 legacy adult');
insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values ('20000000-0000-4000-8000-000000000001', 'adult', 'active');
insert into forge.consent_records (
  learner_user_id, purpose_key, decision, actor_user_id, actor_capacity, policy_version
) values (
  '20000000-0000-4000-8000-000000000001', 'private_evidence_persistence', 'granted',
  '20000000-0000-4000-8000-000000000001', 'learner', 'fixture.legacy.pre-retirement'
);
commit;

-- This v1 row predates the v2 migration and must remain immutable/readable
-- after the additive contract is installed.
do $$
declare
  unsigned_event jsonb;
begin
  unsigned_event := jsonb_build_object(
    'event_id', '20000000-0000-4000-8000-000000000002',
    'event_type', 'world_run.started',
    'schema_version', 1,
    'aggregate', jsonb_build_object('type', 'world_run', 'id', 'run.legacy.pre-v2', 'version', 1),
    'actor', jsonb_build_object('type', 'learner', 'id', 'actor.legacy.v1'),
    'authority', jsonb_build_object('policy_version', 'policy.legacy.2026.07', 'consent_grant_ids', jsonb_build_array()),
    'occurred_at', '2026-07-22T08:00:00.000Z',
    'recorded_at', '2026-07-22T08:00:00.000Z',
    'correlation_id', 'correlation.legacy.pre-v2',
    'causation_id', null,
    'idempotency_key', 'idempotency.legacy.pre-v2',
    'payload', jsonb_build_object(
      'world_id', 'world.legacy.v1', 'world_version', '1.0.0', 'content_version', '1.0.0',
      'capability_id', 'capability.legacy.v1', 'proof_claim_id', 'claim.legacy.v1',
      'validator_id', 'validator.legacy.v1', 'validator_version', '1.0.0',
      'package_integrity_hash', 'sha256:' || repeat('a', 64), 'assistance_mode', 'closed',
      'source_ids', jsonb_build_array('source.legacy.v1'), 'proof_authority', 'honour_based'
    )
  );
  perform forge.append_event(unsigned_event || jsonb_build_object(
    'integrity_hash', forge_private.sha256_jsonb(unsigned_event)
  ));
end;
$$;

-- Pre-correction v1 delivery history legally allowed arbitrary error text.
-- The additive migration must retain this row without validating/remediating
-- it, while making every later row version obey the bounded code contract.
update forge.event_outbox
set last_error_code = 'Legacy Invalid Error Text Retained'
where event_id = '20000000-0000-4000-8000-000000000002';

insert into forge_adr001_v2_upgrade_migration_ledger values (4, '20260722101500_packet_b_authority_correction.sql');
\ir ../migrations/20260722101500_packet_b_authority_correction.sql
insert into forge_adr001_v2_upgrade_migration_ledger values (5, '20260722113000_packet_b_retire_private_evidence_consent.sql');
\ir ../migrations/20260722113000_packet_b_retire_private_evidence_consent.sql
insert into forge_adr001_v2_upgrade_migration_ledger values (6, '20260722150000_adr001_v2_persistence_contract.sql');
\ir ../migrations/20260722150000_adr001_v2_persistence_contract.sql

do $$
begin
  if (select count(*) from forge.consent_records where learner_user_id = '20000000-0000-4000-8000-000000000001'
      and purpose_key = 'private_evidence_persistence') <> 1 then
    raise exception 'ADR-001 v2 upgrade did not preserve immutable legacy consent history';
  end if;
  if not exists (
    select 1 from forge.event_journal
    where event_id = '20000000-0000-4000-8000-000000000002'
      and aggregate_id = 'run.legacy.pre-v2'
      and schema_version = 1
  ) then
    raise exception 'ADR-001 v2 upgrade did not preserve version-1 event history';
  end if;
  if (select last_error_code from forge.event_outbox
      where event_id = '20000000-0000-4000-8000-000000000002')
     is distinct from 'Legacy Invalid Error Text Retained' then
    raise exception 'ADR-001 v2 upgrade rewrote retained legacy outbox error history';
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'forge.event_outbox'::regclass
      and conname = 'event_outbox_last_error_code_shape'
      and contype = 'c'
      and not convalidated
  ) then
    raise exception 'legacy outbox error-code constraint is missing or was incorrectly validated';
  end if;
  begin
    update forge.event_outbox
    set attempts = attempts + 1,
        status = 'pending',
        available_at = available_at + interval '1 minute',
        claimed_at = now(),
        published_at = null,
        updated_at = now()
    where event_id = '20000000-0000-4000-8000-000000000002';
    raise exception 'expected retained invalid legacy error code to block any subsequent row update';
  exception when check_violation then
    null;
  end;
  if (select attempts from forge.event_outbox
      where event_id = '20000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'failed retained-history update changed the legacy outbox row';
  end if;
  if (select array_agg(migration_name order by position) from forge_adr001_v2_upgrade_migration_ledger) is distinct from array[
    '202607220001_forge_learning_os.sql',
    '202607220002_forge_event_spine.sql',
    '20260722090640_adult_private_evidence_staging.sql',
    '20260722101500_packet_b_authority_correction.sql',
    '20260722113000_packet_b_retire_private_evidence_consent.sql',
    '20260722150000_adr001_v2_persistence_contract.sql'
  ] then
    raise exception 'ADR-001 v2 upgrade replayed an unexpected migration ledger';
  end if;
end;
$$;

\ir forge_adr001_v2_contract.sql
\ir forge_schema_contract.sql
\ir forge_adult_cloud_staging_contract.sql

select 'FORGE ADR-001 v2 legacy-upgrade fixture passed' as result;
