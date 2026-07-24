begin;

-- Canonical Plan Continuity v1 is an additive, account-ready persistence
-- counterpart for the device-first continuity contracts. It does not activate
-- cloud auth, provider/model access, or evidence synchronization.

create or replace function forge_private.continuity_text_array_is_unique(p_values text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(p_values) = (
    select count(distinct value)
    from unnest(p_values) as value
  );
$$;

create or replace function forge_private.continuity_text_array_matches(
  p_values text[],
  p_pattern text
)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select coalesce(bool_and(value ~ p_pattern), true)
  from unnest(p_values) as value;
$$;

create table forge.learning_intents (
  id bigint generated always as identity primary key,
  intent_id text not null check (intent_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$'),
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  schema_version text not null check (schema_version = 'learning-intent.v1'),
  data_class text not null check (data_class = 'sanitized-learning-intent'),
  sanitized_intent_digest text not null
    check (sanitized_intent_digest ~ '^sha256:[0-9a-f]{64}$'),
  intent_summary text not null check (char_length(intent_summary) between 1 and 1200),
  desired_action text not null check (char_length(desired_action) between 1 and 1200),
  practical_outcome text check (
    practical_outcome is null or char_length(practical_outcome) between 1 and 1200
  ),
  depth text not null check (depth in ('orient', 'working', 'deep', 'frontier')),
  route_preferences text[] not null check (
    cardinality(route_preferences) between 1 and 8
    and forge_private.continuity_text_array_is_unique(route_preferences)
  ),
  accepted_uses text[] not null check (
    cardinality(accepted_uses) between 1 and 3
    and accepted_uses <@ array[
      'internal-map',
      'model-proposal',
      'external-discovery'
    ]::text[]
    and forge_private.continuity_text_array_is_unique(accepted_uses)
  ),
  learner_preview_receipt_id text not null
    check (learner_preview_receipt_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$'),
  sanitization_policy_id text not null
    check (sanitization_policy_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$'),
  sanitization_policy_version text not null
    check (char_length(sanitization_policy_version) between 1 and 80),
  sanitization_policy_digest text not null
    check (sanitization_policy_digest ~ '^sha256:[0-9a-f]{64}$'),
  accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 180),
  unique (owner_user_id, intent_id),
  unique (owner_user_id, idempotency_key),
  unique (id, owner_user_id),
  unique (id, owner_user_id, sanitized_intent_digest),
  check (accepted_at <= created_at + interval '5 minutes')
);

comment on table forge.learning_intents is
  'Append-only, learner-accepted sanitized intent records. Raw learner wording and learner_words are prohibited.';
comment on column forge.learning_intents.intent_summary is
  'Sanitized summary only; never raw learner-authored wording, chat, prompt, or private notes.';
comment on column forge.learning_intents.sanitized_intent_digest is
  'Exact sha256 digest of the canonical sanitized intent payload accepted by the learner.';

create table forge.learning_path_revisions (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  path_id text not null
    check (path_id ~ '^path\.[a-z0-9]+([._-][a-z0-9]+)*$' and char_length(path_id) <= 160),
  revision_id text not null check (
    revision_id ~ '^path-revision\.[a-z0-9]+([._-][a-z0-9]+)*$'
    and char_length(revision_id) <= 180
  ),
  revision_number integer not null check (revision_number > 0),
  expected_previous_revision_number integer not null
    check (expected_previous_revision_number >= 0),
  expected_previous_revision_digest text check (
    expected_previous_revision_digest is null
    or expected_previous_revision_digest ~ '^sha256:[0-9a-f]{64}$'
  ),
  supersedes_revision_id text check (
    supersedes_revision_id is null
    or (
      supersedes_revision_id ~ '^path-revision\.[a-z0-9]+([._-][a-z0-9]+)*$'
      and char_length(supersedes_revision_id) <= 180
    )
  ),
  learning_intent_id bigint not null,
  sanitized_intent_digest text not null
    check (sanitized_intent_digest ~ '^sha256:[0-9a-f]{64}$'),
  learning_goal_id bigint,
  goal_ref_id text not null check (
    goal_ref_id ~ '^goal\.[a-z0-9]+([._-][a-z0-9]+)*$'
    and char_length(goal_ref_id) <= 160
  ),
  schema_version text not null check (schema_version = 'learning-path-revision.v1'),
  plan_kind text not null
    check (plan_kind in ('grounded_learning', 'exploratory_source_plan')),
  revision_status text not null
    check (revision_status in ('candidate', 'accepted', 'rejected', 'superseded')),
  title text not null check (char_length(title) between 1 and 240),
  authority_kind text not null
    check (authority_kind in ('reviewed_world', 'candidate_unverified')),
  world_id text check (
    world_id is null
    or (
      world_id ~ '^world\.[a-z0-9]+([._-][a-z0-9]+)*$'
      and char_length(world_id) <= 160
    )
  ),
  world_version text check (
    world_version is null or char_length(world_version) between 1 and 80
  ),
  world_route text check (
    world_route is null or (
      world_route ~ '^/learn/[a-z0-9]+([/-][a-z0-9]+)*$'
      and char_length(world_route) <= 240
    )
  ),
  activity_protocol text check (
    activity_protocol is null or activity_protocol in ('modelshift', 'activity')
  ),
  world_source_ids text[] not null default '{}'::text[] check (
    cardinality(world_source_ids) <= 64
    and forge_private.continuity_text_array_is_unique(world_source_ids)
    and forge_private.continuity_text_array_matches(
      world_source_ids,
      '^source\.[a-z0-9]+([._-][a-z0-9]+)*$'
    )
  ),
  world_ref_digest text check (
    world_ref_digest is null or world_ref_digest ~ '^sha256:[0-9a-f]{64}$'
  ),
  source_mode text check (
    source_mode is null
    or source_mode in ('authored_only', 'curated', 'guardian_curated', 'open_web')
  ),
  limitation_codes text[] not null default '{}'::text[] check (
    cardinality(limitation_codes) <= 32
    and forge_private.continuity_text_array_is_unique(limitation_codes)
    and forge_private.continuity_text_array_matches(
      limitation_codes,
      '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
    )
  ),
  source_plan_digest text not null check (source_plan_digest ~ '^sha256:[0-9a-f]{64}$'),
  revision_digest text not null check (revision_digest ~ '^sha256:[0-9a-f]{64}$'),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 180),
  execution_allowed boolean not null default false,
  acceptance_decision_id text check (
    acceptance_decision_id is null
    or (
      acceptance_decision_id ~ '^path-decision\.[a-z0-9]+([._-][a-z0-9]+)*$'
      and char_length(acceptance_decision_id) <= 180
    )
  ),
  created_at timestamptz not null default now(),
  unique (owner_user_id, path_id, revision_id),
  unique (owner_user_id, path_id, revision_number),
  unique (owner_user_id, idempotency_key),
  unique (id, owner_user_id),
  unique (id, owner_user_id, revision_digest),
  foreign key (learning_intent_id, owner_user_id, sanitized_intent_digest)
    references forge.learning_intents (id, owner_user_id, sanitized_intent_digest)
    on delete restrict,
  foreign key (learning_goal_id, owner_user_id)
    references forge.learning_goals (id, learner_user_id)
    on delete restrict,
  foreign key (owner_user_id, path_id, supersedes_revision_id)
    references forge.learning_path_revisions (owner_user_id, path_id, revision_id)
    deferrable initially deferred,
  check (
    (
      revision_number = 1
      and expected_previous_revision_number = 0
      and expected_previous_revision_digest is null
      and supersedes_revision_id is null
    )
    or (
      revision_number > 1
      and expected_previous_revision_number = revision_number - 1
      and expected_previous_revision_digest is not null
      and supersedes_revision_id is not null
    )
  ),
  check (
    (
      authority_kind = 'reviewed_world'
      and plan_kind = 'grounded_learning'
      and world_id is not null
      and world_version is not null
      and world_route is not null
      and activity_protocol is not null
      and cardinality(world_source_ids) > 0
      and world_ref_digest is not null
      and source_mode is null
    )
    or (
      authority_kind = 'candidate_unverified'
      and plan_kind = 'exploratory_source_plan'
      and world_id is null
      and world_version is null
      and world_route is null
      and activity_protocol is null
      and cardinality(world_source_ids) = 0
      and world_ref_digest is null
      and source_mode is not null
    )
  ),
  check ((revision_status = 'accepted') = execution_allowed),
  check ((revision_status = 'accepted') = (acceptance_decision_id is not null)),
  check (
    revision_status <> 'accepted'
    or (authority_kind = 'reviewed_world' and plan_kind = 'grounded_learning')
  )
);

comment on table forge.learning_path_revisions is
  'Immutable learning-path history. A candidate is inert; only a separate learner decision may create an executable accepted revision.';
comment on column forge.learning_path_revisions.activity_protocol is
  'Exact registry-owned reviewed-World protocol discriminator; null for exploratory plans.';
comment on column forge.learning_path_revisions.revision_digest is
  'Exact sha256 digest of the canonical revision payload. It is never a model confidence score.';

create table forge.learning_path_nodes (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  path_revision_id bigint not null,
  node_id text not null check (
    node_id ~ '^path-node\.[a-z0-9]+([._-][a-z0-9]+)*$'
    and char_length(node_id) <= 180
  ),
  position integer not null check (position >= 0),
  title text not null check (char_length(title) between 1 and 240),
  objective text not null check (char_length(objective) between 1 and 1200),
  prerequisite_node_ids text[] not null default '{}'::text[] check (
    cardinality(prerequisite_node_ids) <= 32
    and forge_private.continuity_text_array_is_unique(prerequisite_node_ids)
  ),
  authority_kind text not null
    check (authority_kind in ('reviewed_world', 'candidate_unverified', 'identified_gap')),
  activity_id text not null check (
    activity_id ~ '^activity\.[a-z0-9]+([._-][a-z0-9]+)*$'
    and char_length(activity_id) <= 180
  ),
  activity_kind text not null
    check (activity_kind in (
      'modelshift_world',
      'reviewed_world_activity',
      'source_discovery_candidate'
    )),
  runnable boolean not null default false,
  world_id text check (
    world_id is null
    or (
      world_id ~ '^world\.[a-z0-9]+([._-][a-z0-9]+)*$'
      and char_length(world_id) <= 160
    )
  ),
  world_version text check (
    world_version is null or char_length(world_version) between 1 and 80
  ),
  world_route text check (
    world_route is null or (
      world_route ~ '^/learn/[a-z0-9]+([/-][a-z0-9]+)*$'
      and char_length(world_route) <= 240
    )
  ),
  activity_protocol text check (
    activity_protocol is null or activity_protocol in ('modelshift', 'activity')
  ),
  world_ref_digest text check (
    world_ref_digest is null or world_ref_digest ~ '^sha256:[0-9a-f]{64}$'
  ),
  discovery_step_id text check (
    discovery_step_id is null
    or (
      discovery_step_id ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
      and char_length(discovery_step_id) <= 160
    )
  ),
  exit_gate text check (
    exit_gate is null or char_length(exit_gate) between 1 and 1200
  ),
  content_digest text not null check (content_digest ~ '^sha256:[0-9a-f]{64}$'),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 180),
  created_at timestamptz not null default now(),
  unique (path_revision_id, owner_user_id, node_id),
  unique (path_revision_id, owner_user_id, position),
  unique (path_revision_id, owner_user_id, activity_id),
  unique (owner_user_id, idempotency_key),
  unique (id, owner_user_id),
  foreign key (path_revision_id, owner_user_id)
    references forge.learning_path_revisions (id, owner_user_id)
    on delete restrict,
  check (
    (
      authority_kind = 'reviewed_world'
      and (
        (activity_protocol = 'modelshift' and activity_kind = 'modelshift_world')
        or (
          activity_protocol = 'activity'
          and activity_kind = 'reviewed_world_activity'
        )
      )
      and runnable
      and world_id is not null
      and world_version is not null
      and world_route is not null
      and activity_protocol is not null
      and world_ref_digest is not null
      and discovery_step_id is null
      and exit_gate is null
    )
    or (
      authority_kind in ('candidate_unverified', 'identified_gap')
      and activity_kind = 'source_discovery_candidate'
      and not runnable
      and world_id is null
      and world_version is null
      and world_route is null
      and activity_protocol is null
      and world_ref_digest is null
      and discovery_step_id is not null
      and exit_gate is not null
    )
  )
);

comment on table forge.learning_path_nodes is
  'Immutable revision-scoped nodes. Exploratory candidates and identified gaps are structurally non-runnable.';
comment on column forge.learning_path_nodes.activity_protocol is
  'Exact reviewed-revision protocol binding; it must agree with activity_kind and cannot be relabeled per node.';

create table forge.learning_path_decisions (
  id bigint generated always as identity primary key,
  decision_id text not null
    check (
      decision_id ~ '^path-decision\.[a-z0-9]+([._-][a-z0-9]+)*$'
      and char_length(decision_id) <= 180
    ),
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  path_id text not null
    check (path_id ~ '^path\.[a-z0-9]+([._-][a-z0-9]+)*$' and char_length(path_id) <= 160),
  base_path_revision_id bigint not null,
  base_revision_digest text not null check (base_revision_digest ~ '^sha256:[0-9a-f]{64}$'),
  expected_revision_number integer not null check (expected_revision_number > 0),
  schema_version text not null check (schema_version = 'path-decision.v1'),
  decision_kind text not null check (decision_kind in ('accept', 'reject', 'request_revision')),
  decision_digest text not null check (decision_digest ~ '^sha256:[0-9a-f]{64}$'),
  result_revision_id text not null
    check (
      result_revision_id ~ '^path-revision\.[a-z0-9]+([._-][a-z0-9]+)*$'
      and char_length(result_revision_id) <= 180
    ),
  result_revision_number integer not null check (result_revision_number > 1),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 180),
  decided_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, path_id, decision_id),
  unique (owner_user_id, path_id, base_path_revision_id),
  unique (owner_user_id, idempotency_key),
  unique (id, owner_user_id),
  foreign key (base_path_revision_id, owner_user_id, base_revision_digest)
    references forge.learning_path_revisions (id, owner_user_id, revision_digest)
    on delete restrict
    deferrable initially deferred,
  foreign key (owner_user_id, path_id, result_revision_id)
    references forge.learning_path_revisions (owner_user_id, path_id, revision_id)
    on delete restrict
    deferrable initially deferred,
  check (result_revision_number = expected_revision_number + 1),
  check (decided_at <= created_at + interval '5 minutes')
);

