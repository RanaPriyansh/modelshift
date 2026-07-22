\set ON_ERROR_STOP on
begin;
set local role authenticated;
set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
select forge.append_adr001_v2_event(forge_test.v2_started(:'event_id'::uuid, :'aggregate_id', :'idempotency_key'));
select pg_sleep(:'hold_seconds'::double precision);
commit;
