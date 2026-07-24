-- Run after all migrations with psql -v ON_ERROR_STOP=1.
-- This contract is transactional and rolls back every fixture. It proves the
-- staged Canonical Plan Continuity v1 database boundary; it does not constitute
-- a live Supabase, browser-auth, production-backup, or concurrency deployment gate.

begin;
set constraints all deferred;

do $$
declare
  v_table_name text;
  v_missing text;
  v_violations text;
begin
  if to_regclass('forge.learning_programs') is null
    or to_regclass('forge.learning_goals') is null
    or to_regclass('forge.evidence_events') is null then
    raise exception 'continuity migration did not preserve prerequisite learning and evidence tables';
  end if;

  select string_agg(expected.table_name, ', ')
  into v_missing
  from (
    values
      ('learning_intents'),
      ('learning_path_revisions'),
      ('learning_path_nodes'),
      ('learning_path_decisions'),
      ('learner_activity_states'),
      ('study_sessions'),
      ('saved_resources'),
      ('guest_import_receipts')
  ) as expected(table_name)
  where to_regclass(format('forge.%I', expected.table_name)) is null;

  if v_missing is not null then
    raise exception 'continuity tables are missing: %', v_missing;
  end if;

  select string_agg(relation.relname, ', ')
  into v_violations
  from pg_class as relation
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relname in (
      'learning_intents',
      'learning_path_revisions',
      'learning_path_nodes',
      'learning_path_decisions',
      'learner_activity_states',
      'study_sessions',
      'saved_resources',
      'guest_import_receipts'
    )
    and (
      relation.relkind <> 'r'
      or not relation.relrowsecurity
      or not relation.relforcerowsecurity
    );

  if v_violations is not null then
    raise exception 'continuity relations are not forced-RLS base tables: %', v_violations;
  end if;

  select string_agg(relation.relname, ', ')
  into v_violations
  from pg_class as relation
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relname in (
      'learning_intents',
      'learning_path_revisions',
      'learning_path_nodes',
      'learning_path_decisions',
      'learner_activity_states',
      'study_sessions',
      'saved_resources',
      'guest_import_receipts'
    )
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

  if v_violations is not null then
    raise exception 'continuity tables lack bigint generated-always identity keys: %', v_violations;
  end if;

  select string_agg(
    format('%s (%s)', foreign_key.conrelid::regclass, foreign_key.conname),
    ', '
  )
  into v_violations
  from pg_constraint as foreign_key
  join pg_class as relation on relation.oid = foreign_key.conrelid
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relname in (
      'learning_intents',
      'learning_path_revisions',
      'learning_path_nodes',
      'learning_path_decisions',
      'learner_activity_states',
      'study_sessions',
      'saved_resources',
      'guest_import_receipts'
    )
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

  if v_violations is not null then
    raise exception 'continuity foreign keys lack matching leading indexes: %', v_violations;
  end if;

  select string_agg(attribute.attname, ', ')
  into v_violations
  from pg_attribute as attribute
  where attribute.attrelid = 'forge.learning_intents'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and (
      attribute.atttypid = 'jsonb'::regtype
      or attribute.attname ~ '(^|_)(raw|learner_words|prompt|chat|transcript|message|private_notes)($|_)'
    );

  if v_violations is not null then
    raise exception 'sanitized learning-intent boundary exposes raw/free-form storage: %', v_violations;
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.learning_intents'::regclass
      and constraint_record.contype = 'c'
      and pg_get_constraintdef(constraint_record.oid)
        like '%data_class%sanitized-learning-intent%'
  ) then
    raise exception 'learning intents lack the sanitized-only data-class constraint';
  end if;

  select string_agg(
    format('%s.%s', expected.table_name, expected.digest_column),
    ', '
  )
  into v_missing
  from (
    values
      ('learning_intents', 'sanitized_intent_digest'),
      ('learning_path_revisions', 'revision_digest'),
      ('learning_path_nodes', 'content_digest'),
      ('learning_path_decisions', 'decision_digest'),
      ('learner_activity_states', 'state_digest'),
      ('study_sessions', 'session_digest'),
      ('saved_resources', 'bookmark_digest'),
      ('guest_import_receipts', 'receipt_digest')
  ) as expected(table_name, digest_column)
  where not exists (
    select 1
    from pg_attribute as attribute
    where attribute.attrelid = format('forge.%I', expected.table_name)::regclass
      and attribute.attname = expected.digest_column
      and attribute.attnum > 0
      and not attribute.attisdropped
  );

  if v_missing is not null then
    raise exception 'continuity records lack exact canonical digests: %', v_missing;
  end if;

  select string_agg(format('%s.%s', relation.relname, attribute.attname), ', ')
  into v_violations
  from pg_attribute as attribute
  join pg_class as relation on relation.oid = attribute.attrelid
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'forge'
    and relation.relname in (
      'learning_intents',
      'learning_path_revisions',
      'learning_path_nodes',
      'learning_path_decisions',
      'learner_activity_states',
      'study_sessions',
      'saved_resources',
      'guest_import_receipts'
    )
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname ~ '(^|_)(provider|model|api_key|raw_text|evidence|proof|mastery|score)($|_)';

  if v_violations is not null then
    raise exception 'continuity schema crossed the provider, model, raw-text, or evidence boundary: %',
      v_violations;
  end if;

  if exists (
    select 1
    from pg_constraint as foreign_key
    join pg_class as relation on relation.oid = foreign_key.conrelid
    join pg_class as referenced on referenced.oid = foreign_key.confrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    join pg_namespace as referenced_namespace on referenced_namespace.oid = referenced.relnamespace
    where namespace.nspname = 'forge'
      and relation.relname in (
        'learning_intents',
        'learning_path_revisions',
        'learning_path_nodes',
        'learning_path_decisions',
        'learner_activity_states',
        'study_sessions',
        'saved_resources',
        'guest_import_receipts'
      )
      and foreign_key.contype = 'f'
      and referenced_namespace.nspname = 'forge'
      and referenced.relname in (
        'evidence_events',
        'assistance_events',
        'proof_schedules',
        'human_reviews',
        'learner_capability_states'
      )
  ) then
    raise exception 'continuity tables are coupled to cloud evidence or inferred learner-state tables';
  end if;

  foreach v_table_name in array array[
    'learning_intents',
    'learning_path_revisions',
    'learning_path_nodes',
    'learning_path_decisions',
    'learner_activity_states',
    'study_sessions',
    'saved_resources',
    'guest_import_receipts'
  ]
  loop
    if has_table_privilege('anon', format('forge.%I', v_table_name), 'SELECT')
      or has_table_privilege('anon', format('forge.%I', v_table_name), 'INSERT')
      or has_table_privilege('anon', format('forge.%I', v_table_name), 'UPDATE')
      or has_table_privilege('anon', format('forge.%I', v_table_name), 'DELETE') then
      raise exception 'anonymous role has continuity privilege on %', v_table_name;
    end if;

    if not has_table_privilege('authenticated', format('forge.%I', v_table_name), 'SELECT')
      or has_table_privilege('authenticated', format('forge.%I', v_table_name), 'INSERT')
      or has_table_privilege('authenticated', format('forge.%I', v_table_name), 'UPDATE')
      or has_table_privilege('authenticated', format('forge.%I', v_table_name), 'DELETE') then
      raise exception 'authenticated role is not read-only on %', v_table_name;
    end if;

    if not has_table_privilege('service_role', format('forge.%I', v_table_name), 'SELECT')
      or not has_table_privilege('service_role', format('forge.%I', v_table_name), 'INSERT')
      or has_table_privilege('service_role', format('forge.%I', v_table_name), 'DELETE') then
      raise exception 'service role lacks bounded transactional authority on %', v_table_name;
    end if;
  end loop;

  foreach v_table_name in array array[
    'learning_intents',
    'learning_path_revisions',
    'learning_path_nodes',
    'learning_path_decisions',
    'saved_resources',
    'guest_import_receipts'
  ]
  loop
    if has_table_privilege('service_role', format('forge.%I', v_table_name), 'UPDATE') then
      raise exception 'service role can rewrite immutable continuity history on %', v_table_name;
    end if;

    if not exists (
      select 1
      from pg_trigger as trigger_record
      where trigger_record.tgrelid = format('forge.%I', v_table_name)::regclass
        and trigger_record.tgname = 'continuity_90_append_only'
        and not trigger_record.tgisinternal
        and trigger_record.tgenabled in ('O', 'A')
    ) or not exists (
      select 1
      from pg_trigger as trigger_record
      where trigger_record.tgrelid = format('forge.%I', v_table_name)::regclass
        and trigger_record.tgname = 'continuity_90_no_truncate'
        and not trigger_record.tgisinternal
        and trigger_record.tgenabled in ('O', 'A')
    ) then
      raise exception 'immutable continuity guards are absent on %', v_table_name;
    end if;
  end loop;

  if not has_table_privilege('service_role', 'forge.learner_activity_states', 'UPDATE')
    or not has_table_privilege('service_role', 'forge.study_sessions', 'UPDATE') then
    raise exception 'versioned continuity projections lack service-role update authority';
  end if;

  if exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'forge'
      and policy.tablename in (
        'learning_intents',
        'learning_path_revisions',
        'learning_path_nodes',
        'learning_path_decisions',
        'learner_activity_states',
        'study_sessions',
        'saved_resources',
        'guest_import_receipts'
      )
      and policy.cmd <> 'SELECT'
  ) then
    raise exception 'continuity schema exposes a client-side write policy';
  end if;

  if has_function_privilege(
    'authenticated',
    'forge_private.enforce_continuity_active_adult_owner()',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'forge_private.validate_learning_path_revision_append()',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'forge_private.validate_learning_path_decision()',
    'EXECUTE'
  ) then
    raise exception 'authenticated caller can directly execute private continuity trigger functions';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.learning_path_revisions'::regclass
      and constraint_record.contype = 'f'
      and constraint_record.conname = 'learning_path_revisions_acceptance_decision_fkey'
      and constraint_record.condeferrable
      and constraint_record.condeferred
  ) then
    raise exception 'decision/result cycle is not transactionally deferred';
  end if;

  if not exists (
    select 1
    from pg_trigger as trigger_record
    where trigger_record.tgrelid = 'forge.learning_path_revisions'::regclass
      and trigger_record.tgname = 'continuity_80_grounded_revision_shape'
      and trigger_record.tgconstraint <> 0
      and trigger_record.tgdeferrable
      and trigger_record.tginitdeferred
      and trigger_record.tgenabled in ('O', 'A')
  ) then
    raise exception 'grounded revision lacks its deferred exactly-one-World activity gate';
  end if;

  if not exists (
    select 1
    from pg_attribute as attribute
    where attribute.attrelid = 'forge.learning_path_revisions'::regclass
      and attribute.attname = 'activity_protocol'
      and attribute.attnum > 0
      and not attribute.attisdropped
  ) or not exists (
    select 1
    from pg_attribute as attribute
    where attribute.attrelid = 'forge.learning_path_nodes'::regclass
      and attribute.attname = 'activity_protocol'
      and attribute.attnum > 0
      and not attribute.attisdropped
  ) then
    raise exception 'reviewed World continuity rows lack the registry protocol discriminator';
  end if;

  if not exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.learning_path_nodes'::regclass
      and constraint_record.contype = 'c'
      and pg_get_constraintdef(constraint_record.oid) like '%reviewed_world_activity%'
      and pg_get_constraintdef(constraint_record.oid) like '%activity_protocol%'
  ) then
    raise exception 'reviewed World activity kind is not bound to its persisted protocol';
  end if;

  if exists (
    select 1
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.learner_activity_states'::regclass
      and constraint_record.contype = 'c'
      and pg_get_constraintdef(constraint_record.oid) like '%skipped%'
  ) then
    raise exception 'V1 learner activity state still exposes skipped';
  end if;
