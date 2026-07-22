-- Run after migrations with psql -v ON_ERROR_STOP=1. This is a catalog-only
-- contract for the disabled-by-default adult-cloud staging boundary.

begin;

do $$
begin
  if has_table_privilege('authenticated', 'forge.learner_profiles', 'INSERT')
     or has_table_privilege('authenticated', 'forge.learner_profiles', 'UPDATE') then
    raise exception 'authenticated callers can manufacture or alter a learner age profile';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'forge'
      and tablename = 'learner_profiles'
      and policyname in ('learner_profiles_insert_self', 'learner_profiles_update_self')
  ) then
    raise exception 'legacy self-service learner-profile mutation policy remains';
  end if;

  if not exists (
    select 1 from pg_constraint as constraint_record
    where constraint_record.conrelid = 'forge.consent_records'::regclass
      and constraint_record.conname = 'consent_records_purpose_key_check'
      and pg_get_constraintdef(constraint_record.oid) like '%private_evidence_persistence%'
  ) then
    raise exception 'adult private-evidence consent purpose is not bounded in the existing consent ledger';
  end if;

  if to_regclass('forge.adult_private_evidence_entries') is not null then
    raise exception 'Packet B must not create a v1 device-record persistence table before the ADR-001 projector';
  end if;
end;
$$;

select 'FORGE adult cloud staging contract passed' as result;

rollback;
