-- Packet B upgrade repair: historical private-evidence consent rows must
-- remain readable as append-only history, but must never authorize a runtime
-- that does not exist yet. This is intentionally a retirement boundary, not
-- a private-evidence persistence implementation.

begin;

-- Retain the historical CHECK member so 20260722101500 can upgrade a database
-- that already has an immutable legacy row. The policy and trigger below make
-- the member non-operative for every new insert.
alter table forge.consent_records
  drop constraint if exists consent_records_purpose_key_check;

alter table forge.consent_records
  add constraint consent_records_purpose_key_check
  check (purpose_key in (
    'learning_service', 'guardian_access', 'research',
    'sensitive_artifact_capture', 'model_improvement',
    'private_evidence_persistence'
  ));

-- Make the client/Data API boundary explicit even though the trigger below is
-- also a role-independent guard. This preserves the pre-existing ownership
-- rule and rejects the retired purpose in the INSERT WITH CHECK expression.
drop policy if exists consent_records_insert on forge.consent_records;

create policy consent_records_insert on forge.consent_records
for insert to authenticated
with check (
  purpose_key <> 'private_evidence_persistence'
  and actor_user_id = (select auth.uid())
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

-- RLS can be bypassed by a trusted database role. This trigger deliberately
-- makes the retired purpose impossible to create through any ordinary runtime
-- path until an explicitly authorized successor migration retires it.
create or replace function forge_private.reject_retired_private_evidence_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.purpose_key = 'private_evidence_persistence' then
    raise exception using
      errcode = 'check_violation',
      message = 'private_evidence_persistence consent is retired and cannot be newly recorded';
  end if;

  return new;
end;
$$;

revoke all on function forge_private.reject_retired_private_evidence_consent()
  from public, anon, authenticated;

drop trigger if exists consent_records_reject_retired_private_evidence_purpose
  on forge.consent_records;

create trigger consent_records_reject_retired_private_evidence_purpose
before insert on forge.consent_records
for each row execute function forge_private.reject_retired_private_evidence_consent();

commit;