comment on table forge.learning_path_decisions is
  'Append-only learner decisions that bind an exact candidate digest and expected revision to one immutable result revision.';

alter table forge.learning_path_revisions
  add constraint learning_path_revisions_acceptance_decision_fkey
  foreign key (owner_user_id, path_id, acceptance_decision_id)
  references forge.learning_path_decisions (owner_user_id, path_id, decision_id)
  on delete restrict
  deferrable initially deferred;

create table forge.learner_activity_states (
  id bigint generated always as identity primary key,
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  path_revision_id bigint not null,
  path_revision_digest text not null check (path_revision_digest ~ '^sha256:[0-9a-f]{64}$'),
  node_id text not null check (
    node_id ~ '^path-node\.[a-z0-9]+([._-][a-z0-9]+)*$'
    and char_length(node_id) <= 180
  ),
  schema_version text not null check (schema_version = 'activity-state.v1'),
  state_version integer not null check (state_version > 0),
  activity_status text not null check (
    activity_status in ('not_started', 'ready', 'in_progress', 'blocked', 'completed')
  ),
  state_digest text not null check (state_digest ~ '^sha256:[0-9a-f]{64}$'),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, path_revision_id, node_id),
  unique (owner_user_id, idempotency_key),
  unique (id, owner_user_id),
  foreign key (path_revision_id, owner_user_id, path_revision_digest)
    references forge.learning_path_revisions (id, owner_user_id, revision_digest)
    on delete restrict,
  foreign key (path_revision_id, owner_user_id, node_id)
    references forge.learning_path_nodes (path_revision_id, owner_user_id, node_id)
    on delete restrict,
  check (updated_at >= created_at)
);

