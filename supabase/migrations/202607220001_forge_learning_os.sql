-- FORGE learning operating system: durable identity, curriculum, evidence, and access controls.
-- This migration intentionally stores structured learning evidence, not raw chat transcripts,
-- inferred personality, emotional state, advertising identifiers, or precise location.

begin;

create schema if not exists forge;
create schema if not exists forge_private;

comment on schema forge is
  'Versioned curriculum, learner-owned plans, and evidence records for FORGE.';
comment on schema forge_private is
  'Non-exposed RLS and integrity helpers for FORGE.';

revoke all on schema forge from public, anon, authenticated;
revoke all on schema forge_private from public, anon, authenticated;
grant usage on schema forge to authenticated, service_role;
grant usage on schema forge_private to authenticated, service_role;

alter default privileges in schema forge revoke all on tables from public, anon, authenticated;
alter default privileges in schema forge revoke all on sequences from public, anon, authenticated;
alter default privileges in schema forge_private revoke execute on functions from public, anon, authenticated;

create or replace function forge_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function forge_private.reject_learner_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.learner_user_id is distinct from old.learner_user_id then
    raise exception 'learner ownership cannot be reassigned';
  end if;
  return new;
end;
$$;

create table forge.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  account_status text not null default 'active'
    check (account_status in ('active', 'restricted', 'deletion_pending', 'closed')),
  locale text not null default 'en',
  time_zone text not null default 'UTC',
  accessibility_preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(accessibility_preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table forge.profiles is
  'Minimal account profile. Email and identity verification remain in Supabase Auth.';

create table forge.learner_profiles (
  user_id uuid primary key references forge.profiles (user_id) on delete cascade,
  age_band text not null
    check (age_band in ('6_8', '9_12', '13_15', '16_17', 'adult')),
  learning_context text not null default 'self_directed'
    check (learning_context in (
      'self_directed', 'home_education', 'school_supplement',
      'higher_education', 'professional', 'community'
    )),
  onboarding_status text not null default 'pending'
    check (onboarding_status in ('pending', 'active', 'paused', 'closed')),
  preferred_languages text[] not null default array['en']::text[]
    check (cardinality(preferred_languages) between 1 and 8),
  access_needs jsonb not null default '{}'::jsonb
    check (jsonb_typeof(access_needs) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table forge.learner_profiles is
  'Age-banded learner settings without birth dates, personality labels, or emotion inference.';

create table forge.profile_roles (
  id bigint generated always as identity primary key,
  user_id uuid not null references forge.profiles (user_id) on delete cascade,
  role_key text not null
    check (role_key in ('learner', 'guardian', 'educator', 'mentor', 'reviewer', 'content_author')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'revoked')),
  verified_at timestamptz,
  revoked_at timestamptz,
  granted_by_user_id uuid references forge.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role_key),
  check (verification_status <> 'verified' or verified_at is not null),
  check (verification_status <> 'revoked' or revoked_at is not null),
  check (revoked_at is null or verified_at is null or revoked_at >= verified_at)
);

create table forge.guardian_relationships (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  guardian_user_id uuid not null references forge.profiles (user_id) on delete cascade,
  relationship_label text not null check (char_length(relationship_label) between 1 and 80),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'declined', 'revoked')),
  created_by_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  verified_by_user_id uuid references forge.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  ended_at timestamptz,
  unique (learner_user_id, guardian_user_id),
  check (learner_user_id <> guardian_user_id),
  check (activated_at is null or activated_at >= created_at),
  check (ended_at is null or ended_at >= created_at),
  check (status <> 'active' or (
    activated_at is not null
    and ended_at is null
    and verified_by_user_id is not null
  )),
  check (status not in ('declined', 'revoked') or ended_at is not null)
);

comment on table forge.guardian_relationships is
  'Verified relationship context only; this table never grants data access by itself.';

create table forge.consent_records (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete restrict,
  purpose_key text not null
    check (purpose_key in (
      'learning_service', 'guardian_access', 'research',
      'sensitive_artifact_capture', 'model_improvement'
    )),
  decision text not null check (decision in ('granted', 'denied', 'withdrawn')),
  actor_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  actor_capacity text not null
    check (actor_capacity in ('learner', 'guardian', 'legal_representative')),
  policy_version text not null check (char_length(policy_version) between 1 and 80),
  jurisdiction text,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  supersedes_id bigint,
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (id, learner_user_id),
  unique (id, learner_user_id, purpose_key),
  foreign key (supersedes_id, learner_user_id, purpose_key)
    references forge.consent_records (id, learner_user_id, purpose_key) on delete restrict,
  check (decision <> 'withdrawn' or supersedes_id is not null),
  check (expires_at is null or expires_at > effective_at)
);

comment on table forge.consent_records is
  'Append-only consent decisions. Current consent is the latest effective row per purpose.';

create table forge.source_packages (
  id bigint generated always as identity primary key,
  package_key text not null check (package_key ~ '^[a-z0-9][a-z0-9._-]*$'),
  version integer not null check (version > 0),
  title text not null check (char_length(title) between 1 and 240),
  summary text not null check (char_length(summary) between 1 and 2000),
  discipline text not null check (char_length(discipline) between 1 and 120),
  minimum_age smallint check (minimum_age between 3 and 120),
  maximum_age smallint check (maximum_age between 3 and 120),
  license_spdx text,
  content_checksum text not null check (content_checksum ~ '^[0-9a-f]{64}$'),
  minor_safe_reviewed boolean not null default false,
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'review', 'published', 'withdrawn')),
  created_by_user_id uuid references forge.profiles (user_id) on delete set null,
  reviewed_by_user_id uuid references forge.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  withdrawn_at timestamptz,
  unique (package_key, version),
  check (maximum_age is null or minimum_age is null or maximum_age >= minimum_age),
  check (publication_status <> 'published' or (published_at is not null and reviewed_by_user_id is not null)),
  check (publication_status <> 'withdrawn' or withdrawn_at is not null)
);

create table forge.source_items (
  id bigint generated always as identity primary key,
  source_package_id bigint not null references forge.source_packages (id) on delete cascade,
  item_key text not null check (item_key ~ '^[a-z0-9][a-z0-9._-]*$'),
  source_kind text not null
    check (source_kind in (
      'primary', 'institutional', 'peer_reviewed', 'reference',
      'open_educational_resource', 'expert_authored'
    )),
  title text not null check (char_length(title) between 1 and 500),
  publisher text,
  canonical_url text,
  publication_date date,
  retrieved_at timestamptz,
  version_label text,
  license_text text,
  content_checksum text check (content_checksum is null or content_checksum ~ '^[0-9a-f]{64}$'),
  object_storage_path text,
  citation_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(citation_metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (source_package_id, item_key),
  check (canonical_url is not null or object_storage_path is not null),
  check (canonical_url is null or canonical_url ~ '^https://')
);

create table forge.source_claims (
  id bigint generated always as identity primary key,
  source_item_id bigint not null references forge.source_items (id) on delete cascade,
  claim_key text not null check (claim_key ~ '^[a-z0-9][a-z0-9._-]*$'),
  claim_text text not null check (char_length(claim_text) between 1 and 4000),
  support_status text not null
    check (support_status in ('supported', 'qualified', 'contested', 'background_only')),
  citation_locator text,
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (source_item_id, claim_key)
);

create table forge.capability_definitions (
  id bigint generated always as identity primary key,
  capability_key text not null unique check (capability_key ~ '^[a-z0-9][a-z0-9._-]*$'),
  discipline text not null check (char_length(discipline) between 1 and 120),
  concept_family text not null check (char_length(concept_family) between 1 and 160),
  title text not null check (char_length(title) between 1 and 240),
  description text not null check (char_length(description) between 1 and 4000),
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'active', 'retired')),
  created_by_user_id uuid references forge.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table forge.capability_contracts (
  id bigint generated always as identity primary key,
  capability_id bigint not null references forge.capability_definitions (id) on delete restrict,
  source_package_id bigint not null references forge.source_packages (id) on delete restrict,
  contract_version integer not null check (contract_version > 0),
  capability_claim text not null check (char_length(capability_claim) between 1 and 2000),
  specified_conditions jsonb not null check (jsonb_typeof(specified_conditions) = 'object'),
  meaningful_action text not null check (char_length(meaningful_action) between 1 and 2000),
  required_representations text[] not null check (cardinality(required_representations) > 0),
  assistance_policy jsonb not null check (jsonb_typeof(assistance_policy) = 'object'),
  transfer_specification jsonb not null check (jsonb_typeof(transfer_specification) = 'object'),
  evidence_requirements jsonb not null check (jsonb_typeof(evidence_requirements) = 'object'),
  validator_contract jsonb not null check (jsonb_typeof(validator_contract) = 'object'),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'review', 'published', 'withdrawn')),
  authored_by_user_id uuid references forge.profiles (user_id) on delete set null,
  reviewed_by_user_id uuid references forge.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (capability_id, contract_version),
  check (publication_status <> 'published' or (published_at is not null and reviewed_by_user_id is not null))
);

