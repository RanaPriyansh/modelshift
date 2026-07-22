\set ON_ERROR_STOP on

do $$
begin
  if (select count(*) from forge.event_journal where aggregate_id like 'run.race.%') <> 3
     or (select count(*) from forge.adr001_event_journal where aggregate_id like 'run.race.%') <> 3
     or (select count(*) from forge.event_identity_claims as claim
         where exists (select 1 from forge.event_journal as v1 where v1.event_id = claim.event_id and v1.aggregate_id like 'run.race.%')
            or exists (select 1 from forge.adr001_event_journal as v2 where v2.event_id = claim.event_id and v2.aggregate_id like 'run.race.%')) <> 6
     or exists (
       select 1
       from forge.event_journal as v1
       join forge.adr001_event_journal as v2 using (event_id)
     ) then
    raise exception 'separate-session ADR-001 cross-version race results are not one immutable winner per claim';
  end if;
end;
$$;

select 'FORGE ADR-001 v2 separate-session race contract passed' as result;