end;
$$;

create temporary table continuity_evidence_baseline (
  table_name text primary key,
  row_count bigint not null
) on commit drop;

insert into continuity_evidence_baseline (table_name, row_count)
values
  ('evidence_events', (select count(*) from forge.evidence_events)),
  ('assistance_events', (select count(*) from forge.assistance_events)),
  ('policy_decisions', (select count(*) from forge.policy_decisions)),
  ('learner_capability_states', (select count(*) from forge.learner_capability_states));

insert into auth.users (id) values
  ('71000000-0000-4000-8000-000000000001'),
  ('72000000-0000-4000-8000-000000000001'),
  ('73000000-0000-4000-8000-000000000001')
on conflict do nothing;

set local role service_role;

insert into forge.profiles (user_id, display_name, account_status)
values
  ('71000000-0000-4000-8000-000000000001', 'Continuity owner one', 'active'),
  ('72000000-0000-4000-8000-000000000001', 'Continuity owner two', 'active'),
  ('73000000-0000-4000-8000-000000000001', 'Continuity minor fixture', 'active')
on conflict do nothing;

insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values
  ('71000000-0000-4000-8000-000000000001', 'adult', 'active'),
  ('72000000-0000-4000-8000-000000000001', 'adult', 'active'),
  ('73000000-0000-4000-8000-000000000001', '13_15', 'active')
