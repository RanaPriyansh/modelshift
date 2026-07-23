\set ON_ERROR_STOP on

begin;
set local role service_role;
set local request.jwt.claim.role = 'service_role';
set local request.jwt.claim.sub = 'service-role-race';
select forge.append_adr001_v2_validated_event(
  '81000000-0000-4000-8000-000000000001',
  'validator-authority.race',
  '83000000-0000-4000-8000-000000000001',
  '84000000-0000-4000-8000-000000000001',
  forge_test.adr001_v3_proof_event(:'event_id'::uuid, :'idempotency_key')
);
select 'appended' as race_state;
select pg_sleep(:'hold_seconds'::double precision);
commit;