create table forge.learning_world_releases (
  id bigint generated always as identity primary key,
  world_key text not null check (world_key ~ '^[a-z0-9][a-z0-9._-]*$'),
  release_version integer not null check (release_version > 0),
  capability_contract_id bigint not null references forge.capability_contracts (id) on delete restrict,
  deterministic_bundle_checksum text not null
    check (deterministic_bundle_checksum ~ '^[0-9a-f]{64}$'),
  validator_version text not null check (char_length(validator_version) between 1 and 120),
  fixture_version text not null check (char_length(fixture_version) between 1 and 120),
  accessibility_alternatives jsonb not null
    check (jsonb_typeof(accessibility_alternatives) = 'object'),
  release_status text not null default 'draft'
    check (release_status in ('draft', 'review', 'published', 'disabled', 'retired')),
  reviewed_by_user_id uuid references forge.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (world_key, release_version),
  unique (id, capability_contract_id),
  check (release_status <> 'published' or (published_at is not null and reviewed_by_user_id is not null))
);

create table forge.learning_programs (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  program_kind text not null
    check (program_kind in (
      'self_directed', 'home_education', 'supplemental',
      'institutional', 'professional', 'community'
    )),
  title text not null check (char_length(title) between 1 and 240),
  purpose_statement text not null check (char_length(purpose_statement) between 1 and 4000),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  start_on date,
  target_end_on date,
  created_by_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, learner_user_id),
  check (target_end_on is null or start_on is null or target_end_on >= start_on)
);

create table forge.program_capability_assignments (
  id bigint generated always as identity primary key,
  program_id bigint not null,
  learner_user_id uuid not null,
  capability_contract_id bigint not null references forge.capability_contracts (id) on delete restrict,
  priority smallint not null default 3 check (priority between 1 and 5),
  assignment_status text not null default 'planned'
    check (assignment_status in ('planned', 'active', 'paused', 'satisfied', 'retired')),
  rationale text,
  created_by_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (program_id, learner_user_id)
    references forge.learning_programs (id, learner_user_id) on delete cascade,
  unique (program_id, capability_contract_id),
  unique (id, learner_user_id)
);

create table forge.learning_goals (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  program_id bigint,
  parent_goal_id bigint,
  capability_contract_id bigint references forge.capability_contracts (id) on delete restrict,
  goal_statement text not null check (char_length(goal_statement) between 1 and 2000),
  success_evidence text not null check (char_length(success_evidence) between 1 and 3000),
  status text not null default 'planned'
    check (status in ('planned', 'active', 'blocked', 'satisfied', 'retired')),
  target_date date,
  created_by_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (program_id, learner_user_id)
    references forge.learning_programs (id, learner_user_id) on delete cascade,
  foreign key (parent_goal_id, learner_user_id)
    references forge.learning_goals (id, learner_user_id) on delete cascade,
  unique (id, learner_user_id)
);

create table forge.learner_capability_states (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  capability_contract_id bigint not null references forge.capability_contracts (id) on delete restrict,
  concept_availability text not null default 'unknown'
    check (concept_availability in ('unknown', 'fragile', 'available')),
  procedural_execution text not null default 'unknown'
    check (procedural_execution in ('unknown', 'supported', 'independent')),
  representation_coordination text not null default 'unknown'
    check (representation_coordination in ('unknown', 'single', 'coordinated')),
  misconception_competition text not null default 'unknown'
    check (misconception_competition in ('unknown', 'active', 'weakened', 'not_observed')),
  transfer_breadth text not null default 'untested'
    check (transfer_breadth in ('untested', 'near', 'varied')),
  retrieval_strength text not null default 'untested'
    check (retrieval_strength in ('untested', 'immediate', 'delayed_once', 'delayed_repeated')),
  epistemic_stance text not null default 'unobserved'
    check (epistemic_stance in ('unobserved', 'overconfident', 'calibrating', 'calibrated')),
  assistance_profile jsonb not null default '{}'::jsonb
    check (jsonb_typeof(assistance_profile) = 'object'),
  confidence_low numeric(4,3) check (confidence_low between 0 and 1),
  confidence_high numeric(4,3) check (confidence_high between 0 and 1),
  evidence_event_count integer not null default 0 check (evidence_event_count >= 0),
  last_evidence_at timestamptz,
  next_proof_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (learner_user_id, capability_contract_id),
  check (confidence_low is null or confidence_high is null or confidence_high >= confidence_low)
);

comment on table forge.learner_capability_states is
  'A rebuildable multidimensional projection; never an authoritative mastery percentage.';

create table forge.learner_access_grants (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  grantee_user_id uuid not null references forge.profiles (user_id) on delete cascade,
  grantee_role text not null check (grantee_role in ('guardian', 'educator', 'mentor')),
  scope_key text not null
    check (scope_key in (
      'profile:read', 'consent:manage',
      'program:read', 'program:manage',
      'goals:read', 'goals:manage',
      'capability:read', 'session:read',
      'evidence:read', 'assistance:read',
      'proof:read', 'proof:manage',
      'questions:read', 'questions:mentor',
      'artifacts:read', 'artifacts:contribute',
      'reviews:create', 'privacy:assist'
    )),
  program_id bigint,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  issued_by_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  issuance_reason text not null check (char_length(issuance_reason) between 1 and 1000),
  created_at timestamptz not null default now(),
  foreign key (program_id, learner_user_id)
    references forge.learning_programs (id, learner_user_id) on delete cascade,
  unique (id, learner_user_id),
  check (learner_user_id <> grantee_user_id),
  check (valid_until is null or valid_until > valid_from)
);

create table forge.access_grant_revocations (
  id bigint generated always as identity primary key,
  grant_id bigint not null unique,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  revoked_by_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  reason text not null check (char_length(reason) between 1 and 1000),
  revoked_at timestamptz not null default now(),
  foreign key (grant_id, learner_user_id)
    references forge.learner_access_grants (id, learner_user_id) on delete cascade
);

comment on table forge.learner_access_grants is
  'Append-only, visible, scope-specific access. Relationships alone never authorize access.';