on conflict do nothing;

insert into forge.learning_intents (
  intent_id,
  owner_user_id,
  schema_version,
  data_class,
  sanitized_intent_digest,
  intent_summary,
  desired_action,
  practical_outcome,
  depth,
  route_preferences,
  accepted_uses,
  learner_preview_receipt_id,
  sanitization_policy_id,
  sanitization_policy_version,
  sanitization_policy_digest,
  accepted_at,
  idempotency_key
) values
  (
    'intent.owner-one',
    '71000000-0000-4000-8000-000000000001',
    'learning-intent.v1',
    'sanitized-learning-intent',
    'sha256:' || repeat('1', 64),
    'Understand force-free motion through a reviewed separating test.',
    'Build a grounded path from a reviewed world.',
    'Explain the mechanism and transfer it to a new representation.',
    'deep',
    array['visual', 'experiment'],
    array['internal-map'],
    'preview.owner-one',
    'intent-sanitization-v1',
    '1.0.0',
    'sha256:' || repeat('2', 64),
    now(),
    'idempotency.intent.owner-one'
  ),
  (
    'intent.owner-two',
    '72000000-0000-4000-8000-000000000001',
    'learning-intent.v1',
    'sanitized-learning-intent',
    'sha256:' || repeat('3', 64),
    'Understand a reviewed concept through a controlled test.',
    'Build a separate grounded path.',
    null,
    'working',
    array['visual'],
    array['internal-map'],
    'preview.owner-two',
    'intent-sanitization-v1',
    '1.0.0',
    'sha256:' || repeat('2', 64),
    now(),
    'idempotency.intent.owner-two'
  );

