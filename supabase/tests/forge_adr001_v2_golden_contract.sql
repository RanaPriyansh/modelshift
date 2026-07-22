-- The JSON below is produced and pinned by the focused TypeScript compiler
-- golden test. psql reads it only from this checkout; no project URL, API, or
-- database file access is involved. Both fresh and upgrade fixtures include
-- this contract after the v2 migration is installed.

\set ON_ERROR_STOP on
\set adr001_compiler_golden_events `tr -d '\n' < src/forge/fixtures/adr001-source-corroboration-compiler-v2.json`

create temporary table pg_temp.adr001_compiler_golden_events (
  ordinal integer generated always as identity primary key,
  event_document jsonb not null
);

insert into pg_temp.adr001_compiler_golden_events (event_document)
select value
from jsonb_array_elements(:'adr001_compiler_golden_events'::jsonb);

grant select on table pg_temp.adr001_compiler_golden_events to authenticated;

do $$
begin
  if (select count(*) from pg_temp.adr001_compiler_golden_events) <> 4
     or not exists (
       select 1
       from pg_temp.adr001_compiler_golden_events
       where event_document ->> 'event_type' = 'world_run.started'
         and event_document #>> '{payload,runtime_binding_digest}' = 'sha256:a172f067f6135bdcec13c66053ef250ef92692db734b60ddf8e396fb8b0dc4b5'
     ) then
    raise exception 'ADR-001 compiler golden fixture is not the expected runtime-bound chain';
  end if;
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';

do $$
declare
  v_document jsonb;
  v_first_event_id uuid;
  v_aggregate_id text;
begin
  for v_document in
    select event_document
    from pg_temp.adr001_compiler_golden_events
    order by ordinal
  loop
    perform forge.append_adr001_v2_event(v_document);
  end loop;

  select (event_document ->> 'event_id')::uuid, event_document #>> '{aggregate,id}'
  into v_first_event_id, v_aggregate_id
  from pg_temp.adr001_compiler_golden_events
  order by ordinal
  limit 1;

  if (select count(*) from forge.adr001_event_journal where aggregate_id = v_aggregate_id) <> 4
     or exists (
       select 1
       from pg_temp.adr001_compiler_golden_events as golden
       left join forge.adr001_event_journal as persisted
         on persisted.event_document = golden.event_document
       where persisted.event_id is null
     )
     or (select state_data ->> 'runtime_binding_digest'
         from forge.adr001_event_aggregate_heads
         where aggregate_id = v_aggregate_id)
        <> 'sha256:a172f067f6135bdcec13c66053ef250ef92692db734b60ddf8e396fb8b0dc4b5' then
    raise exception 'ADR-001 SQL persistence did not preserve the exact compiler golden chain';
  end if;
end;
$$;

reset role;
