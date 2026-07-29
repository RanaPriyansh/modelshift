#!/usr/bin/env bash
set -euo pipefail

# Local disposable PostgreSQL proof only. This harness refuses inherited
# DATABASE_URL values and TCP hosts, verifies every database identity before
# destructive operations, and deletes only explicitly named fixture databases.

root_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
pg_host=${FORGE_CONTINUITY_PGHOST:-/tmp}
pg_port=${FORGE_CONTINUITY_PGPORT:-5432}
pg_user=${FORGE_CONTINUITY_PGUSER:-$(id -un)}
run_token=${FORGE_CONTINUITY_RUN_TOKEN:-"$(date +%s)_$$"}
temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/forge_continuity.XXXXXX")
pg_tools_dir=${FORGE_CONTINUITY_PG_BIN:-}

fresh_db="forge_w5c_fresh_continuity_${run_token}"
upgrade_db="forge_w5c_upgrade_continuity_${run_token}"
restore_db="forge_continuity_restore_${run_token}"
rollback_db="forge_continuity_rollback_${run_token}"
fixture_dbs=()
created_roles=()

fresh_dump="$temp_dir/fresh.dump"
upgrade_before_dump="$temp_dir/upgrade-before-continuity.dump"
winner_log="$temp_dir/concurrency-winner.log"
loser_log="$temp_dir/concurrency-loser.log"

psql_local() {
  env -u DATABASE_URL psql -X -h "$pg_host" -p "$pg_port" -U "$pg_user" "$@"
}

assert_fixture_name() {
  local db_name=$1
  if [[ ! "$db_name" =~ ^forge_w5c_(fresh|upgrade)_continuity_[a-z0-9_]+$ ]] \
     && [[ ! "$db_name" =~ ^forge_continuity_(restore|rollback)_[a-z0-9_]+$ ]]; then
    printf 'refusing non-fixture database name: %s\n' "$db_name" >&2
    return 1
  fi
}

database_exists() {
  local db_name=$1
  psql_local -d postgres -Atc \
    "select exists (select 1 from pg_database where datname = '$db_name');"
}

drop_verified_fixture() {
  local db_name=$1
  assert_fixture_name "$db_name"
  psql_local -d "$db_name" -Atc \
    "select current_database(), current_user, coalesce(inet_server_addr()::text, 'local-socket'), inet_server_port();"
  env -u DATABASE_URL dropdb -h "$pg_host" -p "$pg_port" -U "$pg_user" "$db_name"
  if [[ $(database_exists "$db_name") != "f" ]]; then
    printf 'fixture database deletion verification failed: %s\n' "$db_name" >&2
    return 1
  fi
  printf 'deleted-and-verified %s\n' "$db_name"
}

cleanup() {
  local db_name role_name
  for db_name in "${fixture_dbs[@]-}"; do
    [[ -z "$db_name" ]] && continue
    if assert_fixture_name "$db_name" \
       && [[ $(database_exists "$db_name" 2>/dev/null || true) == "t" ]]; then
      env -u DATABASE_URL dropdb -h "$pg_host" -p "$pg_port" -U "$pg_user" "$db_name" || true
    fi
  done
  for role_name in "${created_roles[@]-}"; do
    [[ -z "$role_name" ]] && continue
    psql_local -d postgres -v ON_ERROR_STOP=1 -c "drop role $role_name;" || true
  done
  rm -f "$fresh_dump" "$upgrade_before_dump" "$winner_log" "$loser_log"
  rmdir "$temp_dir" 2>/dev/null || true
}
trap cleanup EXIT

create_fixture() {
  local db_name=$1
  assert_fixture_name "$db_name"
  env -u DATABASE_URL createdb -h "$pg_host" -p "$pg_port" -U "$pg_user" "$db_name"
  fixture_dbs+=("$db_name")
  psql_local -d "$db_name" -Atc \
    "select current_database(), current_user, coalesce(inet_server_addr()::text, 'local-socket'), inet_server_port();"
}

