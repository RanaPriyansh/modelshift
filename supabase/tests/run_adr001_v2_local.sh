#!/usr/bin/env bash
set -euo pipefail

# Local disposable PostgreSQL proof only. Every connection is explicit and
# DATABASE_URL is removed so neither a hosted project nor an inherited URL can
# be selected accidentally.
root_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
pg_host=${FORGE_W5C_PGHOST:-/tmp}
pg_port=${FORGE_W5C_PGPORT:-5432}
pg_user=${FORGE_W5C_PGUSER:-$(id -un)}
run_token="${FORGE_W5C_RUN_TOKEN:-$(date +%s)_$$}"
temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/forge_w5c.XXXXXX")
fixture_dbs=()

cleanup() {
  local db_name
  for db_name in "${fixture_dbs[@]}"; do
    if [[ "$db_name" =~ ^forge_w5c_(fresh|upgrade)_[a-z0-9_]+$ ]] \
       && [[ $(psql_local -d postgres -Atc "select exists (select 1 from pg_database where datname = '$db_name');" 2>/dev/null || true) == "t" ]]; then
      env -u DATABASE_URL dropdb -h "$pg_host" -p "$pg_port" -U "$pg_user" "$db_name" || true
    fi
  done
  rm -rf "$temp_dir"
}
trap cleanup EXIT

psql_local() {
  env -u DATABASE_URL psql -X -h "$pg_host" -p "$pg_port" -U "$pg_user" "$@"
}

assert_fixture_name() {
  local db_name=$1
  if [[ ! "$db_name" =~ ^forge_w5c_(fresh|upgrade)_[a-z0-9_]+$ ]]; then
    printf 'refusing non-fixture database name: %s\n' "$db_name" >&2
    return 1
  fi
}

drop_verified_fixture() {
  local db_name=$1
  assert_fixture_name "$db_name"
  psql_local -d "$db_name" -Atc "select current_database(), current_user, coalesce(inet_server_addr()::text, 'local-socket'), inet_server_port();"
  env -u DATABASE_URL dropdb -h "$pg_host" -p "$pg_port" -U "$pg_user" "$db_name"
  if [[ $(psql_local -d postgres -Atc "select exists (select 1 from pg_database where datname = '$db_name');") != "f" ]]; then
    printf 'fixture database deletion verification failed: %s\n' "$db_name" >&2
    return 1
  fi
  printf 'deleted-and-verified %s\n' "$db_name"
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
  printf 'race winner did not append before overlap window:\n' >&2
  sed -n '1,120p' "$log_file" >&2
  return 1
}

session_file_for() {
  local version=$1
  if [[ "$version" == "v1" ]]; then
    printf '%s\n' "$root_dir/supabase/tests/forge_adr001_v2_race_v1.sql"
  else
    printf '%s\n' "$root_dir/supabase/tests/forge_adr001_v2_race_v2.sql"
  fi
}

run_session() {
  local db_name=$1
  local version=$2
  local event_id=$3
  local aggregate_id=$4
  local idempotency_key=$5
  local hold_seconds=$6
  local log_file=$7
  psql_local -d "$db_name" -v ON_ERROR_STOP=1 \
    -v event_id="$event_id" -v aggregate_id="$aggregate_id" -v idempotency_key="$idempotency_key" \
    -v hold_seconds="$hold_seconds" -f "$(session_file_for "$version")" >"$log_file" 2>&1
}

