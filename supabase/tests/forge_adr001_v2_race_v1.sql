\set ON_ERROR_STOP on
begin;
set local role service_role;
select forge.append_event(forge_test.v1_started(:'event_id'::uuid, :'aggregate_id', :'idempotency_key'));
select pg_sleep(:'hold_seconds'::double precision);
commit;