comment on table forge.learner_activity_states is
  'Version-checked mutable projection for runnable accepted nodes; not evidence, mastery, or model authority.';

create table forge.study_sessions (
  id bigint generated always as identity primary key,
  session_id text not null
    check (session_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$'),
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  path_revision_id bigint not null,
  path_revision_digest text not null check (path_revision_digest ~ '^sha256:[0-9a-f]{64}$'),
  node_id text,
  session_version integer not null check (session_version > 0),
  session_status text not null
    check (session_status in ('planned', 'active', 'paused', 'completed', 'abandoned')),
  session_digest text not null check (session_digest ~ '^sha256:[0-9a-f]{64}$'),
  started_at timestamptz,
  ended_at timestamptz,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, session_id),
  unique (owner_user_id, idempotency_key),
  unique (id, owner_user_id),
  foreign key (path_revision_id, owner_user_id, path_revision_digest)
    references forge.learning_path_revisions (id, owner_user_id, revision_digest)
    on delete restrict,
  foreign key (path_revision_id, owner_user_id, node_id)
    references forge.learning_path_nodes (path_revision_id, owner_user_id, node_id)
    on delete restrict,
  check (updated_at >= created_at),
  check (
    (session_status = 'planned' and started_at is null and ended_at is null)
    or (
      session_status in ('active', 'paused')
      and started_at is not null
      and ended_at is null
    )
    or (
      session_status in ('completed', 'abandoned')
      and ended_at is not null
      and (started_at is null or ended_at >= started_at)
    )
  )
);

