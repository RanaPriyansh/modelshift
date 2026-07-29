\set ON_ERROR_STOP on

do $$
begin
  if current_database() !~ '^forge_w5c_fresh_continuity_[a-z0-9_]+$' then
    raise exception 'continuity concurrency setup requires a verified fresh disposable database, got %',
      current_database();
  end if;
end;
$$;

insert into auth.users (id)
values ('74000000-0000-4000-8000-000000000001')
on conflict do nothing;

begin;
set local role service_role;

insert into forge.profiles (user_id, display_name)
values ('74000000-0000-4000-8000-000000000001', 'Continuity concurrency fixture');

insert into forge.learner_profiles (user_id, age_band, onboarding_status)
values ('74000000-0000-4000-8000-000000000001', 'adult', 'active');

commit;