do $$
begin
  begin
    insert into forge.learning_intents (
      intent_id,
      owner_user_id,
      schema_version,
      data_class,
      sanitized_intent_digest,
      intent_summary,
      desired_action,
      depth,
      route_preferences,
      accepted_uses,
      learner_preview_receipt_id,
      sanitization_policy_id,
      sanitization_policy_version,
      sanitization_policy_digest,
      accepted_at,
      idempotency_key
    ) values (
      'intent.minor-forbidden',
      '73000000-0000-4000-8000-000000000001',
      'learning-intent.v1',
      'sanitized-learning-intent',
      'sha256:' || repeat('4', 64),
      'This sanitized row must still remain device-only.',
      'Do not persist this under-age continuity state.',
      'working',
      array['visual'],
      array['internal-map'],
      'preview.minor-forbidden',
      'intent-sanitization-v1',
      '1.0.0',
      'sha256:' || repeat('2', 64),
      now(),
      'idempotency.intent.minor-forbidden'
    );
    raise exception 'under-18 continuity row was persisted';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

insert into forge.learning_path_revisions (
  owner_user_id,
  path_id,
  revision_id,
  revision_number,
  expected_previous_revision_number,
  learning_intent_id,
  sanitized_intent_digest,
  goal_ref_id,
  schema_version,
  plan_kind,
  revision_status,
  title,
  authority_kind,
  world_id,
  world_version,
  world_route,
  activity_protocol,
  world_source_ids,
  world_ref_digest,
  limitation_codes,
  source_plan_digest,
  revision_digest,
  idempotency_key,
  execution_allowed
) values (
  '71000000-0000-4000-8000-000000000001',
  'path.owner-one',
  'path-revision.owner-one.1',
  1,
  0,
  (
    select intent.id
    from forge.learning_intents as intent
    where intent.owner_user_id = '71000000-0000-4000-8000-000000000001'
      and intent.intent_id = 'intent.owner-one'
  ),
  'sha256:' || repeat('1', 64),
  'goal.owner-one',
  'learning-path-revision.v1',
  'grounded_learning',
  'candidate',
  'Force-free motion separating test',
  'reviewed_world',
  'world.force-and-motion',
  '1.0.2',
  '/learn/force-and-motion',
  'modelshift',
  array['source.openstax.newtons-first-law'],
  'sha256:' || repeat('5', 64),
  array['delayed-retention-untested'],
  'sha256:' || repeat('6', 64),
  'sha256:' || repeat('7', 64),
  'idempotency.revision.owner-one.1',
  false
);

insert into forge.learning_path_nodes (
  owner_user_id,
  path_revision_id,
  node_id,
  position,
  title,
  objective,
  authority_kind,
  activity_id,
  activity_kind,
  runnable,
  world_id,
  world_version,
  world_route,
  activity_protocol,
  world_ref_digest,
  content_digest,
  idempotency_key
) values (
  '71000000-0000-4000-8000-000000000001',
  (
    select revision.id
    from forge.learning_path_revisions as revision
    where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
      and revision.revision_id = 'path-revision.owner-one.1'
  ),
  'path-node.owner-one.1',
  0,
  'Compare synchronized worlds',
  'Use one deterministic comparison to separate the two plausible models.',
  'reviewed_world',
  'activity.world-force-free-motion',
  'modelshift_world',
  true,
  'world.force-and-motion',
  '1.0.2',
  '/learn/force-and-motion',
  'modelshift',
  'sha256:' || repeat('5', 64),
  'sha256:' || repeat('8', 64),
  'idempotency.node.owner-one.r1.n1'
);