comment on table forge.study_sessions is
  'Version-checked study-session continuity bound to an accepted path revision; it is not an evidence or surveillance record.';

create table forge.saved_resources (
  id bigint generated always as identity primary key,
  saved_resource_id text not null
    check (saved_resource_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$'),
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  path_revision_id bigint,
  node_id text,
  resource_id text not null check (resource_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$'),
  resource_observation_digest text not null
    check (resource_observation_digest ~ '^sha256:[0-9a-f]{64}$'),
  review_receipt_digest text not null
    check (review_receipt_digest ~ '^sha256:[0-9a-f]{64}$'),
  bookmark_action text not null check (bookmark_action in ('saved', 'removed')),
  bookmark_digest text not null check (bookmark_digest ~ '^sha256:[0-9a-f]{64}$'),
  supersedes_saved_resource_id text check (
    supersedes_saved_resource_id is null
    or supersedes_saved_resource_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$'
  ),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 180),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, saved_resource_id),
  unique (owner_user_id, idempotency_key),
  unique (id, owner_user_id),
  foreign key (path_revision_id, owner_user_id)
    references forge.learning_path_revisions (id, owner_user_id)
    on delete restrict,
  foreign key (path_revision_id, owner_user_id, node_id)
    references forge.learning_path_nodes (path_revision_id, owner_user_id, node_id)
    on delete restrict,
  foreign key (owner_user_id, supersedes_saved_resource_id)
    references forge.saved_resources (owner_user_id, saved_resource_id)
    on delete restrict
    deferrable initially deferred,
  check (
    (bookmark_action = 'saved' and supersedes_saved_resource_id is null)
    or (bookmark_action = 'removed' and supersedes_saved_resource_id is not null)
  ),
  check (recorded_at <= created_at + interval '5 minutes')
);

comment on table forge.saved_resources is
  'Append-only bookmark events for reviewed resource observations. Saving never promotes a resource to instructional authority.';

create table forge.guest_import_receipts (
  id bigint generated always as identity primary key,
  receipt_id text not null check (receipt_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$'),
  owner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  source_export_digest text not null check (source_export_digest ~ '^sha256:[0-9a-f]{64}$'),
  consent_receipt_id text not null
    check (consent_receipt_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,179}$'),
  source_record_count integer not null check (source_record_count between 0 and 10000),
  imported_path_ids text[] not null default '{}'::text[] check (
    cardinality(imported_path_ids) <= 1000
    and forge_private.continuity_text_array_is_unique(imported_path_ids)
  ),
  import_idempotency_key text not null
    check (char_length(import_idempotency_key) between 16 and 180),
  receipt_digest text not null check (receipt_digest ~ '^sha256:[0-9a-f]{64}$'),
  imported_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, receipt_id),
  unique (owner_user_id, import_idempotency_key),
  unique (owner_user_id, source_export_digest),
  unique (id, owner_user_id),
  check (imported_at <= created_at + interval '5 minutes')
);

comment on table forge.guest_import_receipts is
  'Append-only at-most-once receipt for an explicit guest-device import. It stores digests and counts, never raw device payloads.';

