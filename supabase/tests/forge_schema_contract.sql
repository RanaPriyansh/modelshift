-- Run after migrations with psql -v ON_ERROR_STOP=1.
-- This test is catalog-only and leaves the database unchanged.

begin;

do $$
declare
  missing_names text;
  violation_names text;
  expected_table_count integer := 26;
begin
  select string_agg(expected.table_name, ', ' order by expected.table_name)
  into missing_names
  from (
    values
      ('profiles'),
      ('learner_profiles'),
      ('profile_roles'),
      ('guardian_relationships'),
      ('consent_records'),
      ('source_packages'),
      ('source_items'),
      ('source_claims'),
      ('capability_definitions'),
      ('capability_contracts'),
      ('learning_world_releases'),
      ('learning_programs'),
      ('program_capability_assignments'),
      ('learning_goals'),
      ('learner_capability_states'),
      ('learner_access_grants'),
      ('access_grant_revocations'),
      ('learning_session_runs'),
      ('learner_artifacts'),
      ('policy_decisions'),
      ('assistance_events'),
      ('evidence_events'),
      ('proof_schedules'),
      ('question_nodes'),
      ('human_reviews'),
      ('data_subject_requests')
  ) as expected(table_name)
  where to_regclass(format('forge.%I', expected.table_name)) is null;

  if missing_names is not null then
    raise exception 'missing FORGE tables: %', missing_names;
  end if;

  if (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'forge'
      and relation.relkind = 'r'
  ) < expected_table_count then
    raise exception 'FORGE table count is below the required contract';
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violation_names
  from pg_class as relation
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relkind = 'r'
    and (not relation.relrowsecurity or not relation.relforcerowsecurity);

  if violation_names is not null then
    raise exception 'tables missing enabled and forced RLS: %', violation_names;
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violation_names
  from pg_class as relation
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relkind = 'r'
    and not exists (
      select 1
      from pg_constraint as primary_key
      where primary_key.conrelid = relation.oid
        and primary_key.contype = 'p'
    );

  if violation_names is not null then
    raise exception 'tables missing primary keys: %', violation_names;
  end if;

  select string_agg(format('%s.%s', relation.relname, attribute.attname), ', ')
  into violation_names
  from pg_attribute as attribute
  join pg_class as relation on relation.oid = attribute.attrelid
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relkind = 'r'
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.atttypid = 'timestamp without time zone'::regtype;

  if violation_names is not null then
    raise exception 'timezone-naive timestamps are forbidden: %', violation_names;
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violation_names
  from pg_class as relation
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relkind = 'r'
    and relation.relname not in ('profiles', 'learner_profiles')
    and not exists (
      select 1
      from pg_attribute as attribute
      where attribute.attrelid = relation.oid
        and attribute.attname = 'id'
        and attribute.attnum > 0
        and not attribute.attisdropped
        and attribute.attidentity = 'a'
        and attribute.atttypid = 'bigint'::regtype
    );

  if violation_names is not null then
    raise exception 'non-time-ordered internal IDs found: %', violation_names;
  end if;

  select string_agg(format('%s (%s)', foreign_key.conrelid::regclass, foreign_key.conname), ', ')
  into violation_names
  from pg_constraint as foreign_key
  join pg_namespace as namespace on namespace.oid = foreign_key.connamespace
  where namespace.nspname = 'forge'
    and foreign_key.contype = 'f'
    and not exists (
      select 1
      from pg_index as index_record
      where index_record.indrelid = foreign_key.conrelid
        and index_record.indisvalid
        and (
          select array_agg(indexed.attnum order by indexed.ordinality)
          from unnest(index_record.indkey::smallint[]) with ordinality
            as indexed(attnum, ordinality)
          where indexed.ordinality <= cardinality(foreign_key.conkey)
        ) = foreign_key.conkey
    );

  if violation_names is not null then
    raise exception 'foreign keys missing a matching leading-column index: %', violation_names;
  end if;

  select string_agg(format('%s.%s', relation.relname, attribute.attname), ', ')
  into violation_names
  from pg_attribute as attribute
  join pg_class as relation on relation.oid = attribute.attrelid
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relkind = 'r'
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname ~ '(^|_)(raw_chat|chat_transcript|personality|emotion|precise_location|advertising_id)($|_)';

  if violation_names is not null then
    raise exception 'forbidden surveillance or raw-dialogue columns found: %', violation_names;
  end if;

  select string_agg(format('%s on %s', expected.trigger_name, expected.table_name), ', ')
  into missing_names
  from (
    values
      ('consent_records_append_only', 'consent_records'),
      ('policy_decisions_append_only', 'policy_decisions'),
      ('assistance_events_append_only', 'assistance_events'),
      ('evidence_events_append_only', 'evidence_events'),
      ('learner_access_grants_append_only', 'learner_access_grants'),
      ('access_grant_revocations_append_only', 'access_grant_revocations'),
      ('source_packages_versioned_immutability', 'source_packages'),
      ('source_items_versioned_immutability', 'source_items'),
      ('source_claims_versioned_immutability', 'source_claims'),
      ('capability_contracts_versioned_immutability', 'capability_contracts'),
      ('learning_world_releases_versioned_immutability', 'learning_world_releases'),
      ('human_reviews_submission_immutability', 'human_reviews'),
      ('proof_schedules_validate_completion', 'proof_schedules')
  ) as expected(trigger_name, table_name)
  where not exists (
    select 1
    from pg_trigger as trigger_record
    join pg_class as relation on relation.oid = trigger_record.tgrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'forge'
      and relation.relname = expected.table_name
      and trigger_record.tgname = expected.trigger_name
      and not trigger_record.tgisinternal
      and trigger_record.tgenabled in ('O', 'A')
  );

  if missing_names is not null then
    raise exception 'append-only triggers missing or disabled: %', missing_names;
  end if;

  if has_table_privilege('authenticated', 'forge.evidence_events', 'INSERT')
     or has_table_privilege('authenticated', 'forge.evidence_events', 'UPDATE')
     or has_table_privilege('authenticated', 'forge.evidence_events', 'DELETE')
     or has_table_privilege('authenticated', 'forge.assistance_events', 'INSERT')
     or has_table_privilege('authenticated', 'forge.assistance_events', 'UPDATE')
     or has_table_privilege('authenticated', 'forge.assistance_events', 'DELETE')
     or has_table_privilege('authenticated', 'forge.policy_decisions', 'INSERT')
     or has_table_privilege('authenticated', 'forge.policy_decisions', 'UPDATE')
     or has_table_privilege('authenticated', 'forge.policy_decisions', 'DELETE')
     or has_table_privilege('authenticated', 'forge.data_subject_requests', 'INSERT') then
    raise exception 'authenticated clients can mutate a server-authored ledger';
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'forge'
      and relation.relkind = 'r'
      and (
        has_table_privilege('authenticated', relation.oid, 'DELETE')
        or has_table_privilege('anon', relation.oid, 'SELECT')
        or has_table_privilege('anon', relation.oid, 'INSERT')
        or has_table_privilege('anon', relation.oid, 'UPDATE')
        or has_table_privilege('anon', relation.oid, 'DELETE')
      )
  ) then
    raise exception 'least-privilege violation: DELETE or anonymous table access found';
  end if;

  if has_table_privilege('authenticated', 'forge.source_packages', 'INSERT')
     or has_table_privilege('authenticated', 'forge.source_packages', 'UPDATE')
     or has_table_privilege('authenticated', 'forge.capability_contracts', 'INSERT')
     or has_table_privilege('authenticated', 'forge.capability_contracts', 'UPDATE')
     or has_table_privilege('authenticated', 'forge.learning_world_releases', 'INSERT')
     or has_table_privilege('authenticated', 'forge.learning_world_releases', 'UPDATE') then
    raise exception 'authenticated clients can mutate reviewed curriculum releases';
  end if;

  if has_sequence_privilege('authenticated', 'forge.evidence_events_id_seq', 'USAGE')
     or has_sequence_privilege('authenticated', 'forge.source_packages_id_seq', 'USAGE')
     or has_sequence_privilege('authenticated', 'forge.data_subject_requests_id_seq', 'USAGE') then
    raise exception 'authenticated clients have sequence access for server-only records';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.learner_access_grants'::regclass
      and constraint_record.contype = 'c'
      and pg_get_constraintdef(constraint_record.oid) like '%reviews:create%'
      and pg_get_constraintdef(constraint_record.oid) like '%privacy:assist%'
  ) then
    raise exception 'access grant scope allowlist is incomplete';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.access_grant_revocations'::regclass
      and constraint_record.contype = 'f'
      and cardinality(constraint_record.conkey) = 2
  ) then
    raise exception 'grant revocations are not bound to learner ownership';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.evidence_events'::regclass
      and constraint_record.contype = 'f'
      and cardinality(constraint_record.conkey) = 3
  ) then
    raise exception 'evidence is not bound to session, learner, and contract';
  end if;

  if not exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'forge'
      and policy.tablename = 'learner_access_grants'
      and policy.cmd = 'SELECT'
      and policy.roles @> array['authenticated']::name[]
  ) then
    raise exception 'learners cannot inspect active access grants';
  end if;

  if not exists (
    select 1
    from pg_proc as function_record
    join pg_namespace as namespace on namespace.oid = function_record.pronamespace
    where namespace.nspname = 'forge_private'
      and function_record.proname = 'has_learner_scope'
      and function_record.prosecdef
      and function_record.proconfig @> array['search_path=""']::text[]
      and not has_function_privilege('anon', function_record.oid, 'EXECUTE')
  ) then
    raise exception 'RLS helper is not hardened as a private SECURITY DEFINER function';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'forge'
      and table_name = 'data_subject_requests'
      and column_name = 'result_manifest_checksum'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'forge'
      and table_name = 'data_subject_requests'
      and column_name = 'deletion_boundary'
  ) then
    raise exception 'export/deletion workflow metadata is incomplete';
  end if;
end;
$$;

select 'FORGE schema contract passed' as result;

rollback;