insert into forge.learning_path_revisions (
  owner_user_id,
  path_id,
  revision_id,
  revision_number,
  expected_previous_revision_number,
  learning_intent_id,
  sanitized_intent_digest,
  goal_ref_id,
  schema_version,
  plan_kind,
  revision_status,
  title,
  authority_kind,
  world_id,
  world_version,
  world_route,
  activity_protocol,
  world_source_ids,
  world_ref_digest,
  limitation_codes,
  source_plan_digest,
  revision_digest,
  idempotency_key,
  execution_allowed
) values (
  '72000000-0000-4000-8000-000000000001',
  'path.owner-two',
  'path-revision.owner-two.1',
  1,
  0,
  (
    select intent.id
    from forge.learning_intents as intent
    where intent.owner_user_id = '72000000-0000-4000-8000-000000000001'
      and intent.intent_id = 'intent.owner-two'
  ),
  'sha256:' || repeat('3', 64),
  'goal.owner-two',
  'learning-path-revision.v1',
  'grounded_learning',
  'candidate',
  'Ratios that stay the same',
  'reviewed_world',
  'world.proportional-reasoning',
  '1.0.2',
  '/learn/proportional-reasoning',
  'activity',
  array['source.openstax.ratios-and-rate'],
  'sha256:' || repeat('a', 64),
  array['delayed-retention-untested'],
  'sha256:' || repeat('b', 64),
  'sha256:' || repeat('c', 64),
  'idempotency.revision.owner-two.1',
  false
);

do $$
begin
  begin
    insert into forge.learning_path_nodes (
      owner_user_id,
      path_revision_id,
      node_id,
      position,
      title,
      objective,
      authority_kind,
      activity_id,
      activity_kind,
      runnable,
      world_id,
      world_version,
      world_route,
      activity_protocol,
      world_ref_digest,
      content_digest,
      idempotency_key
    ) values (
      '72000000-0000-4000-8000-000000000001',
      (
        select revision.id
        from forge.learning_path_revisions as revision
        where revision.owner_user_id = '72000000-0000-4000-8000-000000000001'
          and revision.revision_id = 'path-revision.owner-two.1'
      ),
      'path-node.owner-two.mislabeled',
      0,
      'Mislabeled reviewed activity',
      'This node must fail before it can relabel the reviewed protocol.',
      'reviewed_world',
      'activity.world-proportional_reasoning-mislabeled',
      'modelshift_world',
      true,
      'world.proportional-reasoning',
      '1.0.2',
      '/learn/proportional-reasoning',
      'activity',
      'sha256:' || repeat('a', 64),
      'sha256:' || repeat('d', 64),
      'idempotency.node.owner-two.mislabeled'
    );
    raise exception 'standard reviewed World activity accepted a ModelShift label';
  exception when check_violation then
    null;
  end;
end;
$$;

insert into forge.learning_path_nodes (
  owner_user_id,
  path_revision_id,
  node_id,
  position,
  title,
  objective,
  authority_kind,
  activity_id,
  activity_kind,
  runnable,
  world_id,
  world_version,
  world_route,
  activity_protocol,
  world_ref_digest,
  content_digest,
  idempotency_key
) values (
  '72000000-0000-4000-8000-000000000001',
  (
    select revision.id
    from forge.learning_path_revisions as revision
    where revision.owner_user_id = '72000000-0000-4000-8000-000000000001'
      and revision.revision_id = 'path-revision.owner-two.1'
  ),
  'path-node.owner-two.1',
  0,
  'Compare equivalent ratios',
  'Use exact arithmetic to preserve the authored ratio relationship.',
  'reviewed_world',
  'activity.world-proportional_reasoning',
  'reviewed_world_activity',
  true,
  'world.proportional-reasoning',
  '1.0.2',
  '/learn/proportional-reasoning',
  'activity',
  'sha256:' || repeat('a', 64),
  'sha256:' || repeat('e', 64),
  'idempotency.node.owner-two.r1.n1'
);

insert into forge.learning_path_decisions (
  decision_id,
  owner_user_id,
  path_id,
  base_path_revision_id,
  base_revision_digest,
  expected_revision_number,
  schema_version,
  decision_kind,
  decision_digest,
  result_revision_id,
  result_revision_number,
  idempotency_key,
  decided_at
) values (
  'path-decision.owner-one.accept',
  '71000000-0000-4000-8000-000000000001',
  'path.owner-one',
  (
    select revision.id
    from forge.learning_path_revisions as revision
    where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
      and revision.revision_id = 'path-revision.owner-one.1'
  ),
  'sha256:' || repeat('7', 64),
  1,
  'path-decision.v1',
  'accept',
  'sha256:' || repeat('e', 64),
  'path-revision.owner-one.2',
  2,
  'idempotency.decision.owner-one.accept',
  now()
);