remove_fixture_from_cleanup() {
  local removed=$1
  local remaining=()
  local db_name
  for db_name in "${fixture_dbs[@]-}"; do
    [[ -z "$db_name" ]] && continue
    if [[ "$db_name" != "$removed" ]]; then
      remaining+=("$db_name")
    fi
  done
  if [[ ${#remaining[@]} -eq 0 ]]; then
    fixture_dbs=()
  else
    fixture_dbs=("${remaining[@]}")
  fi
}

ensure_fixture_role() {
  local role_name=$1
  local bypass_rls=$2
  if [[ $(psql_local -d postgres -Atc \
    "select exists (select 1 from pg_roles where rolname = '$role_name');") == "f" ]]; then
    psql_local -d postgres -v ON_ERROR_STOP=1 -c \
      "create role $role_name nologin $bypass_rls;"
    created_roles+=("$role_name")
  fi
}

apply_continuity_and_contract() {
  local db_name=$1
  psql_local -d "$db_name" -v ON_ERROR_STOP=1 \
    -f "$root_dir/supabase/migrations/20260724000100_forge_learning_continuity_v1.sql"
  psql_local -d "$db_name" -v ON_ERROR_STOP=1 \
    -f "$root_dir/supabase/tests/forge_learning_continuity_v1_contract.sql"
}

wait_for_append() {
  local log_file=$1
  local pid=$2
  local tick
  for tick in {1..80}; do
    if rg -q 'appended' "$log_file"; then
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      break
    fi
    sleep 0.05
  done
  printf 'concurrency winner did not enter the overlap window:\n' >&2
  sed -n '1,120p' "$log_file" >&2
  return 1
}

run_concurrency_gate() {
  local db_name=$1
  local winner_pid winner_status loser_status

  psql_local -d "$db_name" -v ON_ERROR_STOP=1 \
    -f "$root_dir/supabase/tests/forge_learning_continuity_v1_concurrency_setup.sql"

  psql_local -d "$db_name" -v ON_ERROR_STOP=1 \
    -v intent_id='intent.concurrent.winner' \
    -v digest_character='a' \
    -v preview_receipt_id='preview.concurrent.winner' \
    -v hold_seconds=1 \
    -f "$root_dir/supabase/tests/forge_learning_continuity_v1_concurrency_session.sql" \
    >"$winner_log" 2>&1 &
  winner_pid=$!
  wait_for_append "$winner_log" "$winner_pid"

  set +e
  psql_local -d "$db_name" -v ON_ERROR_STOP=1 \
    -v intent_id='intent.concurrent.loser' \
    -v digest_character='b' \
    -v preview_receipt_id='preview.concurrent.loser' \
    -v hold_seconds=0 \
    -f "$root_dir/supabase/tests/forge_learning_continuity_v1_concurrency_session.sql" \
    >"$loser_log" 2>&1
  loser_status=$?
  wait "$winner_pid"
  winner_status=$?
  set -e

  if [[ $winner_status -ne 0 || $loser_status -eq 0 ]] \
     || ! rg -q 'duplicate key value violates unique constraint.*idempotency' "$loser_log"; then
    printf 'continuity idempotency race did not produce one winner and one refused duplicate\n' >&2
    sed -n '1,140p' "$winner_log" >&2
    sed -n '1,140p' "$loser_log" >&2
    return 1
  fi

  if [[ $(psql_local -d "$db_name" -Atc \
    "select count(*) from forge.learning_intents where owner_user_id = '74000000-0000-4000-8000-000000000001' and idempotency_key = 'idempotency.continuity.concurrent';") != "1" ]]; then
    printf 'continuity idempotency race did not retain exactly one winner\n' >&2
    return 1
  fi
  printf 'concurrency-passed one-winner-one-refused-duplicate\n'
}

if [[ "$pg_host" != /* ]]; then
  printf 'refusing non-socket PostgreSQL host: %s\n' "$pg_host" >&2
  exit 1
fi
if [[ ! "$run_token" =~ ^[a-z0-9_]+$ ]]; then
  printf 'FORGE_CONTINUITY_RUN_TOKEN must contain only lowercase letters, digits, and underscores\n' >&2
  exit 1
fi

psql_local -d postgres -Atc \
  "select current_database(), current_user, coalesce(inet_server_addr()::text, 'local-socket'), inet_server_port();"
server_major=$(psql_local -d postgres -Atc "show server_version_num;" | awk '{ print int($1 / 10000) }')
if [[ -z "$pg_tools_dir" ]] && command -v brew >/dev/null 2>&1; then
  brew_prefix=$(brew --prefix "postgresql@${server_major}" 2>/dev/null || true)
  if [[ -n "$brew_prefix" && -x "$brew_prefix/bin/pg_dump" && -x "$brew_prefix/bin/pg_restore" ]]; then
    pg_tools_dir="$brew_prefix/bin"
  fi
fi
if [[ -z "$pg_tools_dir" ]]; then
  pg_tools_dir=$(dirname "$(command -v pg_dump)")
fi
pg_dump_bin="$pg_tools_dir/pg_dump"
pg_restore_bin="$pg_tools_dir/pg_restore"
if [[ ! -x "$pg_dump_bin" || ! -x "$pg_restore_bin" ]] \
   || ! "$pg_dump_bin" --version | rg -q " ${server_major}\\."; then
  printf 'PostgreSQL %s-matched pg_dump and pg_restore are required; set FORGE_CONTINUITY_PG_BIN\n' \
    "$server_major" >&2
  exit 1
fi
ensure_fixture_role anon "nobypassrls"
ensure_fixture_role authenticated "nobypassrls"
ensure_fixture_role service_role "bypassrls"

printf 'gate=fresh-install\n'
create_fixture "$fresh_db"
psql_local -d "$fresh_db" -v ON_ERROR_STOP=1 \
  -f "$root_dir/supabase/tests/forge_adr001_v2_fresh_fixture.sql"
apply_continuity_and_contract "$fresh_db"
run_concurrency_gate "$fresh_db"

printf 'gate=backup-restore\n'
env -u DATABASE_URL "$pg_dump_bin" -Fc -h "$pg_host" -p "$pg_port" -U "$pg_user" \
  -d "$fresh_db" -f "$fresh_dump"
create_fixture "$restore_db"
env -u DATABASE_URL "$pg_restore_bin" -h "$pg_host" -p "$pg_port" -U "$pg_user" \
  -d "$restore_db" --exit-on-error "$fresh_dump"
psql_local -d "$restore_db" -Atc \
  "select current_database(), current_user, coalesce(inet_server_addr()::text, 'local-socket'), inet_server_port();"
psql_local -d "$restore_db" -v ON_ERROR_STOP=1 \
  -f "$root_dir/supabase/tests/forge_learning_continuity_v1_contract.sql"
if [[ $(psql_local -d "$restore_db" -Atc \
  "select count(*) from forge.learning_intents where intent_id = 'intent.concurrent.winner';") != "1" ]]; then
  printf 'restored database lost the committed concurrency winner\n' >&2
  exit 1
fi
drop_verified_fixture "$restore_db"
remove_fixture_from_cleanup "$restore_db"

printf 'gate=upgrade\n'
create_fixture "$upgrade_db"
psql_local -d "$upgrade_db" -v ON_ERROR_STOP=1 \
  -f "$root_dir/supabase/tests/forge_adr001_v2_upgrade_fixture.sql"
env -u DATABASE_URL "$pg_dump_bin" -Fc -h "$pg_host" -p "$pg_port" -U "$pg_user" \
  -d "$upgrade_db" -f "$upgrade_before_dump"
apply_continuity_and_contract "$upgrade_db"
if [[ $(psql_local -d "$upgrade_db" -Atc \
  "select count(*) from forge.event_journal where event_id = '20000000-0000-4000-8000-000000000002';") != "1" ]]; then
  printf 'continuity upgrade did not preserve the legacy event\n' >&2
  exit 1
fi

printf 'gate=rollback-by-verified-restore\n'
create_fixture "$rollback_db"
env -u DATABASE_URL "$pg_restore_bin" -h "$pg_host" -p "$pg_port" -U "$pg_user" \
  -d "$rollback_db" --exit-on-error "$upgrade_before_dump"
psql_local -d "$rollback_db" -Atc \
  "select current_database(), current_user, coalesce(inet_server_addr()::text, 'local-socket'), inet_server_port();"
if [[ $(psql_local -d "$rollback_db" -Atc \
  "select to_regclass('forge.learning_intents') is null;") != "t" ]]; then
  printf 'rollback restore unexpectedly retained continuity tables\n' >&2
  exit 1
fi
if [[ $(psql_local -d "$rollback_db" -Atc \
  "select count(*) from forge.event_journal where event_id = '20000000-0000-4000-8000-000000000002';") != "1" ]]; then
  printf 'rollback restore lost predecessor history\n' >&2
  exit 1
fi
drop_verified_fixture "$rollback_db"
remove_fixture_from_cleanup "$rollback_db"

drop_verified_fixture "$fresh_db"
remove_fixture_from_cleanup "$fresh_db"
drop_verified_fixture "$upgrade_db"
remove_fixture_from_cleanup "$upgrade_db"

printf 'FORGE learning continuity v1 local gate passed: fresh upgrade concurrency backup-restore rollback RLS elevated-role\n'