create index learning_path_revisions_goal_owner_idx
  on forge.learning_path_revisions (learning_goal_id, owner_user_id)
  where learning_goal_id is not null;
create index learning_path_revisions_intent_owner_digest_idx
  on forge.learning_path_revisions (
    learning_intent_id,
    owner_user_id,
    sanitized_intent_digest
  );
create index learning_path_revisions_supersedes_idx
  on forge.learning_path_revisions (owner_user_id, path_id, supersedes_revision_id)
  where supersedes_revision_id is not null;
create index learning_path_revisions_acceptance_decision_idx
  on forge.learning_path_revisions (owner_user_id, path_id, acceptance_decision_id)
  where acceptance_decision_id is not null;
create index learning_path_nodes_owner_idx
  on forge.learning_path_nodes (owner_user_id);
create index learning_path_decisions_base_idx
  on forge.learning_path_decisions (
    base_path_revision_id,
    owner_user_id,
    base_revision_digest
  );
create index learning_path_decisions_result_idx
  on forge.learning_path_decisions (owner_user_id, path_id, result_revision_id);
create index learner_activity_states_owner_idx
  on forge.learner_activity_states (owner_user_id);
create index learner_activity_states_revision_digest_idx
  on forge.learner_activity_states (
    path_revision_id,
    owner_user_id,
    path_revision_digest
  );
create index learner_activity_states_node_idx
  on forge.learner_activity_states (
    path_revision_id,
    owner_user_id,
    node_id
  );
create index study_sessions_owner_idx
  on forge.study_sessions (owner_user_id);
create index study_sessions_revision_digest_idx
  on forge.study_sessions (
    path_revision_id,
    owner_user_id,
    path_revision_digest
  );
create index study_sessions_node_idx
  on forge.study_sessions (path_revision_id, owner_user_id, node_id)
  where node_id is not null;
create index saved_resources_owner_idx
  on forge.saved_resources (owner_user_id);
create index saved_resources_revision_idx
  on forge.saved_resources (path_revision_id, owner_user_id)
  where path_revision_id is not null;
create index saved_resources_node_idx
  on forge.saved_resources (path_revision_id, owner_user_id, node_id)
  where path_revision_id is not null and node_id is not null;
create index saved_resources_supersedes_idx
  on forge.saved_resources (owner_user_id, supersedes_saved_resource_id)
  where supersedes_saved_resource_id is not null;

create or replace function forge_private.enforce_continuity_active_adult_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not forge_private.is_active_adult_owner(new.owner_user_id) then
    raise exception 'continuity cloud persistence requires an active adult owner'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function forge_private.reject_continuity_immutable_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name
    using errcode = '55000';
end;
$$;

create or replace function forge_private.validate_learning_path_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base forge.learning_path_revisions%rowtype;
  v_latest_revision_number integer;
begin
  select revision.*
  into v_base
  from forge.learning_path_revisions as revision
  where revision.id = new.base_path_revision_id
    and revision.owner_user_id = new.owner_user_id
  for update;

  if not found
    or v_base.path_id <> new.path_id
    or v_base.revision_digest <> new.base_revision_digest
    or v_base.revision_number <> new.expected_revision_number then
    raise exception 'decision does not bind the exact expected path revision'
      using errcode = '40001';
  end if;

  select max(revision.revision_number)
  into v_latest_revision_number
  from forge.learning_path_revisions as revision
  where revision.owner_user_id = new.owner_user_id
    and revision.path_id = new.path_id;

  if v_latest_revision_number <> new.expected_revision_number
    or v_base.revision_status <> 'candidate'
    or v_base.execution_allowed then
    raise exception 'decision base is stale or no longer an inert candidate'
      using errcode = '40001';
  end if;

  if new.decision_kind = 'accept'
    and (
      v_base.authority_kind <> 'reviewed_world'
      or v_base.plan_kind <> 'grounded_learning'
    ) then
    raise exception 'only a reviewed grounded candidate may be accepted'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function forge_private.validate_learning_path_revision_append()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous forge.learning_path_revisions%rowtype;
  v_decision forge.learning_path_decisions%rowtype;
  v_result_status text;