insert into forge.learning_path_revisions (
  owner_user_id,
  path_id,
  revision_id,
  revision_number,
  expected_previous_revision_number,
  expected_previous_revision_digest,
  supersedes_revision_id,
  learning_intent_id,
  sanitized_intent_digest,
  goal_ref_id,
  schema_version,
  plan_kind,
  revision_status,
  title,
  authority_kind,
  world_id,
  world_version,
  world_route,
  activity_protocol,
  world_source_ids,
  world_ref_digest,
  limitation_codes,
  source_plan_digest,
  revision_digest,
  idempotency_key,
  execution_allowed,
  acceptance_decision_id
) values (
  '71000000-0000-4000-8000-000000000001',
  'path.owner-one',
  'path-revision.owner-one.2',
  2,
  1,
  'sha256:' || repeat('7', 64),
  'path-revision.owner-one.1',
  (
    select intent.id
    from forge.learning_intents as intent
    where intent.owner_user_id = '71000000-0000-4000-8000-000000000001'
      and intent.intent_id = 'intent.owner-one'
  ),
  'sha256:' || repeat('1', 64),
  'goal.owner-one',
  'learning-path-revision.v1',
  'grounded_learning',
  'accepted',
  'Force-free motion separating test',
  'reviewed_world',
  'world.force-and-motion',
  '1.0.2',
  '/learn/force-and-motion',
  'modelshift',
  array['source.openstax.newtons-first-law'],
  'sha256:' || repeat('5', 64),
  array['delayed-retention-untested'],
  'sha256:' || repeat('6', 64),
  'sha256:' || repeat('9', 64),
  'idempotency.revision.owner-one.2',
  true,
  'path-decision.owner-one.accept'
);

insert into forge.learning_path_nodes (
  owner_user_id,
  path_revision_id,
  node_id,
  position,
  title,
  objective,
  authority_kind,
  activity_id,
  activity_kind,
  runnable,
  world_id,
  world_version,
  world_route,
  activity_protocol,
  world_ref_digest,
  content_digest,
  idempotency_key
) values (
  '71000000-0000-4000-8000-000000000001',
  (
    select revision.id
    from forge.learning_path_revisions as revision
    where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
      and revision.revision_id = 'path-revision.owner-one.2'
  ),
  'path-node.owner-one.1',
  0,
  'Compare synchronized worlds',
  'Use one deterministic comparison to separate the two plausible models.',
  'reviewed_world',
  'activity.world-force-free-motion',
  'modelshift_world',
  true,
  'world.force-and-motion',
  '1.0.2',
  '/learn/force-and-motion',
  'modelshift',
  'sha256:' || repeat('5', 64),
  'sha256:' || repeat('8', 64),
  'idempotency.node.owner-one.r2.n1'
);

do $$
begin
  begin
    insert into forge.learning_path_nodes (
      owner_user_id,
      path_revision_id,
      node_id,
      position,
      title,
      objective,
      prerequisite_node_ids,
      authority_kind,
      activity_id,
      activity_kind,
      runnable,
      world_id,
      world_version,
      world_route,
      activity_protocol,
      world_ref_digest,
      content_digest,
      idempotency_key
    ) values (
      '71000000-0000-4000-8000-000000000001',
      (
        select revision.id
        from forge.learning_path_revisions as revision
        where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
          and revision.revision_id = 'path-revision.owner-one.2'
      ),
      'path-node.owner-one.forbidden-second',
      1,
      'Forbidden duplicate World',
      'A grounded V1 revision cannot duplicate the full World for a milestone.',
      array['path-node.owner-one.1'],
      'reviewed_world',
      'activity.world-force-free-motion-duplicate',
      'modelshift_world',
      true,
      'world.force-and-motion',
      '1.0.2',
      '/learn/force-and-motion',
      'modelshift',
      'sha256:' || repeat('5', 64),
      'sha256:' || repeat('a', 64),
      'idempotency.node.owner-one.forbidden-second'
    );
    raise exception 'grounded revision accepted a second World activity';
  exception when check_violation then
    null;
  end;
end;
$$;

set constraints all immediate;
set constraints all deferred;

insert into forge.learner_activity_states (
  owner_user_id,
  path_revision_id,
  path_revision_digest,
  node_id,
  schema_version,
  state_version,
  activity_status,
  state_digest,
  idempotency_key
) values (
  '71000000-0000-4000-8000-000000000001',
  (
    select revision.id
    from forge.learning_path_revisions as revision
    where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
      and revision.revision_id = 'path-revision.owner-one.2'
  ),
  'sha256:' || repeat('9', 64),
  'path-node.owner-one.1',
  'activity-state.v1',
  1,
  'ready',
  'sha256:' || repeat('1', 64),
  'idempotency.activity.owner-one.v1'
);

update forge.learner_activity_states
set
  state_version = 2,
  activity_status = 'in_progress',
  state_digest = 'sha256:' || repeat('2', 64),
  idempotency_key = 'idempotency.activity.owner-one.v2',
  updated_at = now()
where owner_user_id = '71000000-0000-4000-8000-000000000001'
  and node_id = 'path-node.owner-one.1';