run_race() {
  local db_name=$1
  local label=$2
  local winner=$3
  local loser=$4
  local winner_event_id=$5
  local loser_event_id=$6
  local winner_aggregate=$7
  local loser_aggregate=$8
  local winner_idempotency=$9
  local loser_idempotency=${10}
  local expected_error=${11}
  local winner_log="$temp_dir/${label}.${winner}.log"
  local loser_log="$temp_dir/${label}.${loser}.log"
  local winner_pid loser_status winner_status

  run_session "$db_name" "$winner" "$winner_event_id" "$winner_aggregate" "$winner_idempotency" 1 "$winner_log" &
  winner_pid=$!
  wait_for_append "$winner_log" "$winner_pid"

  set +e
  run_session "$db_name" "$loser" "$loser_event_id" "$loser_aggregate" "$loser_idempotency" 0 "$loser_log"
  loser_status=$?
  wait "$winner_pid"
  winner_status=$?
  set -e

  if [[ $winner_status -ne 0 || $loser_status -eq 0 ]] || ! rg -q "$expected_error" "$loser_log"; then
    printf 'race %s did not produce one winner and the expected loser refusal\n' "$label" >&2
    sed -n '1,160p' "$winner_log" >&2
    sed -n '1,160p' "$loser_log" >&2
    return 1
  fi
  printf 'race-passed %s winner=%s loser=%s\n' "$label" "$winner" "$loser"
}

run_v3_proof_session() {
  local db_name=$1
  local event_id=$2
  local idempotency_key=$3
  local hold_seconds=$4
  local log_file=$5
  psql_local -d "$db_name" -v ON_ERROR_STOP=1 \
    -v event_id="$event_id" -v idempotency_key="$idempotency_key" -v hold_seconds="$hold_seconds" \
    -f "$root_dir/supabase/tests/forge_adr001_v3_proof_race.sql" >"$log_file" 2>&1
}

run_v3_nonce_race() {
  local db_name=$1
  local winner_log="$temp_dir/v3_nonce.winner.log"
  local loser_log="$temp_dir/v3_nonce.loser.log"
  local winner_pid loser_status winner_status

  run_v3_proof_session "$db_name" \
    85000000-0000-4000-8000-000000000002 \
    idempotency.authority.race.winner 1 "$winner_log" &
  winner_pid=$!
  wait_for_append "$winner_log" "$winner_pid"

  set +e
  run_v3_proof_session "$db_name" \
    85000000-0000-4000-8000-000000000003 \
    idempotency.authority.race.loser 0 "$loser_log"
  loser_status=$?
  wait "$winner_pid"
  winner_status=$?
  set -e

  if [[ $winner_status -ne 0 || $loser_status -eq 0 ]] \
     || ! rg -q 'proof nonce must be an unexpired server-issued one-time challenge' "$loser_log"; then
    printf 'v3 nonce race did not produce one projection and one rejected replay\n' >&2
    sed -n '1,160p' "$winner_log" >&2
    sed -n '1,160p' "$loser_log" >&2
    return 1
  fi
  printf 'race-passed v3_nonce winner=service_role loser=service_role\n'
}

run_fixture() {
  local kind=$1
  local fixture_file=$2
  local db_name="forge_w5c_${kind}_${run_token}"
  assert_fixture_name "$db_name"
  printf 'creating %s\n' "$db_name"
  env -u DATABASE_URL createdb -h "$pg_host" -p "$pg_port" -U "$pg_user" "$db_name"
  fixture_dbs+=("$db_name")
  psql_local -d "$db_name" -Atc "select current_database(), current_user, coalesce(inet_server_addr()::text, 'local-socket'), inet_server_port();"
  psql_local -d "$db_name" -v ON_ERROR_STOP=1 -f "$root_dir/$fixture_file"
  psql_local -d "$db_name" -v ON_ERROR_STOP=1 -f "$root_dir/supabase/tests/forge_adr001_v3_concurrency_setup.sql"
  run_v3_nonce_race "$db_name"
  psql_local -d "$db_name" -v ON_ERROR_STOP=1 -f "$root_dir/supabase/tests/forge_adr001_v3_concurrency_assert.sql"
  drop_verified_fixture "$db_name"
  fixture_dbs=("${fixture_dbs[@]/$db_name}")
}

run_fixture fresh supabase/tests/forge_adr001_v2_fresh_fixture.sql
run_fixture upgrade supabase/tests/forge_adr001_v2_upgrade_fixture.sql