begin
  if new.revision_number = 1 then
    if exists (
      select 1
      from forge.learning_path_revisions as revision
      where revision.owner_user_id = new.owner_user_id
        and revision.path_id = new.path_id
    ) then
      raise exception 'initial path revision already exists'
        using errcode = '40001';
    end if;

    if new.revision_status <> 'candidate'
      or new.execution_allowed
      or new.acceptance_decision_id is not null then
      raise exception 'an initial path revision must be an inert candidate'
        using errcode = '23514';
    end if;
    return new;
  end if;

  select revision.*
  into v_previous
  from forge.learning_path_revisions as revision
  where revision.owner_user_id = new.owner_user_id
    and revision.path_id = new.path_id
  order by revision.revision_number desc
  limit 1
  for update;

  if not found
    or v_previous.revision_number <> new.expected_previous_revision_number
    or v_previous.revision_number + 1 <> new.revision_number
    or v_previous.revision_id <> new.supersedes_revision_id
    or v_previous.revision_digest <> new.expected_previous_revision_digest then
    raise exception 'path revision append failed expected-revision check'
      using errcode = '40001';
  end if;

  select decision.*
  into v_decision
  from forge.learning_path_decisions as decision
  where decision.owner_user_id = new.owner_user_id
    and decision.path_id = new.path_id
    and decision.base_path_revision_id = v_previous.id
    and decision.result_revision_id = new.revision_id;

  if not found
    or v_decision.expected_revision_number <> v_previous.revision_number
    or v_decision.base_revision_digest <> v_previous.revision_digest
    or v_decision.result_revision_number <> new.revision_number then
    raise exception 'result revision is not bound to an exact learner decision'
      using errcode = '23514';
  end if;

  v_result_status := case v_decision.decision_kind
    when 'accept' then 'accepted'
    when 'reject' then 'rejected'
    when 'request_revision' then 'superseded'
  end;

  if new.revision_status <> v_result_status
    or (
      v_decision.decision_kind = 'accept'
      and new.acceptance_decision_id <> v_decision.decision_id
    )
    or (
      v_decision.decision_kind <> 'accept'
      and new.acceptance_decision_id is not null
    ) then
    raise exception 'result revision status does not match learner decision'
      using errcode = '23514';
  end if;

  if new.learning_intent_id <> v_previous.learning_intent_id
    or new.sanitized_intent_digest <> v_previous.sanitized_intent_digest
    or new.learning_goal_id is distinct from v_previous.learning_goal_id
    or new.goal_ref_id <> v_previous.goal_ref_id
    or new.schema_version <> v_previous.schema_version
    or new.plan_kind <> v_previous.plan_kind
    or new.title <> v_previous.title
    or new.authority_kind <> v_previous.authority_kind
    or new.world_id is distinct from v_previous.world_id
    or new.world_version is distinct from v_previous.world_version
    or new.world_route is distinct from v_previous.world_route
    or new.activity_protocol is distinct from v_previous.activity_protocol
    or new.world_source_ids is distinct from v_previous.world_source_ids
    or new.world_ref_digest is distinct from v_previous.world_ref_digest
    or new.source_mode is distinct from v_previous.source_mode
    or new.limitation_codes is distinct from v_previous.limitation_codes
    or new.source_plan_digest <> v_previous.source_plan_digest then
    raise exception 'decision result may not rewrite candidate content'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function forge_private.validate_learning_path_node()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision forge.learning_path_revisions%rowtype;
  v_expected_position integer;
  v_prerequisite text;
begin
  select revision.*
  into v_revision
  from forge.learning_path_revisions as revision
  where revision.id = new.path_revision_id
    and revision.owner_user_id = new.owner_user_id;

  if not found then
    raise exception 'path node revision does not exist'
      using errcode = '23503';
  end if;

  if v_revision.authority_kind = 'reviewed_world' then
    if new.authority_kind <> 'reviewed_world'
      or new.world_id <> v_revision.world_id
      or new.world_version <> v_revision.world_version
      or new.world_route <> v_revision.world_route
      or new.activity_protocol <> v_revision.activity_protocol
      or new.world_ref_digest <> v_revision.world_ref_digest
      or new.position <> 0
      or cardinality(new.prerequisite_node_ids) <> 0 then
      raise exception 'grounded revision must bind one position-zero reviewed World activity'
        using errcode = '23514';
    end if;
  elsif new.authority_kind not in ('candidate_unverified', 'identified_gap') then
    raise exception 'exploratory revision nodes must remain non-runnable candidates'
      using errcode = '23514';
  end if;

  select count(*)::integer
  into v_expected_position
  from forge.learning_path_nodes as node
  where node.path_revision_id = new.path_revision_id
    and node.owner_user_id = new.owner_user_id;

  if new.position <> v_expected_position then
    raise exception 'path nodes must append in deterministic position order'
      using errcode = '23514';
  end if;

  foreach v_prerequisite in array new.prerequisite_node_ids
  loop
    if not exists (
      select 1
      from forge.learning_path_nodes as node
      where node.path_revision_id = new.path_revision_id
        and node.owner_user_id = new.owner_user_id
        and node.node_id = v_prerequisite
        and node.position < new.position
    ) then
      raise exception 'path node prerequisite must reference an earlier node'
        using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

create or replace function forge_private.validate_grounded_revision_shape()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_node_count integer;
begin
  if new.authority_kind = 'reviewed_world' then
    select count(*)::integer
    into v_node_count
    from forge.learning_path_nodes as node
    where node.path_revision_id = new.id
      and node.owner_user_id = new.owner_user_id
      and node.authority_kind = 'reviewed_world'
      and (
        (
          node.activity_protocol = 'modelshift'
          and node.activity_kind = 'modelshift_world'
        )
        or (
          node.activity_protocol = 'activity'
          and node.activity_kind = 'reviewed_world_activity'
        )
      )
      and node.runnable;

    if v_node_count <> 1 then
      raise exception 'grounded reviewed revision must contain exactly one runnable protocol-bound World activity'
        using errcode = '23514';
    end if;
  end if;

  return null;
end;
$$;

create or replace function forge_private.validate_learner_activity_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision_status text;
  v_execution_allowed boolean;
  v_node_runnable boolean;