do $$
begin
  begin
    insert into forge.learner_activity_states (
      owner_user_id,
      path_revision_id,
      path_revision_digest,
      node_id,
      schema_version,
      state_version,
      activity_status,
      state_digest,
      idempotency_key
    ) values (
      '71000000-0000-4000-8000-000000000001',
      (
        select revision.id
        from forge.learning_path_revisions as revision
        where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
          and revision.revision_id = 'path-revision.owner-one.2'
      ),
      'sha256:' || repeat('9', 64),
      'path-node.owner-one.1',
      'activity-state.v1',
      1,
      'ready',
      'sha256:' || repeat('3', 64),
      'idempotency.activity.owner-one.duplicate'
    );
    raise exception 'accepted path node received more than one activity-state row';
  exception when unique_violation then
    null;
  end;

  begin
    update forge.learner_activity_states
    set
      state_version = 4,
      activity_status = 'completed',
      state_digest = 'sha256:' || repeat('4', 64),
      idempotency_key = 'idempotency.activity.owner-one.stale',
      updated_at = now()
    where owner_user_id = '71000000-0000-4000-8000-000000000001'
      and node_id = 'path-node.owner-one.1';
    raise exception 'stale activity-state update was accepted';
  exception when serialization_failure then
    null;
  end;
end;
$$;

insert into forge.study_sessions (
  session_id,
  owner_user_id,
  path_revision_id,
  path_revision_digest,
  node_id,
  session_version,
  session_status,
  session_digest,
  idempotency_key
) values (
  'session.owner-one.1',
  '71000000-0000-4000-8000-000000000001',
  (
    select revision.id
    from forge.learning_path_revisions as revision
    where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
      and revision.revision_id = 'path-revision.owner-one.2'
  ),
  'sha256:' || repeat('9', 64),
  'path-node.owner-one.1',
  1,
  'planned',
  'sha256:' || repeat('3', 64),
  'idempotency.session.owner-one.v1'
);

update forge.study_sessions
set
  session_version = 2,
  session_status = 'active',
  session_digest = 'sha256:' || repeat('4', 64),
  started_at = now(),
  idempotency_key = 'idempotency.session.owner-one.v2',
  updated_at = now()
where owner_user_id = '71000000-0000-4000-8000-000000000001'
  and session_id = 'session.owner-one.1';

insert into forge.saved_resources (
  saved_resource_id,
  owner_user_id,
  path_revision_id,
  node_id,
  resource_id,
  resource_observation_digest,
  review_receipt_digest,
  bookmark_action,
  bookmark_digest,
  idempotency_key,
  recorded_at
) values (
  'saved.owner-one.1',
  '71000000-0000-4000-8000-000000000001',
  (
    select revision.id
    from forge.learning_path_revisions as revision
    where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
      and revision.revision_id = 'path-revision.owner-one.2'
  ),
  'path-node.owner-one.1',
  'resource.force-comparison',
  'sha256:' || repeat('a', 64),
  'sha256:' || repeat('b', 64),
  'saved',
  'sha256:' || repeat('d', 64),
  'idempotency.saved.owner-one.1',
  now()
);

insert into forge.guest_import_receipts (
  receipt_id,
  owner_user_id,
  source_export_digest,
  consent_receipt_id,
  source_record_count,
  imported_path_ids,
  import_idempotency_key,
  receipt_digest,
  imported_at
) values (
  'import.owner-one.1',
  '71000000-0000-4000-8000-000000000001',
  'sha256:' || repeat('c', 64),
  'consent.owner-one.import',
  4,
  array['path.owner-one'],
  'idempotency.import.owner-one.1',
  'sha256:' || repeat('f', 64),
  now()
);

do $$
begin
  begin
    insert into forge.guest_import_receipts (
      receipt_id,
      owner_user_id,
      source_export_digest,
      consent_receipt_id,
      source_record_count,
      imported_path_ids,
      import_idempotency_key,
      receipt_digest,
      imported_at
    ) values (
      'import.owner-one.duplicate',
      '71000000-0000-4000-8000-000000000001',
      'sha256:' || repeat('c', 64),
      'consent.owner-one.import',
      4,
      array['path.owner-one'],
      'idempotency.import.owner-one.1',
      'sha256:' || repeat('f', 64),
      now()
    );
    raise exception 'duplicate guest import produced a second write';
  exception when unique_violation then
    null;
  end;

  if (
    select count(*)
    from forge.guest_import_receipts
    where owner_user_id = '71000000-0000-4000-8000-000000000001'
      and source_export_digest = 'sha256:' || repeat('c', 64)
  ) <> 1 then
    raise exception 'guest import at-most-once invariant failed';
  end if;

  begin
    insert into forge.learning_intents (
      intent_id,
      owner_user_id,
      schema_version,
      data_class,
      sanitized_intent_digest,
      intent_summary,
      desired_action,
      depth,
      route_preferences,
      accepted_uses,
      learner_preview_receipt_id,
      sanitization_policy_id,
      sanitization_policy_version,
      sanitization_policy_digest,
      accepted_at,
      idempotency_key
    ) values (
      'intent.owner-one.duplicate',
      '71000000-0000-4000-8000-000000000001',
      'learning-intent.v1',
      'sanitized-learning-intent',
      'sha256:' || repeat('d', 64),
      'A distinct payload cannot reuse an accepted write key.',
      'Reject this second write.',
      'working',
      array['visual'],
      array['internal-map'],
      'preview.owner-one.duplicate',
      'intent-sanitization-v1',
      '1.0.0',
      'sha256:' || repeat('2', 64),
      now(),
      'idempotency.intent.owner-one'
    );
    raise exception 'duplicate continuity write key produced a second intent';
  exception when unique_violation then
    null;
  end;