create table forge.learning_session_runs (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  program_id bigint,
  goal_id bigint,
  capability_contract_id bigint not null references forge.capability_contracts (id) on delete restrict,
  world_release_id bigint not null,
  run_status text not null default 'created'
    check (run_status in ('created', 'active', 'awaiting_return', 'completed', 'abandoned', 'invalidated')),
  entry_mode text not null
    check (entry_mode in ('challenge', 'scheduled_proof', 'reality_return', 'project')),
  policy_bundle_version text not null check (char_length(policy_bundle_version) between 1 and 120),
  client_build_version text not null check (char_length(client_build_version) between 1 and 120),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 160),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (program_id, learner_user_id)
    references forge.learning_programs (id, learner_user_id) on delete set null (program_id),
  foreign key (goal_id, learner_user_id)
    references forge.learning_goals (id, learner_user_id) on delete set null (goal_id),
  foreign key (world_release_id, capability_contract_id)
    references forge.learning_world_releases (id, capability_contract_id) on delete restrict,
  unique (learner_user_id, idempotency_key),
  unique (id, learner_user_id),
  unique (id, learner_user_id, capability_contract_id),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table forge.learner_artifacts (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  session_run_id bigint,
  artifact_kind text not null
    check (artifact_kind in (
      'prediction', 'explanation', 'reconstruction', 'transfer_response',
      'reality_observation', 'project', 'question_note', 'reflection'
    )),
  capture_modality text not null
    check (capture_modality in ('typed', 'drawn', 'uploaded', 'recorded', 'imported')),
  text_content text,
  object_storage_bucket text,
  object_storage_path text,
  media_type text,
  content_checksum text check (content_checksum is null or content_checksum ~ '^[0-9a-f]{64}$'),
  sensitive_media boolean not null default false,
  consent_record_id bigint,
  retention_class text not null default 'learning_record'
    check (retention_class in ('session_transient', 'learning_record', 'portfolio', 'legal_hold')),
  created_by_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_run_id, learner_user_id)
    references forge.learning_session_runs (id, learner_user_id) on delete cascade,
  foreign key (consent_record_id, learner_user_id)
    references forge.consent_records (id, learner_user_id) on delete restrict,
  unique (id, learner_user_id),
  unique (id, learner_user_id, session_run_id),
  check (text_content is not null or (object_storage_bucket is not null and object_storage_path is not null)),
  check ((object_storage_bucket is null) = (object_storage_path is null)),
  check (not sensitive_media or consent_record_id is not null)
);

create table forge.policy_decisions (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  session_run_id bigint not null,
  sequence_no integer not null check (sequence_no > 0),
  decision_kind text not null
    check (decision_kind in (
      'assistance_gate', 'proof_gate', 'content_gate',
      'source_gate', 'safety_gate', 'human_review_route'
    )),
  outcome text not null check (outcome in ('allowed', 'blocked', 'limited', 'routed')),
  reason_codes text[] not null check (cardinality(reason_codes) > 0),
  policy_version text not null check (char_length(policy_version) between 1 and 120),
  evaluator_kind text not null
    check (evaluator_kind in ('deterministic', 'authored_rule', 'model_classifier', 'human')),
  input_digest text not null check (input_digest ~ '^[0-9a-f]{64}$'),
  decision_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(decision_metadata) = 'object'),
  decided_at timestamptz not null default now(),
  foreign key (session_run_id, learner_user_id)
    references forge.learning_session_runs (id, learner_user_id) on delete cascade,
  unique (session_run_id, sequence_no),
  unique (id, learner_user_id, session_run_id)
);

create table forge.assistance_events (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  session_run_id bigint not null,
  policy_decision_id bigint not null,
  sequence_no integer not null check (sequence_no > 0),
  assistance_tier text not null
    check (assistance_tier in ('wait', 'attention', 'cue', 'representation', 'example', 'repair')),
  assistance_key text not null check (char_length(assistance_key) between 1 and 160),
  content_version text not null check (char_length(content_version) between 1 and 120),
  delivery_mode text not null
    check (delivery_mode in ('visual', 'text', 'audio', 'manipulation', 'human')),
  occurred_at timestamptz not null default now(),
  foreign key (session_run_id, learner_user_id)
    references forge.learning_session_runs (id, learner_user_id) on delete cascade,
  foreign key (policy_decision_id, learner_user_id, session_run_id)
    references forge.policy_decisions (id, learner_user_id, session_run_id) on delete restrict,
  unique (session_run_id, sequence_no)
);

comment on table forge.assistance_events is
  'Append-only facts about assistance shown; content keys and versions replace raw model dialogue.';

create table forge.evidence_events (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  session_run_id bigint not null,
  capability_contract_id bigint not null references forge.capability_contracts (id) on delete restrict,
  sequence_no integer not null check (sequence_no > 0),
  evidence_kind text not null
    check (evidence_kind in (
      'initial_commitment', 'probe_result', 'manipulation_result',
      'reconstruction', 'closed_transfer', 'reality_observation',
      'delayed_proof', 'evaluator_result'
    )),
  representation_key text not null check (char_length(representation_key) between 1 and 120),
  context_key text not null check (char_length(context_key) between 1 and 160),
  assistance_state text not null
    check (assistance_state in ('none', 'attention', 'cue', 'representation', 'example', 'repair')),
  independent_attempt boolean not null,
  objective_outcome text not null
    check (objective_outcome in ('pass', 'fail', 'inconclusive', 'not_scored')),
  validator_kind text not null
    check (validator_kind in (
      'exact', 'symbolic', 'unit', 'authored_discriminator',
      'rule_rubric', 'model_rubric', 'human_review', 'observation'
    )),
  validator_version text not null check (char_length(validator_version) between 1 and 120),
  validator_output jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validator_output) = 'object'),
  artifact_id bigint,
  claim_scope text not null check (char_length(claim_scope) between 1 and 2000),
  untested_limits text[] not null default '{}'::text[],
  occurred_at timestamptz not null default now(),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 160),
  foreign key (session_run_id, learner_user_id, capability_contract_id)
    references forge.learning_session_runs (id, learner_user_id, capability_contract_id) on delete cascade,
  foreign key (artifact_id, learner_user_id, session_run_id)
    references forge.learner_artifacts (id, learner_user_id, session_run_id)
    on delete set null (artifact_id),
  unique (session_run_id, sequence_no),
  unique (learner_user_id, idempotency_key),
  unique (id, learner_user_id),
  unique (id, learner_user_id, capability_contract_id),
  check (not independent_attempt or assistance_state = 'none'),
  check (
    evidence_kind not in ('closed_transfer', 'delayed_proof')
    or (independent_attempt and assistance_state = 'none')
  )
);

comment on table forge.evidence_events is
  'Append-only canonical evidence. Claims remain bounded to the recorded context and attempt.';

create table forge.proof_schedules (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  capability_contract_id bigint not null references forge.capability_contracts (id) on delete restrict,
  triggered_by_evidence_id bigint not null,
  completed_by_evidence_id bigint,
  schedule_policy_version text not null check (char_length(schedule_policy_version) between 1 and 120),
  not_before timestamptz not null,
  due_at timestamptz not null,
  expires_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'due', 'completed', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (triggered_by_evidence_id, learner_user_id, capability_contract_id)
    references forge.evidence_events (id, learner_user_id, capability_contract_id) on delete restrict,
  foreign key (completed_by_evidence_id, learner_user_id, capability_contract_id)
    references forge.evidence_events (id, learner_user_id, capability_contract_id) on delete restrict,
  check (due_at >= not_before),
  check (expires_at is null or expires_at >= due_at),
  check ((status = 'completed') = (completed_by_evidence_id is not null))
);

create table forge.question_nodes (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  parent_question_id bigint,
  source_session_run_id bigint,
  source_artifact_id bigint,
  resolved_by_evidence_id bigint,
  question_text text not null check (char_length(question_text) between 3 and 4000),
  inquiry_kind text not null
    check (inquiry_kind in ('wonder', 'clarification', 'mechanism', 'counterfactual', 'source', 'project')),
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved', 'parked', 'archived')),
  visibility text not null default 'private'
    check (visibility in ('private', 'granted_adults', 'portfolio')),
  created_by_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (parent_question_id, learner_user_id)
    references forge.question_nodes (id, learner_user_id) on delete cascade,
  foreign key (source_session_run_id, learner_user_id)
    references forge.learning_session_runs (id, learner_user_id)
    on delete set null (source_session_run_id),
  foreign key (source_artifact_id, learner_user_id)
    references forge.learner_artifacts (id, learner_user_id)
    on delete set null (source_artifact_id),
  foreign key (resolved_by_evidence_id, learner_user_id)
    references forge.evidence_events (id, learner_user_id)
    on delete set null (resolved_by_evidence_id),
  unique (id, learner_user_id)
);