begin
  if tg_op = 'INSERT' then
    select revision.revision_status, revision.execution_allowed, node.runnable
    into v_revision_status, v_execution_allowed, v_node_runnable
    from forge.learning_path_revisions as revision
    join forge.learning_path_nodes as node
      on node.path_revision_id = revision.id
      and node.owner_user_id = revision.owner_user_id
    where revision.id = new.path_revision_id
      and revision.owner_user_id = new.owner_user_id
      and revision.revision_digest = new.path_revision_digest
      and node.node_id = new.node_id;

    if not found
      or v_revision_status <> 'accepted'
      or not v_execution_allowed
      or not v_node_runnable
      or new.state_version <> 1
      or new.activity_status not in ('not_started', 'ready') then
      raise exception 'activity state requires a runnable accepted node and version one'
        using errcode = '23514';
    end if;
    new.updated_at := greatest(clock_timestamp(), new.created_at);
    return new;
  end if;

  if new.owner_user_id <> old.owner_user_id
    or new.path_revision_id <> old.path_revision_id
    or new.path_revision_digest <> old.path_revision_digest
    or new.node_id <> old.node_id
    or new.schema_version <> old.schema_version
    or new.created_at <> old.created_at
    or new.state_version <> old.state_version + 1
    or new.state_digest = old.state_digest
    or new.idempotency_key = old.idempotency_key then
    raise exception 'activity-state update failed immutable-field or expected-version check'
      using errcode = '40001';
  end if;

  if not (
    (old.activity_status = 'not_started' and new.activity_status = 'ready')
    or (old.activity_status = 'ready' and new.activity_status in ('in_progress', 'blocked'))
    or (old.activity_status = 'in_progress' and new.activity_status in ('completed', 'blocked'))
  ) then
    raise exception 'activity-state transition is not allowed'
      using errcode = '23514';
  end if;

  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

create or replace function forge_private.validate_study_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision_status text;
  v_execution_allowed boolean;
  v_node_runnable boolean;
begin
  if tg_op = 'INSERT' then
    select revision.revision_status, revision.execution_allowed
    into v_revision_status, v_execution_allowed
    from forge.learning_path_revisions as revision
    where revision.id = new.path_revision_id
      and revision.owner_user_id = new.owner_user_id
      and revision.revision_digest = new.path_revision_digest;

    if not found
      or v_revision_status <> 'accepted'
      or not v_execution_allowed
      or new.session_version <> 1 then
      raise exception 'study session requires an accepted executable revision and version one'
        using errcode = '23514';
    end if;

    if new.node_id is not null then
      select node.runnable
      into v_node_runnable
      from forge.learning_path_nodes as node
      where node.path_revision_id = new.path_revision_id
        and node.owner_user_id = new.owner_user_id
        and node.node_id = new.node_id;

      if not found or not v_node_runnable then
        raise exception 'study session node must be runnable'
        using errcode = '23514';
      end if;
    end if;
    new.updated_at := greatest(clock_timestamp(), new.created_at);
    return new;
  end if;

  if new.owner_user_id <> old.owner_user_id
    or new.session_id <> old.session_id
    or new.path_revision_id <> old.path_revision_id
    or new.path_revision_digest <> old.path_revision_digest
    or new.node_id is distinct from old.node_id
    or new.created_at <> old.created_at
    or new.session_version <> old.session_version + 1
    or new.session_digest = old.session_digest
    or new.idempotency_key = old.idempotency_key then
    raise exception 'study-session update failed immutable-field or expected-version check'
      using errcode = '40001';
  end if;

  if not (
    (old.session_status = 'planned' and new.session_status in ('active', 'abandoned'))
    or (old.session_status = 'active' and new.session_status in ('paused', 'completed', 'abandoned'))
    or (old.session_status = 'paused' and new.session_status in ('active', 'abandoned'))
  ) then
    raise exception 'study-session transition is not allowed'
      using errcode = '23514';
  end if;

  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

do $$
declare
  v_table regclass;
begin
  foreach v_table in array array[
    'forge.learning_intents'::regclass,
    'forge.learning_path_revisions'::regclass,
    'forge.learning_path_nodes'::regclass,
    'forge.learning_path_decisions'::regclass,
    'forge.learner_activity_states'::regclass,
    'forge.study_sessions'::regclass,
    'forge.saved_resources'::regclass,
    'forge.guest_import_receipts'::regclass
  ]
  loop
    execute format(
      'create trigger continuity_00_active_adult_owner before insert or update on %s for each row execute function forge_private.enforce_continuity_active_adult_owner()',
      v_table
    );
  end loop;
end;
$$;

create trigger continuity_10_validate_revision_append
before insert on forge.learning_path_revisions
for each row execute function forge_private.validate_learning_path_revision_append();

create constraint trigger continuity_80_grounded_revision_shape
after insert on forge.learning_path_revisions
deferrable initially deferred
for each row execute function forge_private.validate_grounded_revision_shape();

create trigger continuity_10_validate_node
before insert on forge.learning_path_nodes
for each row execute function forge_private.validate_learning_path_node();

create trigger continuity_10_validate_decision
before insert on forge.learning_path_decisions
for each row execute function forge_private.validate_learning_path_decision();

create trigger continuity_10_validate_activity_state
before insert or update on forge.learner_activity_states
for each row execute function forge_private.validate_learner_activity_state();

create trigger continuity_10_validate_study_session
before insert or update on forge.study_sessions
for each row execute function forge_private.validate_study_session();