end;
$$;

do $$
begin
  begin
    insert into forge.learning_path_decisions (
      decision_id,
      owner_user_id,
      path_id,
      base_path_revision_id,
      base_revision_digest,
      expected_revision_number,
      schema_version,
      decision_kind,
      decision_digest,
      result_revision_id,
      result_revision_number,
      idempotency_key,
      decided_at
    ) values (
      'path-decision.owner-one.stale',
      '71000000-0000-4000-8000-000000000001',
      'path.owner-one',
      (
        select revision.id
        from forge.learning_path_revisions as revision
        where revision.owner_user_id = '71000000-0000-4000-8000-000000000001'
          and revision.revision_id = 'path-revision.owner-one.1'
      ),
      'sha256:' || repeat('7', 64),
      1,
      'path-decision.v1',
      'reject',
      'sha256:' || repeat('a', 64),
      'path-revision.owner-one.3',
      2,
      'idempotency.decision.owner-one.stale',
      now()
    );
    raise exception 'stale path decision was accepted';
  exception when serialization_failure then
    null;
  end;
end;
$$;

reset role;

do $$
begin
  begin
    update forge.learning_path_revisions
    set title = 'Rewritten history'
    where owner_user_id = '71000000-0000-4000-8000-000000000001'
      and revision_id = 'path-revision.owner-one.1';
    raise exception 'database owner rewrote immutable path history';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  begin
    delete from forge.learning_intents
    where owner_user_id = '71000000-0000-4000-8000-000000000001';
    raise exception 'database owner deleted immutable sanitized-intent history';
  exception when object_not_in_prerequisite_state then
    null;
  end;
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '71000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';

do $$
begin
  if (select count(*) from forge.learning_intents) <> 1
    or (select count(*) from forge.learning_path_revisions) <> 2
    or (select count(*) from forge.learning_path_decisions) <> 1
    or (select count(*) from forge.guest_import_receipts) <> 1 then
    raise exception 'owner-one RLS did not expose exactly owner-one continuity history';
  end if;

  if exists (
    select 1
    from forge.learning_intents
    where owner_user_id <> '71000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'owner-one can discover owner-two continuity rows';
  end if;

  begin
    insert into forge.guest_import_receipts (
      receipt_id,
      owner_user_id,
      source_export_digest,
      consent_receipt_id,
      source_record_count,
      imported_path_ids,
      import_idempotency_key,
      receipt_digest,
      imported_at
    ) values (
      'import.client-forbidden',
      '71000000-0000-4000-8000-000000000001',
      'sha256:' || repeat('e', 64),
      'consent.client-forbidden',
      0,
      '{}'::text[],
      'idempotency.import.client-forbidden',
      'sha256:' || repeat('e', 64),
      now()
    );
    raise exception 'authenticated browser obtained continuity write authority';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '72000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';

do $$
begin
  if (select count(*) from forge.learning_intents) <> 1
    or (select count(*) from forge.learning_path_revisions) <> 1
    or (select count(*) from forge.learning_path_nodes) <> 1
    or (select count(*) from forge.guest_import_receipts) <> 0 then
    raise exception 'owner-two RLS did not isolate owner-one continuity history';
  end if;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from forge.evidence_events)
      <> (select row_count from continuity_evidence_baseline where table_name = 'evidence_events')
    or (select count(*) from forge.assistance_events)
      <> (select row_count from continuity_evidence_baseline where table_name = 'assistance_events')
    or (select count(*) from forge.policy_decisions)
      <> (select row_count from continuity_evidence_baseline where table_name = 'policy_decisions')
    or (select count(*) from forge.learner_capability_states)
      <> (select row_count from continuity_evidence_baseline where table_name = 'learner_capability_states') then
    raise exception 'continuity writes created or mutated cloud evidence/inferred-state rows';
  end if;
end;
$$;

select 'FORGE learning continuity v1 contract passed' as result;

rollback;