create table forge.human_reviews (
  id bigint generated always as identity primary key,
  learner_user_id uuid not null references forge.learner_profiles (user_id) on delete cascade,
  reviewer_user_id uuid not null references forge.profiles (user_id) on delete restrict,
  evidence_event_id bigint,
  artifact_id bigint,
  rubric_version text not null check (char_length(rubric_version) between 1 and 120),
  review_status text not null default 'draft'
    check (review_status in ('draft', 'submitted', 'superseded')),
  disposition text check (disposition in ('supports', 'qualifies', 'rejects', 'needs_more_evidence')),
  bounded_feedback text check (bounded_feedback is null or char_length(bounded_feedback) <= 6000),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  superseded_by_review_id bigint,
  unique (id, learner_user_id),
  foreign key (evidence_event_id, learner_user_id)
    references forge.evidence_events (id, learner_user_id) on delete cascade,
  foreign key (artifact_id, learner_user_id)
    references forge.learner_artifacts (id, learner_user_id) on delete cascade,
  foreign key (superseded_by_review_id, learner_user_id)
    references forge.human_reviews (id, learner_user_id) on delete restrict,
  check ((evidence_event_id is not null)::integer + (artifact_id is not null)::integer = 1),
  check (review_status <> 'submitted' or (submitted_at is not null and disposition is not null)),
  check ((review_status = 'superseded') = (superseded_by_review_id is not null)),
  check (superseded_by_review_id is null or superseded_by_review_id <> id)
);

create table forge.data_subject_requests (
  id bigint generated always as identity primary key,
  learner_user_id uuid references forge.learner_profiles (user_id) on delete set null,
  requested_by_user_id uuid references forge.profiles (user_id) on delete set null,
  request_type text not null check (request_type in ('export', 'delete', 'restrict', 'correct')),
  requested_data_classes text[] not null check (cardinality(requested_data_classes) > 0),
  request_status text not null default 'requested'
    check (request_status in ('requested', 'identity_verified', 'processing', 'completed', 'rejected', 'cancelled')),
  subject_reference_digest text not null check (subject_reference_digest ~ '^[0-9a-f]{64}$'),
  jurisdiction text,
  requested_at timestamptz not null default now(),
  identity_verified_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  due_at timestamptz,
  result_object_storage_path text,
  result_manifest_checksum text
    check (result_manifest_checksum is null or result_manifest_checksum ~ '^[0-9a-f]{64}$'),
  deletion_boundary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(deletion_boundary) = 'object'),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (request_status <> 'processing' or processing_started_at is not null),
  check (request_status <> 'completed' or completed_at is not null)
);

comment on table forge.data_subject_requests is
  'Workflow metadata only. Export files and deletion execution belong to a separately audited privacy worker.';