do $$
declare
  v_table regclass;
begin
  foreach v_table in array array[
    'forge.learning_intents'::regclass,
    'forge.learning_path_revisions'::regclass,
    'forge.learning_path_nodes'::regclass,
    'forge.learning_path_decisions'::regclass,
    'forge.saved_resources'::regclass,
    'forge.guest_import_receipts'::regclass
  ]
  loop
    execute format(
      'create trigger continuity_90_append_only before update or delete on %s for each row execute function forge_private.reject_continuity_immutable_mutation()',
      v_table
    );
    execute format(
      'create trigger continuity_90_no_truncate before truncate on %s for each statement execute function forge_private.reject_continuity_immutable_mutation()',
      v_table
    );
  end loop;
end;
$$;

create trigger continuity_90_activity_no_delete
before delete on forge.learner_activity_states
for each row execute function forge_private.reject_continuity_immutable_mutation();
create trigger continuity_90_activity_no_truncate
before truncate on forge.learner_activity_states
for each statement execute function forge_private.reject_continuity_immutable_mutation();
create trigger continuity_90_session_no_delete
before delete on forge.study_sessions
for each row execute function forge_private.reject_continuity_immutable_mutation();
create trigger continuity_90_session_no_truncate
before truncate on forge.study_sessions
for each statement execute function forge_private.reject_continuity_immutable_mutation();

alter table forge.learning_intents enable row level security;
alter table forge.learning_intents force row level security;
alter table forge.learning_path_revisions enable row level security;
alter table forge.learning_path_revisions force row level security;
alter table forge.learning_path_nodes enable row level security;
alter table forge.learning_path_nodes force row level security;
alter table forge.learning_path_decisions enable row level security;
alter table forge.learning_path_decisions force row level security;
alter table forge.learner_activity_states enable row level security;
alter table forge.learner_activity_states force row level security;
alter table forge.study_sessions enable row level security;
alter table forge.study_sessions force row level security;
alter table forge.saved_resources enable row level security;
alter table forge.saved_resources force row level security;
alter table forge.guest_import_receipts enable row level security;
alter table forge.guest_import_receipts force row level security;

create policy learning_intents_select_owner on forge.learning_intents
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select forge_private.is_active_adult_owner(owner_user_id))
);
create policy learning_path_revisions_select_owner on forge.learning_path_revisions
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select forge_private.is_active_adult_owner(owner_user_id))
);
create policy learning_path_nodes_select_owner on forge.learning_path_nodes
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select forge_private.is_active_adult_owner(owner_user_id))
);
create policy learning_path_decisions_select_owner on forge.learning_path_decisions
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select forge_private.is_active_adult_owner(owner_user_id))
);
create policy learner_activity_states_select_owner on forge.learner_activity_states
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select forge_private.is_active_adult_owner(owner_user_id))
);
create policy study_sessions_select_owner on forge.study_sessions
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select forge_private.is_active_adult_owner(owner_user_id))
);
create policy saved_resources_select_owner on forge.saved_resources
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select forge_private.is_active_adult_owner(owner_user_id))
);
create policy guest_import_receipts_select_owner on forge.guest_import_receipts
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and (select forge_private.is_active_adult_owner(owner_user_id))
);

revoke all on table
  forge.learning_intents,
  forge.learning_path_revisions,
  forge.learning_path_nodes,
  forge.learning_path_decisions,
  forge.learner_activity_states,
  forge.study_sessions,
  forge.saved_resources,
  forge.guest_import_receipts
from public, anon, authenticated, service_role;

grant select on table
  forge.learning_intents,
  forge.learning_path_revisions,
  forge.learning_path_nodes,
  forge.learning_path_decisions,
  forge.learner_activity_states,
  forge.study_sessions,
  forge.saved_resources,
  forge.guest_import_receipts
to authenticated;

grant select, insert on table
  forge.learning_intents,
  forge.learning_path_revisions,
  forge.learning_path_nodes,
  forge.learning_path_decisions,
  forge.saved_resources,
  forge.guest_import_receipts
to service_role;
grant select, insert, update on table
  forge.learner_activity_states,
  forge.study_sessions
to service_role;

grant usage, select on sequence
  forge.learning_intents_id_seq,
  forge.learning_path_revisions_id_seq,
  forge.learning_path_nodes_id_seq,
  forge.learning_path_decisions_id_seq,
  forge.learner_activity_states_id_seq,
  forge.study_sessions_id_seq,
  forge.saved_resources_id_seq,
  forge.guest_import_receipts_id_seq
to service_role;

revoke all on function
  forge_private.continuity_text_array_is_unique(text[]),
  forge_private.continuity_text_array_matches(text[], text),
  forge_private.enforce_continuity_active_adult_owner(),
  forge_private.reject_continuity_immutable_mutation(),
  forge_private.validate_learning_path_decision(),
  forge_private.validate_learning_path_revision_append(),
  forge_private.validate_learning_path_node(),
  forge_private.validate_grounded_revision_shape(),
  forge_private.validate_learner_activity_state(),
  forge_private.validate_study_session()
from public, anon, authenticated, service_role;
grant execute on function forge_private.continuity_text_array_is_unique(text[])
to service_role;
grant execute on function forge_private.continuity_text_array_matches(text[], text)
to service_role;

commit;
