\set ON_ERROR_STOP on

do $$
begin
  if (select count(*) from forge.adr001_event_journal where aggregate_id = 'run.authority.race') <> 2
     or (select count(*) from forge.adr001_event_outbox where event_id in (
       '85000000-0000-4000-8000-000000000001',
       '85000000-0000-4000-8000-000000000002'
     )) <> 2
     or (select current_version from forge.adr001_event_aggregate_heads where aggregate_id = 'run.authority.race') <> 2
     or (select status from forge.adr001_proof_challenges where challenge_id = '86000000-0000-4000-8000-000000000001') <> 'consumed'
     or (select consumed_event_id from forge.adr001_proof_challenges where challenge_id = '86000000-0000-4000-8000-000000000001') <> '85000000-0000-4000-8000-000000000002'::uuid
     or (select count(*) from forge.adr001_event_projection_receipts where canonical_event_id in (
       '85000000-0000-4000-8000-000000000001',
       '85000000-0000-4000-8000-000000000002'
     )) <> 2
     or exists (
       select 1
       from forge.adr001_event_journal
       where event_id = '85000000-0000-4000-8000-000000000003'::uuid
     )
     or exists (
       select 1
       from forge.adr001_event_outbox
       where event_id = '85000000-0000-4000-8000-000000000003'::uuid
     )
     or exists (
       select 1
       from forge.adr001_event_projection_receipts
       where canonical_event_id = '85000000-0000-4000-8000-000000000003'::uuid
     ) then
    raise exception 'concurrent one-time proof challenge created more than one authoritative mutation';
  end if;
end;
$$;

select 'FORGE ADR-001 v3 separate-session nonce race contract passed' as result;