-- RLS helper: a relationship is context, while only an unexpired, unrevoked scope grants access.
create or replace function forge_private.has_learner_scope(
  p_learner_user_id uuid,
  p_scope_key text,
  p_program_id bigint default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    when (select auth.uid()) = p_learner_user_id then true
    else exists (
      select 1
      from forge.learner_access_grants as grant_row
      where grant_row.learner_user_id = p_learner_user_id
        and grant_row.grantee_user_id = (select auth.uid())
        and grant_row.scope_key = p_scope_key
        and grant_row.valid_from <= now()
        and (grant_row.valid_until is null or grant_row.valid_until > now())
        and (
          grant_row.program_id is null
          or (p_program_id is not null and grant_row.program_id = p_program_id)
        )
        and not exists (
          select 1
          from forge.access_grant_revocations as revocation
          where revocation.grant_id = grant_row.id
        )
        and (
          grant_row.grantee_role <> 'guardian'
          or exists (
            select 1
            from forge.guardian_relationships as relationship
            where relationship.learner_user_id = p_learner_user_id
              and relationship.guardian_user_id = (select auth.uid())
              and relationship.status = 'active'
              and relationship.ended_at is null
          )
        )
    )
  end;
$$;

revoke execute on function forge_private.has_learner_scope(uuid, text, bigint)
  from public, anon;
grant execute on function forge_private.has_learner_scope(uuid, text, bigint)
  to authenticated, service_role;

create or replace function forge_private.has_session_scope(
  p_learner_user_id uuid,
  p_session_run_id bigint,
  p_scope_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_session_run_id is null then
      (select forge_private.has_learner_scope(p_learner_user_id, p_scope_key, null))
    else coalesce((
      select forge_private.has_learner_scope(
        p_learner_user_id,
        p_scope_key,
        session.program_id
      )
      from forge.learning_session_runs as session
      where session.id = p_session_run_id
        and session.learner_user_id = p_learner_user_id
    ), false)
  end;
$$;

revoke execute on function forge_private.has_session_scope(uuid, bigint, text)
  from public, anon;
grant execute on function forge_private.has_session_scope(uuid, bigint, text)
  to authenticated, service_role;

create or replace function forge_private.validate_sensitive_artifact_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_consent_id bigint;
begin
  if not new.sensitive_media then
    return new;
  end if;

  select consent.id
  into current_consent_id
  from forge.consent_records as consent
  where consent.learner_user_id = new.learner_user_id
    and consent.purpose_key = 'sensitive_artifact_capture'
    and consent.effective_at <= now()
    and (consent.expires_at is null or consent.expires_at > now())
  order by consent.effective_at desc, consent.id desc
  limit 1;

  if current_consent_id is distinct from new.consent_record_id
     or not exists (
       select 1
       from forge.consent_records as consent
       where consent.id = new.consent_record_id
         and consent.decision = 'granted'
     ) then
    raise exception 'sensitive artifacts require the current granted consent record';
  end if;

  return new;
end;
$$;

create or replace function forge_private.protect_versioned_release()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  status_column text := tg_argv[0];
  terminal_statuses text[] := string_to_array(tg_argv[1], ',');
  mutable_terminal_column text := tg_argv[2];
  old_status text := to_jsonb(old) ->> status_column;
  new_status text;
  protected_old jsonb;
  protected_new jsonb;
begin
  if tg_op = 'DELETE' then
    if old_status = 'published' or old_status = any(terminal_statuses) then
      raise exception 'published release rows cannot be deleted';
    end if;
    return old;
  end if;

  new_status := to_jsonb(new) ->> status_column;

  if old_status = any(terminal_statuses) then
    if to_jsonb(new) is distinct from to_jsonb(old) then
      raise exception 'terminal release rows are immutable';
    end if;
    return new;
  end if;

  if old_status <> 'published' then
    return new;
  end if;

  if to_jsonb(new) is not distinct from to_jsonb(old) then
    return new;
  end if;

  protected_old := to_jsonb(old) - status_column;
  protected_new := to_jsonb(new) - status_column;
  if mutable_terminal_column <> '' then
    protected_old := protected_old - mutable_terminal_column;
    protected_new := protected_new - mutable_terminal_column;
  end if;

  if new_status = any(terminal_statuses)
     and protected_new is not distinct from protected_old then
    return new;
  end if;

  raise exception 'published release content is immutable; publish a new version';
end;
$$;

create or replace function forge_private.protect_source_item_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_package_id bigint;
begin
  target_package_id := case
    when tg_op = 'DELETE' then old.source_package_id
    else new.source_package_id
  end;

  if exists (
    select 1
    from forge.source_packages as package
    where package.id = target_package_id
      and package.publication_status in ('published', 'withdrawn')
  ) then
    raise exception 'items in a published source package are immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function forge_private.protect_source_claim_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_source_item_id bigint;
begin
  target_source_item_id := case
    when tg_op = 'DELETE' then old.source_item_id
    else new.source_item_id
  end;

  if exists (
    select 1
    from forge.source_items as item
    join forge.source_packages as package on package.id = item.source_package_id
    where item.id = target_source_item_id
      and package.publication_status in ('published', 'withdrawn')
  ) then
    raise exception 'claims in a published source package are immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function forge_private.protect_submitted_human_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.review_status = 'superseded' then
    raise exception 'superseded human reviews are immutable';
  end if;

  if old.review_status = 'submitted' then
    if new.review_status = 'superseded'
       and new.superseded_by_review_id is not null
       and (
         to_jsonb(new) - 'review_status' - 'superseded_by_review_id' - 'updated_at'
       ) is not distinct from (
         to_jsonb(old) - 'review_status' - 'superseded_by_review_id' - 'updated_at'
       ) then
      return new;
    end if;

    raise exception 'submitted human reviews are immutable; create a superseding review';
  end if;

  if new.review_status = 'superseded' then
    raise exception 'a draft review cannot supersede itself';
  end if;

  return new;
end;
$$;

create or replace function forge_private.validate_completed_proof_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and not exists (
    select 1
    from forge.evidence_events as evidence
    where evidence.id = new.completed_by_evidence_id
      and evidence.learner_user_id = new.learner_user_id
      and evidence.capability_contract_id = new.capability_contract_id
      and evidence.evidence_kind = 'delayed_proof'
      and evidence.independent_attempt
      and evidence.assistance_state = 'none'
  ) then
    raise exception 'a completed proof schedule requires an unaided delayed-proof event';
  end if;

  return new;
end;
$$;

-- Evidence is immutable during normal operation. A deletion is admitted only for a
-- trusted privacy worker with a matching, processing deletion request in this transaction.
create or replace function forge_private.enforce_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  erasure_request_text text;
  erasure_request_id bigint;
begin
  if tg_op = 'UPDATE' then
    raise exception '% is append-only', tg_table_name;
  end if;

  if session_user not in ('postgres', 'supabase_admin')
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception '% is append-only', tg_table_name;
  end if;

  erasure_request_text := current_setting('forge.erasure_request_id', true);
  if erasure_request_text is null or erasure_request_text = '' then
    raise exception '% deletion requires forge.erasure_request_id', tg_table_name;
  end if;

  begin
    erasure_request_id := erasure_request_text::bigint;
  exception when invalid_text_representation then
    raise exception 'invalid forge.erasure_request_id';
  end;

  if not exists (
    select 1
    from forge.data_subject_requests as request
    where request.id = erasure_request_id
      and request.learner_user_id = old.learner_user_id
      and request.request_type = 'delete'
      and request.request_status = 'processing'
  ) then
    raise exception 'no matching processing deletion request for %', tg_table_name;
  end if;

  return old;
end;
$$;

create trigger consent_records_append_only
before update or delete on forge.consent_records
for each row execute function forge_private.enforce_append_only();

create trigger policy_decisions_append_only
before update or delete on forge.policy_decisions
for each row execute function forge_private.enforce_append_only();

create trigger assistance_events_append_only
before update or delete on forge.assistance_events
for each row execute function forge_private.enforce_append_only();

create trigger evidence_events_append_only
before update or delete on forge.evidence_events
for each row execute function forge_private.enforce_append_only();

create trigger learner_access_grants_append_only
before update or delete on forge.learner_access_grants
for each row execute function forge_private.enforce_append_only();

create trigger access_grant_revocations_append_only
before update or delete on forge.access_grant_revocations
for each row execute function forge_private.enforce_append_only();

create trigger source_packages_versioned_immutability
before update or delete on forge.source_packages
for each row execute function forge_private.protect_versioned_release(
  'publication_status', 'withdrawn', 'withdrawn_at'
);

create trigger source_items_versioned_immutability
before insert or update or delete on forge.source_items
for each row execute function forge_private.protect_source_item_version();

create trigger source_claims_versioned_immutability
before insert or update or delete on forge.source_claims
for each row execute function forge_private.protect_source_claim_version();

create trigger capability_contracts_versioned_immutability
before update or delete on forge.capability_contracts
for each row execute function forge_private.protect_versioned_release(
  'publication_status', 'withdrawn', ''
);

create trigger learning_world_releases_versioned_immutability
before update or delete on forge.learning_world_releases
for each row execute function forge_private.protect_versioned_release(
  'release_status', 'disabled,retired', ''
);

create trigger human_reviews_submission_immutability
before update on forge.human_reviews
for each row execute function forge_private.protect_submitted_human_review();

create trigger proof_schedules_validate_completion
before insert or update of status, completed_by_evidence_id
on forge.proof_schedules
for each row execute function forge_private.validate_completed_proof_schedule();

create trigger profiles_set_updated_at
before update on forge.profiles
for each row execute function forge_private.set_updated_at();

create trigger learner_profiles_set_updated_at
before update on forge.learner_profiles
for each row execute function forge_private.set_updated_at();

create trigger capability_definitions_set_updated_at
before update on forge.capability_definitions
for each row execute function forge_private.set_updated_at();

create trigger learning_programs_set_updated_at
before update on forge.learning_programs
for each row execute function forge_private.set_updated_at();

create trigger program_capability_assignments_set_updated_at
before update on forge.program_capability_assignments
for each row execute function forge_private.set_updated_at();

create trigger learning_goals_set_updated_at
before update on forge.learning_goals
for each row execute function forge_private.set_updated_at();

create trigger learner_artifacts_set_updated_at
before update on forge.learner_artifacts
for each row execute function forge_private.set_updated_at();

create trigger learning_session_runs_set_updated_at
before update on forge.learning_session_runs
for each row execute function forge_private.set_updated_at();

create trigger proof_schedules_set_updated_at
before update on forge.proof_schedules
for each row execute function forge_private.set_updated_at();

create trigger question_nodes_set_updated_at
before update on forge.question_nodes
for each row execute function forge_private.set_updated_at();

create trigger human_reviews_set_updated_at
before update on forge.human_reviews
for each row execute function forge_private.set_updated_at();

create trigger data_subject_requests_set_updated_at
before update on forge.data_subject_requests
for each row execute function forge_private.set_updated_at();

create trigger learner_artifacts_validate_sensitive_consent
before insert or update of sensitive_media, consent_record_id, learner_user_id
on forge.learner_artifacts
for each row execute function forge_private.validate_sensitive_artifact_consent();

create trigger learning_programs_owner_immutable
before update on forge.learning_programs
for each row execute function forge_private.reject_learner_owner_change();

create trigger program_capability_assignments_owner_immutable
before update on forge.program_capability_assignments
for each row execute function forge_private.reject_learner_owner_change();

create trigger learning_goals_owner_immutable
before update on forge.learning_goals
for each row execute function forge_private.reject_learner_owner_change();

create trigger learner_artifacts_owner_immutable
before update on forge.learner_artifacts
for each row execute function forge_private.reject_learner_owner_change();

create trigger question_nodes_owner_immutable
before update on forge.question_nodes
for each row execute function forge_private.reject_learner_owner_change();

create trigger human_reviews_owner_immutable
before update on forge.human_reviews
for each row execute function forge_private.reject_learner_owner_change();

-- Foreign-key, RLS, and dominant access-path indexes.
create index profile_roles_user_id_idx on forge.profile_roles (user_id);
create index profile_roles_granted_by_user_id_idx on forge.profile_roles (granted_by_user_id);
create index guardian_relationships_guardian_user_id_idx on forge.guardian_relationships (guardian_user_id);
create index guardian_relationships_created_by_user_id_idx on forge.guardian_relationships (created_by_user_id);
create index guardian_relationships_verified_by_user_id_idx on forge.guardian_relationships (verified_by_user_id);
create index guardian_relationships_active_idx
  on forge.guardian_relationships (learner_user_id, guardian_user_id)
  where status = 'active' and ended_at is null;
create index consent_records_learner_purpose_effective_idx
  on forge.consent_records (learner_user_id, purpose_key, effective_at desc);
create index consent_records_actor_user_id_idx on forge.consent_records (actor_user_id);
create index consent_records_supersedes_id_idx on forge.consent_records (supersedes_id);
create index consent_records_supersedes_owner_purpose_idx
  on forge.consent_records (supersedes_id, learner_user_id, purpose_key);
create index source_packages_created_by_user_id_idx on forge.source_packages (created_by_user_id);
create index source_packages_reviewed_by_user_id_idx on forge.source_packages (reviewed_by_user_id);
create index source_packages_published_idx
  on forge.source_packages (discipline, published_at desc)
  where publication_status = 'published';
create index source_items_source_package_id_idx on forge.source_items (source_package_id);
create index source_claims_source_item_id_idx on forge.source_claims (source_item_id);
create index capability_definitions_created_by_user_id_idx on forge.capability_definitions (created_by_user_id);
create index capability_definitions_active_discipline_idx
  on forge.capability_definitions (discipline, capability_key)
  where lifecycle_status = 'active';
create index capability_contracts_capability_id_idx on forge.capability_contracts (capability_id);
create index capability_contracts_source_package_id_idx on forge.capability_contracts (source_package_id);
create index capability_contracts_authored_by_user_id_idx on forge.capability_contracts (authored_by_user_id);
create index capability_contracts_reviewed_by_user_id_idx on forge.capability_contracts (reviewed_by_user_id);
create index capability_contracts_published_idx
  on forge.capability_contracts (capability_id, contract_version desc)
  where publication_status = 'published';
create index learning_world_releases_contract_id_idx
  on forge.learning_world_releases (capability_contract_id);
create index learning_world_releases_reviewed_by_user_id_idx
  on forge.learning_world_releases (reviewed_by_user_id);
create index learning_programs_learner_status_idx
  on forge.learning_programs (learner_user_id, status, updated_at desc);
create index learning_programs_created_by_user_id_idx on forge.learning_programs (created_by_user_id);
create index program_capability_assignments_program_id_idx
  on forge.program_capability_assignments (program_id);
create index program_capability_assignments_program_owner_idx
  on forge.program_capability_assignments (program_id, learner_user_id);
create index program_capability_assignments_learner_user_id_idx
  on forge.program_capability_assignments (learner_user_id);
create index program_capability_assignments_contract_id_idx
  on forge.program_capability_assignments (capability_contract_id);
create index program_capability_assignments_created_by_user_id_idx
  on forge.program_capability_assignments (created_by_user_id);
create index learning_goals_learner_status_idx
  on forge.learning_goals (learner_user_id, status, target_date);
create index learning_goals_program_id_idx on forge.learning_goals (program_id);
create index learning_goals_parent_goal_id_idx on forge.learning_goals (parent_goal_id);
create index learning_goals_program_owner_idx
  on forge.learning_goals (program_id, learner_user_id);
create index learning_goals_parent_owner_idx
  on forge.learning_goals (parent_goal_id, learner_user_id);
create index learning_goals_contract_id_idx on forge.learning_goals (capability_contract_id);
create index learning_goals_created_by_user_id_idx on forge.learning_goals (created_by_user_id);
create index learner_capability_states_contract_id_idx
  on forge.learner_capability_states (capability_contract_id);
create index learner_capability_states_next_proof_idx
  on forge.learner_capability_states (learner_user_id, next_proof_at)
  where next_proof_at is not null;
create index learner_access_grants_grantee_scope_idx
  on forge.learner_access_grants (grantee_user_id, scope_key, learner_user_id, program_id);
create index learner_access_grants_learner_user_id_idx
  on forge.learner_access_grants (learner_user_id);
create index learner_access_grants_program_id_idx on forge.learner_access_grants (program_id);
create index learner_access_grants_program_owner_idx
  on forge.learner_access_grants (program_id, learner_user_id);
create index learner_access_grants_issued_by_user_id_idx
  on forge.learner_access_grants (issued_by_user_id);
create index learner_access_grants_active_window_idx
  on forge.learner_access_grants (grantee_user_id, learner_user_id, valid_from, valid_until);
create index access_grant_revocations_learner_user_id_idx
  on forge.access_grant_revocations (learner_user_id);
create index access_grant_revocations_grant_owner_idx
  on forge.access_grant_revocations (grant_id, learner_user_id);
create index access_grant_revocations_revoked_by_user_id_idx
  on forge.access_grant_revocations (revoked_by_user_id);
create index learning_session_runs_learner_status_idx
  on forge.learning_session_runs (learner_user_id, run_status, created_at desc);
create index learning_session_runs_program_id_idx on forge.learning_session_runs (program_id);
create index learning_session_runs_goal_id_idx on forge.learning_session_runs (goal_id);
create index learning_session_runs_program_owner_idx
  on forge.learning_session_runs (program_id, learner_user_id);
create index learning_session_runs_goal_owner_idx
  on forge.learning_session_runs (goal_id, learner_user_id);
create index learning_session_runs_contract_id_idx
  on forge.learning_session_runs (capability_contract_id);
create index learning_session_runs_world_release_id_idx
  on forge.learning_session_runs (world_release_id);
create index learning_session_runs_world_contract_idx
  on forge.learning_session_runs (world_release_id, capability_contract_id);
create index learner_artifacts_learner_created_idx
  on forge.learner_artifacts (learner_user_id, created_at desc);
create index learner_artifacts_session_run_id_idx on forge.learner_artifacts (session_run_id);
create index learner_artifacts_consent_record_id_idx on forge.learner_artifacts (consent_record_id);
create index learner_artifacts_session_owner_idx
  on forge.learner_artifacts (session_run_id, learner_user_id);
create index learner_artifacts_consent_owner_idx
  on forge.learner_artifacts (consent_record_id, learner_user_id);
create index learner_artifacts_created_by_user_id_idx on forge.learner_artifacts (created_by_user_id);
create index policy_decisions_learner_decided_idx
  on forge.policy_decisions (learner_user_id, decided_at desc);
create index policy_decisions_session_run_id_idx on forge.policy_decisions (session_run_id);
create index policy_decisions_session_owner_idx
  on forge.policy_decisions (session_run_id, learner_user_id);
create index assistance_events_learner_occurred_idx
  on forge.assistance_events (learner_user_id, occurred_at desc);
create index assistance_events_session_run_id_idx on forge.assistance_events (session_run_id);
create index assistance_events_policy_decision_id_idx
  on forge.assistance_events (policy_decision_id);
create index assistance_events_session_owner_idx
  on forge.assistance_events (session_run_id, learner_user_id);
create index assistance_events_decision_owner_session_idx
  on forge.assistance_events (policy_decision_id, learner_user_id, session_run_id);
create index evidence_events_learner_occurred_idx
  on forge.evidence_events (learner_user_id, occurred_at desc);
create index evidence_events_session_run_id_idx on forge.evidence_events (session_run_id);
create index evidence_events_contract_id_idx on forge.evidence_events (capability_contract_id);
create index evidence_events_artifact_id_idx on forge.evidence_events (artifact_id);
create index evidence_events_session_owner_contract_idx
  on forge.evidence_events (session_run_id, learner_user_id, capability_contract_id);
create index evidence_events_artifact_owner_session_idx
  on forge.evidence_events (artifact_id, learner_user_id, session_run_id);
create index evidence_events_independent_idx
  on forge.evidence_events (learner_user_id, capability_contract_id, occurred_at desc)
  where independent_attempt and objective_outcome = 'pass';
create index proof_schedules_learner_due_idx
  on forge.proof_schedules (learner_user_id, status, due_at);
create index proof_schedules_contract_id_idx on forge.proof_schedules (capability_contract_id);
create index proof_schedules_triggered_by_evidence_id_idx
  on forge.proof_schedules (triggered_by_evidence_id);
create index proof_schedules_completed_by_evidence_id_idx
  on forge.proof_schedules (completed_by_evidence_id);
create index proof_schedules_triggered_owner_contract_idx
  on forge.proof_schedules (triggered_by_evidence_id, learner_user_id, capability_contract_id);
create index proof_schedules_completed_owner_contract_idx
  on forge.proof_schedules (completed_by_evidence_id, learner_user_id, capability_contract_id);
create index question_nodes_learner_status_idx
  on forge.question_nodes (learner_user_id, status, updated_at desc);
create index question_nodes_parent_question_id_idx on forge.question_nodes (parent_question_id);
create index question_nodes_source_session_run_id_idx on forge.question_nodes (source_session_run_id);
create index question_nodes_source_artifact_id_idx on forge.question_nodes (source_artifact_id);
create index question_nodes_resolved_by_evidence_id_idx on forge.question_nodes (resolved_by_evidence_id);
create index question_nodes_parent_owner_idx
  on forge.question_nodes (parent_question_id, learner_user_id);
create index question_nodes_session_owner_idx
  on forge.question_nodes (source_session_run_id, learner_user_id);
create index question_nodes_artifact_owner_idx
  on forge.question_nodes (source_artifact_id, learner_user_id);
create index question_nodes_evidence_owner_idx
  on forge.question_nodes (resolved_by_evidence_id, learner_user_id);
create index question_nodes_created_by_user_id_idx on forge.question_nodes (created_by_user_id);
create index human_reviews_learner_status_idx
  on forge.human_reviews (learner_user_id, review_status, created_at desc);
create index human_reviews_reviewer_user_id_idx on forge.human_reviews (reviewer_user_id);
create index human_reviews_evidence_event_id_idx on forge.human_reviews (evidence_event_id);
create index human_reviews_artifact_id_idx on forge.human_reviews (artifact_id);
create index human_reviews_evidence_owner_idx
  on forge.human_reviews (evidence_event_id, learner_user_id);
create index human_reviews_artifact_owner_idx
  on forge.human_reviews (artifact_id, learner_user_id);
create index human_reviews_superseding_owner_idx
  on forge.human_reviews (superseded_by_review_id, learner_user_id);
create index data_subject_requests_learner_status_idx
  on forge.data_subject_requests (learner_user_id, request_status, requested_at desc);
create index data_subject_requests_requested_by_user_id_idx
  on forge.data_subject_requests (requested_by_user_id);
create index data_subject_requests_processing_idx
  on forge.data_subject_requests (due_at)
  where request_status in ('requested', 'identity_verified', 'processing');

-- Every application-facing table is protected even when queried by its owner role.
alter table forge.profiles enable row level security;
alter table forge.profiles force row level security;
alter table forge.learner_profiles enable row level security;
alter table forge.learner_profiles force row level security;
alter table forge.profile_roles enable row level security;
alter table forge.profile_roles force row level security;
alter table forge.guardian_relationships enable row level security;
alter table forge.guardian_relationships force row level security;
alter table forge.consent_records enable row level security;
alter table forge.consent_records force row level security;
alter table forge.source_packages enable row level security;
alter table forge.source_packages force row level security;
alter table forge.source_items enable row level security;
alter table forge.source_items force row level security;
alter table forge.source_claims enable row level security;
alter table forge.source_claims force row level security;
alter table forge.capability_definitions enable row level security;
alter table forge.capability_definitions force row level security;
alter table forge.capability_contracts enable row level security;
alter table forge.capability_contracts force row level security;
alter table forge.learning_world_releases enable row level security;
alter table forge.learning_world_releases force row level security;
alter table forge.learning_programs enable row level security;
alter table forge.learning_programs force row level security;
alter table forge.program_capability_assignments enable row level security;
alter table forge.program_capability_assignments force row level security;
alter table forge.learning_goals enable row level security;
alter table forge.learning_goals force row level security;
alter table forge.learner_capability_states enable row level security;
alter table forge.learner_capability_states force row level security;
alter table forge.learner_access_grants enable row level security;
alter table forge.learner_access_grants force row level security;
alter table forge.access_grant_revocations enable row level security;
alter table forge.access_grant_revocations force row level security;
alter table forge.learning_session_runs enable row level security;
alter table forge.learning_session_runs force row level security;
alter table forge.learner_artifacts enable row level security;
alter table forge.learner_artifacts force row level security;
alter table forge.policy_decisions enable row level security;
alter table forge.policy_decisions force row level security;
alter table forge.assistance_events enable row level security;
alter table forge.assistance_events force row level security;
alter table forge.evidence_events enable row level security;
alter table forge.evidence_events force row level security;
alter table forge.proof_schedules enable row level security;
alter table forge.proof_schedules force row level security;
alter table forge.question_nodes enable row level security;
alter table forge.question_nodes force row level security;
alter table forge.human_reviews enable row level security;
alter table forge.human_reviews force row level security;
alter table forge.data_subject_requests enable row level security;
alter table forge.data_subject_requests force row level security;

-- Account and learner profile ownership.
create policy profiles_select on forge.profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(user_id, 'profile:read', null))
);

