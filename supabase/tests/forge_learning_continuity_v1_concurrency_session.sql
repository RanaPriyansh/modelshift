\set ON_ERROR_STOP on

begin;
set local role service_role;

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
) values (
  :'intent_id',
  '74000000-0000-4000-8000-000000000001',
  'learning-intent.v1',
  'sanitized-learning-intent',
  'sha256:' || repeat(:'digest_character', 64),
  'Inspect one bounded continuity route.',
  'Accept one reviewed route.',
  'A learner can resume the accepted route.',
  'working',
  array['reviewed-world'],
  array['internal-map'],
  :'preview_receipt_id',
  'policy.continuity.fixture',
  '1.0.0',
  'sha256:' || repeat('c', 64),
  now(),
  'idempotency.continuity.concurrent'
);

select 'appended' as concurrency_state;
select pg_sleep(:hold_seconds);
commit;