create policy profiles_insert_self on forge.profiles
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy profiles_update_self on forge.profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy learner_profiles_select on forge.learner_profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(user_id, 'profile:read', null))
);

create policy learner_profiles_insert_self on forge.learner_profiles
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy learner_profiles_update_self on forge.learner_profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy profile_roles_select on forge.profile_roles
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(user_id, 'profile:read', null))
);

create policy guardian_relationships_select on forge.guardian_relationships
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or guardian_user_id = (select auth.uid())
);

create policy guardian_relationships_insert_by_learner on forge.guardian_relationships
for insert to authenticated
with check (
  learner_user_id = (select auth.uid())
  and created_by_user_id = (select auth.uid())
  and status = 'pending'
);

create policy consent_records_select on forge.consent_records
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'consent:manage', null))
);

create policy consent_records_insert on forge.consent_records
for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and (
    (
      learner_user_id = (select auth.uid())
      and actor_capacity = 'learner'
    )
    or (
      learner_user_id <> (select auth.uid())
      and actor_capacity in ('guardian', 'legal_representative')
      and (select forge_private.has_learner_scope(learner_user_id, 'consent:manage', null))
    )
  )
);

-- Published, reviewed curriculum is readable; authoring remains server-side.
create policy source_packages_read_published on forge.source_packages
for select to authenticated
using (publication_status = 'published');

create policy source_items_read_published on forge.source_items
for select to authenticated
using (
  exists (
    select 1 from forge.source_packages as package
    where package.id = source_package_id
      and package.publication_status = 'published'
  )
);

create policy source_claims_read_published on forge.source_claims
for select to authenticated
using (
  exists (
    select 1
    from forge.source_items as item
    join forge.source_packages as package on package.id = item.source_package_id
    where item.id = source_item_id
      and package.publication_status = 'published'
  )
);

create policy capability_definitions_read_active on forge.capability_definitions
for select to authenticated
using (lifecycle_status = 'active');

create policy capability_contracts_read_published on forge.capability_contracts
for select to authenticated
using (
  publication_status = 'published'
  and exists (
    select 1
    from forge.source_packages as package
    where package.id = source_package_id
      and package.publication_status = 'published'
  )
);

create policy learning_world_releases_read_published on forge.learning_world_releases
for select to authenticated
using (
  release_status = 'published'
  and exists (
    select 1
    from forge.capability_contracts as contract
    join forge.capability_definitions as capability on capability.id = contract.capability_id
    join forge.source_packages as package on package.id = contract.source_package_id
    where contract.id = capability_contract_id
      and contract.publication_status = 'published'
      and capability.lifecycle_status = 'active'
      and package.publication_status = 'published'
  )
);

-- Learner-owned planning. Adult access is scoped and may be program-specific.
create policy learning_programs_select on forge.learning_programs
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'program:read', id))
  or (select forge_private.has_learner_scope(learner_user_id, 'program:manage', id))
);

create policy learning_programs_insert on forge.learning_programs
for insert to authenticated
with check (
  learner_user_id = (select auth.uid())
  and created_by_user_id = (select auth.uid())
);

create policy learning_programs_update on forge.learning_programs
for update to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'program:manage', id))
)
with check (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'program:manage', id))
);

create policy program_capability_assignments_select on forge.program_capability_assignments
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'program:read', program_id))
  or (select forge_private.has_learner_scope(learner_user_id, 'program:manage', program_id))
);

create policy program_capability_assignments_insert on forge.program_capability_assignments
for insert to authenticated
with check (
  (learner_user_id = (select auth.uid()) and created_by_user_id = (select auth.uid()))
  or (
    created_by_user_id = (select auth.uid())
    and (select forge_private.has_learner_scope(learner_user_id, 'program:manage', program_id))
  )
);

create policy program_capability_assignments_update on forge.program_capability_assignments
for update to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'program:manage', program_id))
)
with check (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'program:manage', program_id))
);

create policy learning_goals_select on forge.learning_goals
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'goals:read', program_id))
  or (select forge_private.has_learner_scope(learner_user_id, 'goals:manage', program_id))
);

create policy learning_goals_insert on forge.learning_goals
for insert to authenticated
with check (
  (learner_user_id = (select auth.uid()) and created_by_user_id = (select auth.uid()))
  or (
    created_by_user_id = (select auth.uid())
    and (select forge_private.has_learner_scope(learner_user_id, 'goals:manage', program_id))
  )
);

create policy learning_goals_update on forge.learning_goals
for update to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'goals:manage', program_id))
)
with check (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'goals:manage', program_id))
);

create policy learner_capability_states_select on forge.learner_capability_states
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'capability:read', null))
);

-- Learners can always inspect grants. Grantees can inspect only their own grants.
create policy learner_access_grants_select on forge.learner_access_grants
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or grantee_user_id = (select auth.uid())
);

create policy learner_access_grants_insert_by_learner on forge.learner_access_grants
for insert to authenticated
with check (
  learner_user_id = (select auth.uid())
  and issued_by_user_id = (select auth.uid())
);

create policy access_grant_revocations_select on forge.access_grant_revocations
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or exists (
    select 1 from forge.learner_access_grants as grant_row
    where grant_row.id = grant_id
      and grant_row.grantee_user_id = (select auth.uid())
  )
);

create policy access_grant_revocations_insert on forge.access_grant_revocations
for insert to authenticated
with check (
  revoked_by_user_id = (select auth.uid())
  and (
    learner_user_id = (select auth.uid())
    or exists (
      select 1 from forge.learner_access_grants as grant_row
      where grant_row.id = grant_id
        and grant_row.learner_user_id = learner_user_id
        and grant_row.grantee_user_id = (select auth.uid())
    )
  )
);

create policy learning_session_runs_select on forge.learning_session_runs
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'session:read', program_id))
);

create policy learner_artifacts_select on forge.learner_artifacts
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_session_scope(learner_user_id, session_run_id, 'artifacts:read'))
);

create policy learner_artifacts_insert on forge.learner_artifacts
for insert to authenticated
with check (
  created_by_user_id = (select auth.uid())
  and (
    learner_user_id = (select auth.uid())
    or (select forge_private.has_session_scope(learner_user_id, session_run_id, 'artifacts:contribute'))
  )
);

create policy learner_artifacts_update on forge.learner_artifacts
for update to authenticated
using (created_by_user_id = (select auth.uid()))
with check (
  created_by_user_id = (select auth.uid())
  and (
    learner_user_id = (select auth.uid())
    or (select forge_private.has_session_scope(learner_user_id, session_run_id, 'artifacts:contribute'))
  )
);

create policy policy_decisions_select on forge.policy_decisions
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_session_scope(learner_user_id, session_run_id, 'session:read'))
);

create policy assistance_events_select on forge.assistance_events
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_session_scope(learner_user_id, session_run_id, 'assistance:read'))
);

create policy evidence_events_select on forge.evidence_events
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_session_scope(learner_user_id, session_run_id, 'evidence:read'))
);

create policy proof_schedules_select on forge.proof_schedules
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'proof:read', null))
  or (select forge_private.has_learner_scope(learner_user_id, 'proof:manage', null))
);

create policy question_nodes_select on forge.question_nodes
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or (select forge_private.has_session_scope(learner_user_id, source_session_run_id, 'questions:read'))
  or (select forge_private.has_session_scope(learner_user_id, source_session_run_id, 'questions:mentor'))
);

create policy question_nodes_insert on forge.question_nodes
for insert to authenticated
with check (
  created_by_user_id = (select auth.uid())
  and (
    learner_user_id = (select auth.uid())
    or (select forge_private.has_session_scope(learner_user_id, source_session_run_id, 'questions:mentor'))
  )
);

create policy question_nodes_update on forge.question_nodes
for update to authenticated
using (created_by_user_id = (select auth.uid()))
with check (
  created_by_user_id = (select auth.uid())
  and (
    learner_user_id = (select auth.uid())
    or (select forge_private.has_session_scope(learner_user_id, source_session_run_id, 'questions:mentor'))
  )
);

create policy human_reviews_select on forge.human_reviews
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or reviewer_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'evidence:read', null))
);

create policy human_reviews_insert on forge.human_reviews
for insert to authenticated
with check (
  reviewer_user_id = (select auth.uid())
  and review_status = 'draft'
  and (select forge_private.has_learner_scope(learner_user_id, 'reviews:create', null))
);

create policy human_reviews_update on forge.human_reviews
for update to authenticated
using (reviewer_user_id = (select auth.uid()))
with check (reviewer_user_id = (select auth.uid()));

create policy data_subject_requests_select on forge.data_subject_requests
for select to authenticated
using (
  learner_user_id = (select auth.uid())
  or requested_by_user_id = (select auth.uid())
  or (select forge_private.has_learner_scope(learner_user_id, 'privacy:assist', null))
);

-- RLS is the second boundary; table privileges remain deliberately narrow.
revoke all on all tables in schema forge from anon, authenticated;
revoke all on all sequences in schema forge from anon, authenticated;

grant select on all tables in schema forge to authenticated;
grant insert, update on forge.profiles, forge.learner_profiles to authenticated;
grant insert on forge.guardian_relationships, forge.consent_records to authenticated;
grant insert, update on
  forge.learning_programs,
  forge.program_capability_assignments,
  forge.learning_goals,
  forge.learner_artifacts,
  forge.question_nodes,
  forge.human_reviews
to authenticated;
grant insert on
  forge.learner_access_grants,
  forge.access_grant_revocations
to authenticated;
grant usage on sequence
  forge.guardian_relationships_id_seq,
  forge.consent_records_id_seq,
  forge.learning_programs_id_seq,
  forge.program_capability_assignments_id_seq,
  forge.learning_goals_id_seq,
  forge.learner_access_grants_id_seq,
  forge.access_grant_revocations_id_seq,
  forge.learner_artifacts_id_seq,
  forge.question_nodes_id_seq,
  forge.human_reviews_id_seq
to authenticated;

grant all on all tables in schema forge to service_role;
grant all on all sequences in schema forge to service_role;

commit;
