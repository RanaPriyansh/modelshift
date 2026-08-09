#!/usr/bin/env bash

set -euo pipefail

script_path="${BASH_SOURCE[0]}"
if [[ "$script_path" == */* ]]; then
  script_dir="${script_path%/*}"
else
  script_dir="."
fi

script_dir="$(cd -- "$script_dir" && pwd -P)"
ios_root="$(cd -- "$script_dir/.." && pwd -P)"
repo_root="$(cd -- "$ios_root/.." && pwd -P)"
verify_mode="full"

if [[ "$#" -gt 1 ]]; then
  printf 'Usage: %s [--static]\n' "$0" >&2
  exit 2
fi

if [[ "$#" -eq 1 ]]; then
  if [[ "$1" != "--static" ]]; then
    printf 'Usage: %s [--static]\n' "$0" >&2
    exit 2
  fi

  verify_mode="static"
fi

step() {
  printf '\n==> %s\n' "$1"
}

required_tools=(
  git
  grep
  plutil
  tr
)

if [[ "$verify_mode" == "full" ]]; then
  required_tools+=(
    cat
    codesign
    mkdir
    mktemp
    python3
    rm
    sips
    swift
    xcrun
    xcodebuild
  )
fi

required_files=(
  "$ios_root/project.yml"
  "$ios_root/FORGE.xcodeproj/project.pbxproj"
  "$ios_root/FORGE.xcodeproj/xcshareddata/xcschemes/FORGE.xcscheme"
  "$ios_root/Config/FORGE-Info.plist"
  "$ios_root/Config/FORGE.entitlements"
  "$ios_root/Config/FORGEWidgets-Info.plist"
  "$ios_root/Config/FORGEWidgets.entitlements"
  "$ios_root/Resources/PrivacyInfo.xcprivacy"
  "$ios_root/Resources/Assets.xcassets/Contents.json"
  "$ios_root/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json"
  "$ios_root/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png"
  "$ios_root/Resources/Assets.xcassets/LaunchBackground.colorset/Contents.json"
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/Contents.json"
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark.png"
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark@2x.png"
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark@3x.png"
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark-dark.png"
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark-dark@2x.png"
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark-dark@3x.png"
  "$ios_root/Packages/ForgeCore/Package.swift"
  "$ios_root/Tests/FORGEUITests/FORGEUITests.swift"
)

plist_files=(
  "$ios_root/Config/FORGE-Info.plist"
  "$ios_root/Config/FORGE.entitlements"
  "$ios_root/Config/FORGEWidgets-Info.plist"
  "$ios_root/Config/FORGEWidgets.entitlements"
  "$ios_root/Resources/PrivacyInfo.xcprivacy"
)

json_files=(
  "$ios_root/Resources/Assets.xcassets/Contents.json"
  "$ios_root/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json"
  "$ios_root/Resources/Assets.xcassets/LaunchBackground.colorset/Contents.json"
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/Contents.json"
)

store_metadata_build_arguments=()

validate_store_metadata_url() {
  local setting_name="$1"
  local value="$2"
  local https_url_pattern='^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?([/?#][^[:space:]]*)?$'
  local normalized_value

  if [[ -z "$value" ]]; then
    printf 'FORGE_REQUIRE_STORE_METADATA=1 requires %s.\n' "$setting_name" >&2
    return 1
  fi

  if [[ ! "$value" =~ $https_url_pattern ]]; then
    printf '%s must be a non-placeholder https URL when FORGE_REQUIRE_STORE_METADATA=1.\n' "$setting_name" >&2
    return 1
  fi

  normalized_value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"

  case "$normalized_value" in
    *example.com*|*example.org*|*example.net*|*localhost*|*127.0.0.1*|*0.0.0.0*|*placeholder*|*your-domain*|*your_domain*|*yourdomain*|*changeme*|*change-me*|*replace-me*|*todo*|*tbd*|*\<*|*\>*)
      printf '%s must be a non-placeholder https URL when FORGE_REQUIRE_STORE_METADATA=1.\n' "$setting_name" >&2
      return 1
      ;;
  esac
}

step "Check required tools"
for tool in "${required_tools[@]}"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing required tool: %s\n' "$tool" >&2
    exit 1
  fi
done

step "Check required files"
for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    printf 'Missing required file: %s\n' "$file" >&2
    exit 1
  fi
done

step "Check shell syntax and repository whitespace"
if [[ -z "${BASH:-}" || ! -x "$BASH" ]]; then
  printf 'Cannot find the Bash interpreter for the shell syntax check.\n' >&2
  exit 1
fi

"$BASH" -n "$script_dir/verify.sh"

git -C "$repo_root" diff --check -- ios .github/workflows/ios-quality.yml

step "Validate Apple property lists and JSON files"
for file in "${plist_files[@]}"; do
  plutil -lint "$file"
done

for file in "${json_files[@]}"; do
  plutil -convert xml1 -o /dev/null "$file"
done

require_store_metadata="${FORGE_REQUIRE_STORE_METADATA:-0}"
case "$require_store_metadata" in
  0)
    ;;
  1)
    step "Validate external store metadata configuration"
    store_metadata_validation_failed=0

    if validate_store_metadata_url "FORGE_PRIVACY_POLICY_URL" "${FORGE_PRIVACY_POLICY_URL:-}"; then
      store_metadata_build_arguments+=("FORGE_PRIVACY_POLICY_URL=${FORGE_PRIVACY_POLICY_URL}")
    else
      store_metadata_validation_failed=1
    fi

    if validate_store_metadata_url "FORGE_SUPPORT_URL" "${FORGE_SUPPORT_URL:-}"; then
      store_metadata_build_arguments+=("FORGE_SUPPORT_URL=${FORGE_SUPPORT_URL}")
    else
      store_metadata_validation_failed=1
    fi

    if [[ "$store_metadata_validation_failed" -ne 0 ]]; then
      printf 'External store metadata validation failed. Provide both required build settings.\n' >&2
      exit 1
    fi
    ;;
  *)
    printf 'FORGE_REQUIRE_STORE_METADATA must be 0 or 1.\n' >&2
    exit 2
    ;;
esac

require_asset_build="${FORGE_REQUIRE_ASSET_BUILD:-0}"
case "$require_asset_build" in
  0|1)
    ;;
  *)
    printf 'FORGE_REQUIRE_ASSET_BUILD must be 0 or 1.\n' >&2
    exit 2
    ;;
esac

validate_optional_boolean() {
  local setting_name="$1"
  local setting_value="$2"

  case "$setting_value" in
    0|1)
      printf '%s' "$setting_value"
      ;;
    *)
      printf '%s must be 0 or 1.\n' "$setting_name" >&2
      return 2
      ;;
  esac
}

require_simulator_tests="$(
  validate_optional_boolean \
    'FORGE_REQUIRE_SIMULATOR_TESTS' \
    "${FORGE_REQUIRE_SIMULATOR_TESTS-0}"
)"
require_small_device_ui_tests="$(
  validate_optional_boolean \
    'FORGE_REQUIRE_SMALL_DEVICE_UI_TESTS' \
    "${FORGE_REQUIRE_SMALL_DEVICE_UI_TESTS-0}"
)"
require_ipad_ui_tests="$(
  validate_optional_boolean \
    'FORGE_REQUIRE_IPAD_UI_TESTS' \
    "${FORGE_REQUIRE_IPAD_UI_TESTS-0}"
)"
require_unsigned_archive="$(
  validate_optional_boolean \
    'FORGE_REQUIRE_UNSIGNED_ARCHIVE' \
    "${FORGE_REQUIRE_UNSIGNED_ARCHIVE-0}"
)"

if [[ "$require_small_device_ui_tests" == "1" \
  && "$require_simulator_tests" != "1" ]]; then
  printf '%s\n' \
    'FORGE_REQUIRE_SMALL_DEVICE_UI_TESTS=1 requires FORGE_REQUIRE_SIMULATOR_TESTS=1.' >&2
  exit 2
fi

if [[ "$require_ipad_ui_tests" == "1" \
  && "$require_simulator_tests" != "1" ]]; then
  printf '%s\n' \
    'FORGE_REQUIRE_IPAD_UI_TESTS=1 requires FORGE_REQUIRE_SIMULATOR_TESTS=1.' >&2
  exit 2
fi

simulator_runtime_identifier="${FORGE_SIMULATOR_RUNTIME_IDENTIFIER-}"
if [[ -n "$simulator_runtime_identifier" \
  && ! "$simulator_runtime_identifier" =~ ^com\.apple\.CoreSimulator\.SimRuntime\.iOS-[0-9]+(-[0-9]+)*$ ]]; then
  printf '%s\n' \
    'FORGE_SIMULATOR_RUNTIME_IDENTIFIER must be an available iOS Simulator runtime identifier.' >&2
  exit 2
fi

if [[ "$verify_mode" == "static" ]]; then
  step "Static iOS verification completed"
  exit 0
fi

check_launch_mark_dimensions() {
  local image_path="$1"
  local expected_width="$2"
  local expected_height="$3"
  local image_properties
  local actual_width
  local actual_height

  if ! image_properties="$(sips -g pixelWidth -g pixelHeight "$image_path" 2>&1)"; then
    printf 'Could not read launch image dimensions: %s\n' "$image_path" >&2
    printf '%s\n' "$image_properties" >&2
    return 1
  fi

  actual_width="$(
    printf '%s\n' "$image_properties" \
      | grep -E '^[[:space:]]*pixelWidth: [0-9]+$' \
      | tr -d '[:space:]' \
      || true
  )"
  actual_height="$(
    printf '%s\n' "$image_properties" \
      | grep -E '^[[:space:]]*pixelHeight: [0-9]+$' \
      | tr -d '[:space:]' \
      || true
  )"

  if [[ "$actual_width" != "pixelWidth:$expected_width" ]] \
    || [[ "$actual_height" != "pixelHeight:$expected_height" ]]; then
    printf 'Launch image dimensions do not match: %s\n' "$image_path" >&2
    printf 'Expected: %sx%s\n' "$expected_width" "$expected_height" >&2
    printf 'Found: %s x %s\n' "$actual_width" "$actual_height" >&2
    return 1
  fi
}

step "Validate launch image dimensions"
check_launch_mark_dimensions \
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark.png" \
  180 144
check_launch_mark_dimensions \
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark@2x.png" \
  360 288
check_launch_mark_dimensions \
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark@3x.png" \
  540 432
check_launch_mark_dimensions \
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark-dark.png" \
  180 144
check_launch_mark_dimensions \
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark-dark@2x.png" \
  360 288
check_launch_mark_dimensions \
  "$ios_root/Resources/Assets.xcassets/LaunchMark.imageset/LaunchMark-dark@3x.png" \
  540 432

temp_base="${TMPDIR:-/tmp}"
temp_base="${temp_base%/}"

if [[ -z "$temp_base" || "$temp_base" != /* ]]; then
  printf 'The temporary directory must be an absolute path.\n' >&2
  exit 1
fi

if [[ ! -d "$temp_base" ]]; then
  printf 'The temporary directory does not exist: %s\n' "$temp_base" >&2
  exit 1
fi

if [[ ! -w "$temp_base" ]]; then
  printf 'The temporary directory is not writable: %s\n' "$temp_base" >&2
  exit 1
fi

if ! scratch_root="$(mktemp -d "$temp_base/forge-ios-verify.XXXXXX")"; then
  printf 'Cannot create the verification temporary directory in: %s\n' "$temp_base" >&2
  exit 1
fi

created_simulator_ids=()
created_simulator_names=()
created_simulator_runtimes=()

delete_generated_simulator() {
  local simulator_id="$1"
  local expected_name="$2"
  local expected_runtime="$3"
  local simulator_catalog="$scratch_root/simctl-cleanup-$simulator_id.json"
  local match_status

  if [[ ! "$simulator_id" =~ ^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$ ]]; then
    printf 'Refused to delete an unexpected simulator identifier: %s\n' "$simulator_id" >&2
    return 1
  fi

  if [[ "$expected_name" != FORGE-verify-* ]]; then
    printf 'Refused to delete a simulator without the generated FORGE name: %s\n' \
      "$expected_name" >&2
    return 1
  fi

  if ! xcrun simctl list devices -j >"$simulator_catalog" 2>&1; then
    printf 'Could not inspect the generated simulator before cleanup: %s\n' \
      "$simulator_id" >&2
    return 1
  fi

  if python3 - "$simulator_catalog" "$simulator_id" "$expected_name" "$expected_runtime" <<'PY'
import json
import sys

catalog_path, simulator_id, expected_name, expected_runtime = sys.argv[1:]
payload = json.load(open(catalog_path, encoding="utf-8"))

for runtime, devices in payload.get("devices", {}).items():
    for device in devices:
        if device.get("udid") != simulator_id:
            continue
        if runtime != expected_runtime or device.get("name") != expected_name:
            raise SystemExit(1)
        raise SystemExit(0)

raise SystemExit(2)
PY
  then
    xcrun simctl shutdown "$simulator_id" >/dev/null 2>&1 || true
    if ! xcrun simctl delete "$simulator_id" >/dev/null 2>&1; then
      printf 'Could not delete the generated simulator: %s\n' "$simulator_id" >&2
      return 1
    fi
    return 0
  else
    match_status=$?
    if [[ "$match_status" -eq 2 ]]; then
      return 0
    fi

    printf 'Refused to delete a simulator that does not match the generated record: %s\n' \
      "$simulator_id" >&2
    return 1
  fi
}

cleanup() {
  local original_status=$?
  local cleanup_failed=0
  local simulator_index

  trap - EXIT
  set +e

  for ((simulator_index = ${#created_simulator_ids[@]} - 1; simulator_index >= 0; simulator_index--)); do
    if ! delete_generated_simulator \
      "${created_simulator_ids[$simulator_index]}" \
      "${created_simulator_names[$simulator_index]}" \
      "${created_simulator_runtimes[$simulator_index]}"; then
      cleanup_failed=1
    fi
  done

  case "$scratch_root" in
    "$temp_base"/forge-ios-verify.*)
      if ! rm -rf -- "$scratch_root"; then
        printf 'Could not remove the generated temporary path: %s\n' "$scratch_root" >&2
        cleanup_failed=1
      fi
      ;;
    *)
      printf 'Refused to remove an unexpected temporary path: %s\n' "$scratch_root" >&2
      cleanup_failed=1
      ;;
  esac

  if [[ "$original_status" -eq 0 && "$cleanup_failed" -ne 0 ]]; then
    exit 1
  fi

  exit "$original_status"
}

trap cleanup EXIT

module_cache="$scratch_root/ModuleCache"
package_cache="$scratch_root/PackageCache"
task_cache="$scratch_root/Cache"
if ! mkdir -p "$module_cache" "$package_cache" "$task_cache"; then
  printf 'Cannot create verification cache directories in: %s\n' "$scratch_root" >&2
  exit 1
fi

export CLANG_MODULE_CACHE_PATH="$module_cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$module_cache"
export XDG_CACHE_HOME="$task_cache"

step "Check iOS device SDK"
iphoneos_sdk_log="$scratch_root/iphoneos-sdk.log"
if ! iphoneos_sdk_version="$(xcrun --sdk iphoneos --show-sdk-version 2>"$iphoneos_sdk_log")"; then
  printf 'The required iOS device SDK is not available.\n' >&2
  printf 'Select an Xcode installation with the iphoneos SDK.\n' >&2
  cat "$iphoneos_sdk_log" >&2
  exit 1
fi

iphoneos_sdk_major="${iphoneos_sdk_version%%.*}"
if [[ ! "$iphoneos_sdk_major" =~ ^[0-9]+$ ]] || (( 10#$iphoneos_sdk_major < 26 )); then
  printf 'The iphoneos SDK major version must be 26 or later. Found: %s\n' "$iphoneos_sdk_version" >&2
  exit 1
fi

printf 'The iphoneos SDK version is %s.\n' "$iphoneos_sdk_version"

step "Run ForgeCore tests"
swift test \
  --disable-sandbox \
  --package-path "$ios_root/Packages/ForgeCore" \
  --scratch-path "$scratch_root/ForgeCore"

step "Read the Xcode project"
project_list="$scratch_root/project-list.json"
if ! xcodebuild \
  -project "$ios_root/FORGE.xcodeproj" \
  -packageCachePath "$package_cache" \
  -list \
  -json >"$project_list" 2>&1; then
  printf 'Cannot read the Xcode project: %s\n' "$ios_root/FORGE.xcodeproj" >&2
  cat "$project_list" >&2
  exit 1
fi

if ! grep -q '"FORGE"' "$project_list"; then
  printf 'The FORGE scheme is not available.\n' >&2
  exit 1
fi

build_arguments=(
  -project "$ios_root/FORGE.xcodeproj" \
  -packageCachePath "$package_cache" \
  -target FORGE \
  -sdk iphoneos \
  OBJROOT="$scratch_root/Build/Intermediates" \
  SYMROOT="$scratch_root/Build/Products" \
  SHARED_PRECOMPS_DIR="$scratch_root/Build/PrecompiledHeaders" \
  ARCHS=arm64 \
  ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED=NO \
  COMPILER_INDEX_STORE_ENABLE=NO \
  -quiet
)

if [[ "${#store_metadata_build_arguments[@]}" -gt 0 ]]; then
  build_arguments+=("${store_metadata_build_arguments[@]}")
fi

asset_build_needs_simulator_runtime() {
  grep -Eqi \
    'No available simulator runtimes|Unable to find a simulator runtime|Failed to locate any simulator runtime' \
    "$1"
}

asset_fallback_announced=0
for configuration in Debug Release; do
  step "Build the unsigned arm64 $configuration iOS device target"
  build_log="$scratch_root/xcodebuild-$configuration.log"

  if ! xcodebuild \
    "${build_arguments[@]}" \
    -configuration "$configuration" \
    build >"$build_log" 2>&1; then
    if ! asset_build_needs_simulator_runtime "$build_log"; then
      printf 'The unsigned arm64 %s iOS device build failed.\n' "$configuration" >&2
      cat "$build_log" >&2
      exit 1
    fi

    if [[ "$require_asset_build" == "1" ]]; then
      printf 'The full asset build requires an installed iOS Simulator runtime.\n' >&2
      printf 'No source-only fallback is permitted when FORGE_REQUIRE_ASSET_BUILD=1.\n' >&2
      cat "$build_log" >&2
      exit 1
    fi

    if [[ "$asset_fallback_announced" -eq 0 ]]; then
      printf '%s\n' \
        "No iOS Simulator runtime is installed. The script will continue with source-only builds."
      printf '%s\n' \
        "Set FORGE_REQUIRE_ASSET_BUILD=1 to make this condition fail."
      asset_fallback_announced=1
    fi

    cat "$build_log"
    step "Build $configuration application source without asset compilation"
    printf '%s\n' \
      "No simulator runtime is installed. The static checks validated the AppIcon files."
    xcodebuild \
      "${build_arguments[@]}" \
      -configuration "$configuration" \
      EXCLUDED_SOURCE_FILE_NAMES=Assets.xcassets \
      ASSETCATALOG_COMPILER_APPICON_NAME= \
      build
  fi
done

step "Compile the unsigned arm64 app unit test source"
xcodebuild \
  -project "$ios_root/FORGE.xcodeproj" \
  -packageCachePath "$package_cache" \
  -target FORGEAppTests \
  -configuration Debug \
  -sdk iphoneos \
  OBJROOT="$scratch_root/Build/Intermediates" \
  SYMROOT="$scratch_root/Build/Products" \
  SHARED_PRECOMPS_DIR="$scratch_root/Build/PrecompiledHeaders" \
  ARCHS=arm64 \
  ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED=NO \
  COMPILER_INDEX_STORE_ENABLE=NO \
  "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
  EXCLUDED_SOURCE_FILE_NAMES=Assets.xcassets \
  ASSETCATALOG_COMPILER_APPICON_NAME= \
  -quiet \
  build

step "Compile the unsigned arm64 UI test source"
xcodebuild \
  -project "$ios_root/FORGE.xcodeproj" \
  -packageCachePath "$package_cache" \
  -target FORGEUITests \
  -configuration Debug \
  -sdk iphoneos \
  OBJROOT="$scratch_root/Build/Intermediates" \
  SYMROOT="$scratch_root/Build/Products" \
  SHARED_PRECOMPS_DIR="$scratch_root/Build/PrecompiledHeaders" \
  ARCHS=arm64 \
  ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED=NO \
  COMPILER_INDEX_STORE_ENABLE=NO \
  "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
  EXCLUDED_SOURCE_FILE_NAMES=Assets.xcassets \
  ASSETCATALOG_COMPILER_APPICON_NAME= \
  -quiet \
  build

resolve_generated_output_path() {
  local setting_name="$1"
  local requested_path="$2"
  local default_name="$3"
  local output_path
  local output_parent

  if [[ -n "$requested_path" ]]; then
    output_path="$requested_path"
  else
    output_path="$scratch_root/$default_name"
  fi

  if [[ "$output_path" != /* ]]; then
    printf '%s must be an absolute path.\n' "$setting_name" >&2
    return 2
  fi

  output_parent="${output_path%/*}"
  if [[ -z "$output_parent" ]]; then
    output_parent="/"
  fi

  if [[ ! -d "$output_parent" ]]; then
    printf 'The output parent directory does not exist: %s\n' "$output_parent" >&2
    return 1
  fi

  if [[ ! -w "$output_parent" ]]; then
    printf 'The output parent directory is not writable: %s\n' "$output_parent" >&2
    return 1
  fi

  if [[ -e "$output_path" ]]; then
    printf 'The output path already exists: %s\n' "$output_path" >&2
    return 1
  fi

  printf '%s' "$output_path"
}

assert_result_bundle() {
  local result_bundle="$1"
  local gate_name="$2"
  local expected_simulator_id="$3"
  local expected_test_method="$4"
  local result_bundle_info_plist="$result_bundle/Info.plist"
  local result_summary="$scratch_root/$gate_name-result-summary.json"
  local result_tests="$scratch_root/$gate_name-result-tests.json"

  if [[ ! -d "$result_bundle" ]]; then
    printf 'The %s result bundle was not created: %s\n' "$gate_name" "$result_bundle" >&2
    return 1
  fi

  if [[ ! -s "$result_bundle_info_plist" ]]; then
    printf 'The %s result bundle Info.plist is missing or empty: %s\n' \
      "$gate_name" "$result_bundle_info_plist" >&2
    return 1
  fi

  if ! xcrun xcresulttool get test-results summary \
    --path "$result_bundle" \
    --format json >"$result_summary"; then
    printf 'Could not read the %s test summary: %s\n' "$gate_name" "$result_bundle" >&2
    return 1
  fi

  if ! xcrun xcresulttool get test-results tests \
    --path "$result_bundle" \
    --format json >"$result_tests"; then
    printf 'Could not read the %s test records: %s\n' "$gate_name" "$result_bundle" >&2
    return 1
  fi

  if ! python3 - \
    "$result_summary" \
    "$result_tests" \
    "$expected_simulator_id" \
    "$expected_test_method" \
    "$gate_name" <<'PY'
import json
import sys

summary_path, tests_path, expected_device_id, expected_test_method, gate_name = sys.argv[1:]
summary = json.load(open(summary_path, encoding="utf-8"))
tests = json.load(open(tests_path, encoding="utf-8"))

if summary.get("result") != "Passed":
    raise SystemExit(f"{gate_name} did not report Passed.")

if int(summary.get("failedTests", 0)) != 0:
    raise SystemExit(f"{gate_name} reported failed tests.")

if int(summary.get("skippedTests", 0)) != 0:
    raise SystemExit(f"{gate_name} reported skipped tests.")

if int(summary.get("totalTestCount", 0)) < 1:
    raise SystemExit(f"{gate_name} did not report any tests.")

device_ids = {
    configuration.get("device", {}).get("deviceId")
    for configuration in summary.get("devicesAndConfigurations", [])
}
if expected_device_id not in device_ids:
    raise SystemExit(f"{gate_name} did not run on the requested simulator UDID.")

if expected_test_method:
    def walk(nodes):
        for node in nodes:
            yield node
            yield from walk(node.get("children", []))

    matching_nodes = [
        node
        for node in walk(tests.get("testNodes", []))
        if expected_test_method in node.get("nodeIdentifier", "")
    ]
    if not matching_nodes:
        raise SystemExit(f"{gate_name} did not record the required UI test.")
    if any(node.get("result") != "Passed" for node in matching_nodes):
        raise SystemExit(f"{gate_name} did not pass the required UI test.")
PY
  then
    printf 'The %s result bundle did not meet the fail-closed gate.\n' "$gate_name" >&2
    return 1
  fi
}

resolve_simulator_targets() {
  local runtime_catalog="$1"
  local resolved_targets

  if ! resolved_targets="$(
    python3 - \
      "$runtime_catalog" \
      "$simulator_runtime_identifier" \
      "$require_small_device_ui_tests" \
      "$require_ipad_ui_tests" <<'PY'
import json
import re
import sys

runtime_catalog, requested_runtime, require_small, require_ipad = sys.argv[1:]
require_small = require_small == "1"
require_ipad = require_ipad == "1"
payload = json.load(open(runtime_catalog, encoding="utf-8"))

primary_type = "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro"
small_candidates = [
    ("com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation", 375),
    ("com.apple.CoreSimulator.SimDeviceType.iPhone-SE-2nd-generation", 375),
    ("com.apple.CoreSimulator.SimDeviceType.iPhone-13-mini", 375),
    ("com.apple.CoreSimulator.SimDeviceType.iPhone-12-mini", 375),
]
ipad_a16 = "com.apple.CoreSimulator.SimDeviceType.iPad-A16"

def version_key(runtime):
    values = [int(value) for value in re.findall(r"\d+", runtime.get("identifier", ""))]
    return tuple(values)

runtimes = [
    runtime
    for runtime in payload.get("runtimes", [])
    if runtime.get("isAvailable") and runtime.get("platform") == "iOS"
]
if requested_runtime:
    runtimes = [
        runtime for runtime in runtimes
        if runtime.get("identifier") == requested_runtime
    ]

for runtime in sorted(runtimes, key=version_key, reverse=True):
    supported = {
        device_type.get("identifier"): device_type
        for device_type in runtime.get("supportedDeviceTypes", [])
        if device_type.get("identifier")
    }
    if primary_type not in supported:
        continue

    small_type = ""
    small_points = ""
    if require_small:
        for candidate, points in small_candidates:
            if candidate in supported:
                small_type = candidate
                small_points = str(points)
                break
        if not small_type:
            continue

    ipad_type = ""
    if require_ipad:
        if ipad_a16 in supported:
            ipad_type = ipad_a16
        else:
            fallback_ipads = sorted(
                device_type.get("identifier", "")
                for device_type in supported.values()
                if device_type.get("productFamily") == "iPad"
            )
            if not fallback_ipads:
                continue
            ipad_type = fallback_ipads[0]

    print(f"runtime_identifier={runtime['identifier']}")
    print(f"primary_device_type={primary_type}")
    print(f"small_device_type={small_type}")
    print(f"small_device_width_points={small_points}")
    print(f"ipad_device_type={ipad_type}")
    raise SystemExit(0)

if requested_runtime:
    raise SystemExit(
        "The requested iOS Simulator runtime cannot satisfy the required FORGE device gates."
    )
raise SystemExit("No available iOS Simulator runtime can satisfy the required FORGE device gates.")
PY
  )"; then
    return 1
  fi

  selected_runtime_identifier=""
  primary_device_type=""
  small_device_type=""
  small_device_width_points=""
  ipad_device_type=""

  while IFS='=' read -r target_key target_value; do
    case "$target_key" in
      runtime_identifier)
        selected_runtime_identifier="$target_value"
        ;;
      primary_device_type)
        primary_device_type="$target_value"
        ;;
      small_device_type)
        small_device_type="$target_value"
        ;;
      small_device_width_points)
        small_device_width_points="$target_value"
        ;;
      ipad_device_type)
        ipad_device_type="$target_value"
        ;;
      *)
        printf 'The simulator target resolver returned an unexpected key: %s\n' \
          "$target_key" >&2
        return 1
        ;;
    esac
  done <<< "$resolved_targets"

  if [[ -z "$selected_runtime_identifier" || -z "$primary_device_type" ]]; then
    printf 'The simulator target resolver did not return the primary target.\n' >&2
    return 1
  fi

  if [[ "$require_small_device_ui_tests" == "1" \
    && ( -z "$small_device_type" \
      || ! "$small_device_width_points" =~ ^[0-9]+$ \
      || "$small_device_width_points" -gt 390 ) ]]; then
    printf 'The selected small iPhone is not 390 points wide or narrower.\n' >&2
    return 1
  fi

  if [[ "$require_ipad_ui_tests" == "1" && -z "$ipad_device_type" ]]; then
    printf 'The simulator target resolver did not return an iPad target.\n' >&2
    return 1
  fi
}

assert_generated_simulator_record() {
  local simulator_id="$1"
  local expected_name="$2"
  local expected_type="$3"
  local expected_runtime="$4"
  local simulator_catalog="$scratch_root/simctl-created-$simulator_id.json"

  if ! xcrun simctl list devices -j >"$simulator_catalog" 2>&1; then
    printf 'Could not inspect the generated simulator: %s\n' "$simulator_id" >&2
    return 1
  fi

  python3 - \
    "$simulator_catalog" \
    "$simulator_id" \
    "$expected_name" \
    "$expected_type" \
    "$expected_runtime" <<'PY'
import json
import sys

catalog_path, simulator_id, expected_name, expected_type, expected_runtime = sys.argv[1:]
payload = json.load(open(catalog_path, encoding="utf-8"))

for runtime, devices in payload.get("devices", {}).items():
    for device in devices:
        if device.get("udid") != simulator_id:
            continue
        if runtime != expected_runtime:
            raise SystemExit("The generated simulator runtime does not match.")
        if device.get("name") != expected_name:
            raise SystemExit("The generated simulator name does not match.")
        if device.get("deviceTypeIdentifier") != expected_type:
            raise SystemExit("The generated simulator device type does not match.")
        if not device.get("isAvailable"):
            raise SystemExit("The generated simulator is not available.")
        raise SystemExit(0)

raise SystemExit("The generated simulator was not found.")
PY
}

create_generated_simulator() {
  local gate_name="$1"
  local device_type="$2"
  local generated_name="$simulator_name_prefix-$gate_name"
  local generated_id
  local create_log="$scratch_root/$gate_name-simulator-create.log"

  if ! generated_id="$(
    xcrun simctl create \
      "$generated_name" \
      "$device_type" \
      "$selected_runtime_identifier" 2>"$create_log"
  )"; then
    printf 'Could not create the generated %s simulator.\n' "$gate_name" >&2
    cat "$create_log" >&2
    return 1
  fi

  generated_id="$(printf '%s' "$generated_id" | tr -d '\r\n')"
  if [[ ! "$generated_id" =~ ^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$ ]]; then
    printf 'The generated %s simulator identifier is invalid: %s\n' \
      "$gate_name" "$generated_id" >&2
    return 1
  fi

  created_simulator_ids+=("$generated_id")
  created_simulator_names+=("$generated_name")
  created_simulator_runtimes+=("$selected_runtime_identifier")

  assert_generated_simulator_record \
    "$generated_id" \
    "$generated_name" \
    "$device_type" \
    "$selected_runtime_identifier"

  created_simulator_id="$generated_id"
  created_simulator_name="$generated_name"
  created_simulator_runtime="$selected_runtime_identifier"
}

boot_generated_simulator() {
  local simulator_id="$1"
  local gate_name="$2"
  local boot_log="$scratch_root/$gate_name-simulator-boot.log"

  if ! xcrun simctl boot "$simulator_id" >"$boot_log" 2>&1; then
    if ! xcrun simctl bootstatus "$simulator_id" -b >>"$boot_log" 2>&1; then
      printf 'Could not boot the generated %s simulator: %s\n' \
        "$gate_name" "$simulator_id" >&2
      cat "$boot_log" >&2
      return 1
    fi
    return 0
  fi

  if ! xcrun simctl bootstatus "$simulator_id" -b >>"$boot_log" 2>&1; then
    printf 'The generated %s simulator did not finish booting: %s\n' \
      "$gate_name" "$simulator_id" >&2
    cat "$boot_log" >&2
    return 1
  fi
}

if [[ "$require_simulator_tests" == "1" ]]; then
  step "Resolve deterministic iOS Simulator targets"
  simulator_runtime_catalog="$scratch_root/simctl-runtimes.json"
  if ! xcrun simctl list runtimes -j >"$simulator_runtime_catalog" 2>&1; then
    printf 'Could not list available iOS Simulator runtimes.\n' >&2
    exit 1
  fi

  if ! resolve_simulator_targets "$simulator_runtime_catalog"; then
    exit 1
  fi

  printf 'Selected simulator runtime: %s\n' "$selected_runtime_identifier"
  printf 'Selected primary simulator type: %s\n' "$primary_device_type"
  if [[ "$require_small_device_ui_tests" == "1" ]]; then
    printf 'Selected narrow iPhone type: %s (%s points wide)\n' \
      "$small_device_type" "$small_device_width_points"
  fi
  if [[ "$require_ipad_ui_tests" == "1" ]]; then
    printf 'Selected iPad simulator type: %s\n' "$ipad_device_type"
  fi

  simulator_name_suffix="${scratch_root##*.}-$RANDOM-$$"
  simulator_name_prefix="FORGE-verify-$simulator_name_suffix"
  if ! primary_result_bundle="$(
    resolve_generated_output_path \
      'FORGE_RESULT_BUNDLE_PATH' \
      "${FORGE_RESULT_BUNDLE_PATH-}" \
      'FORGE-primary-simulator-tests.xcresult'
  )"; then
    exit 1
  fi

  small_result_bundle=""
  if [[ "$require_small_device_ui_tests" == "1" ]]; then
    if ! small_result_bundle="$(
      resolve_generated_output_path \
        'FORGE_SMALL_DEVICE_RESULT_BUNDLE_PATH' \
        "${FORGE_SMALL_DEVICE_RESULT_BUNDLE_PATH-}" \
        'FORGE-small-device-ui-tests.xcresult'
    )"; then
      exit 1
    fi
    if [[ "$primary_result_bundle" == "$small_result_bundle" ]]; then
      printf 'The primary and small-device result bundle paths must be different.\n' >&2
      exit 2
    fi
  fi

  ipad_result_bundle=""
  if [[ "$require_ipad_ui_tests" == "1" ]]; then
    if ! ipad_result_bundle="$(
      resolve_generated_output_path \
        'FORGE_IPAD_RESULT_BUNDLE_PATH' \
        "${FORGE_IPAD_RESULT_BUNDLE_PATH-}" \
        'FORGE-iPad-semester-desk-ui-tests.xcresult'
    )"; then
      exit 1
    fi
    if [[ "$primary_result_bundle" == "$ipad_result_bundle" \
      || ( -n "$small_result_bundle" && "$small_result_bundle" == "$ipad_result_bundle" ) ]]; then
      printf 'Each simulator result bundle path must be different.\n' >&2
      exit 2
    fi
  fi

  step "Create the primary iPhone 17 Pro simulator"
  create_generated_simulator primary "$primary_device_type"
  primary_simulator_id="$created_simulator_id"
  primary_simulator_name="$created_simulator_name"
  primary_simulator_runtime="$created_simulator_runtime"
  printf 'Primary simulator UDID: %s\n' "$primary_simulator_id"

  simulator_derived_data="$scratch_root/SimulatorDerivedData"
  simulator_base_arguments=(
    -project "$ios_root/FORGE.xcodeproj"
    -packageCachePath "$package_cache"
    -scheme FORGE
    -configuration Debug
    -sdk iphonesimulator
    -destination-timeout 180
    -parallel-testing-enabled NO
    -maximum-parallel-testing-workers 1
    -derivedDataPath "$simulator_derived_data"
    COMPILER_INDEX_STORE_ENABLE=NO
  )

  step "Build deterministic iOS Simulator test products"
  xcodebuild \
    "${simulator_base_arguments[@]}" \
    -destination "platform=iOS Simulator,id=$primary_simulator_id" \
    -only-testing:FORGEAppTests \
    -only-testing:FORGEUITests \
    -skip-testing:FORGEUITests/FORGEUITests/testSmallDeviceLayoutKeepsCoreSemesterDeskActionsVisible \
    "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
    build-for-testing

  simulator_app="$simulator_derived_data/Build/Products/Debug-iphonesimulator/FORGE.app"
  simulator_widget="$simulator_derived_data/Build/Products/Debug-iphonesimulator/FORGE.app/PlugIns/FORGEWidgets.appex"
  simulator_app_simulated_entitlements="$simulator_derived_data/Build/Intermediates.noindex/FORGE.build/Debug-iphonesimulator/FORGE.build/FORGE.app-Simulated.xcent"
  simulator_widget_simulated_entitlements="$simulator_derived_data/Build/Intermediates.noindex/FORGE.build/Debug-iphonesimulator/FORGEWidgets.build/FORGEWidgets.appex-Simulated.xcent"

  if [[ ! -d "$simulator_app" ]]; then
    printf 'The built simulator app was not created: %s\n' "$simulator_app" >&2
    exit 1
  fi

  if [[ ! -d "$simulator_widget" ]]; then
    printf 'The built simulator widget extension was not created: %s\n' \
      "$simulator_widget" >&2
    exit 1
  fi

  if [[ ! -s "$simulator_app_simulated_entitlements" ]]; then
    printf 'The built simulator app entitlements are missing: %s\n' \
      "$simulator_app_simulated_entitlements" >&2
    exit 1
  fi

  if [[ ! -s "$simulator_widget_simulated_entitlements" ]]; then
    printf 'The built simulator widget entitlements are missing: %s\n' \
      "$simulator_widget_simulated_entitlements" >&2
    exit 1
  fi

  if ! simulator_app_group_count="$(
    plutil -extract 'com\.apple\.security\.application-groups' raw -o - \
      "$simulator_app_simulated_entitlements"
  )"; then
    printf 'Could not read the built simulator app entitlements: %s\n' \
      "$simulator_app_simulated_entitlements" >&2
    exit 1
  fi

  if ! simulator_app_group="$(
    plutil -extract 'com\.apple\.security\.application-groups.0' raw -o - \
      "$simulator_app_simulated_entitlements"
  )"; then
    printf 'Could not read the built simulator App Group entitlement: %s\n' \
      "$simulator_app_simulated_entitlements" >&2
    exit 1
  fi

  if ! simulator_widget_group_count="$(
    plutil -extract 'com\.apple\.security\.application-groups' raw -o - \
      "$simulator_widget_simulated_entitlements"
  )"; then
    printf 'Could not read the built simulator widget entitlements: %s\n' \
      "$simulator_widget_simulated_entitlements" >&2
    exit 1
  fi

  if ! simulator_widget_group="$(
    plutil -extract 'com\.apple\.security\.application-groups.0' raw -o - \
      "$simulator_widget_simulated_entitlements"
  )"; then
    printf 'Could not read the built simulator widget App Group entitlement: %s\n' \
      "$simulator_widget_simulated_entitlements" >&2
    exit 1
  fi

  if [[ "$simulator_app_group_count" != "1" ]]; then
    printf 'The built simulator app must contain exactly one App Group entitlement.\n' >&2
    exit 1
  fi

  if [[ "$simulator_app_group" != "group.com.forgelearning.shared" ]]; then
    printf 'The built simulator app App Group entitlement must equal group.com.forgelearning.shared.\n' >&2
    exit 1
  fi

  if [[ "$simulator_widget_group_count" != "1" ]]; then
    printf 'The built simulator widget must contain exactly one App Group entitlement.\n' >&2
    exit 1
  fi

  if [[ "$simulator_widget_group" != "group.com.forgelearning.shared" ]]; then
    printf 'The built simulator widget App Group entitlement must equal group.com.forgelearning.shared.\n' >&2
    exit 1
  fi

  step "Run complete iPhone 17 Pro tests"
  boot_generated_simulator "$primary_simulator_id" primary
  xcodebuild \
    "${simulator_base_arguments[@]}" \
    -destination "platform=iOS Simulator,id=$primary_simulator_id" \
    -only-testing:FORGEAppTests \
    -only-testing:FORGEUITests \
    -skip-testing:FORGEUITests/FORGEUITests/testSmallDeviceLayoutKeepsCoreSemesterDeskActionsVisible \
    -resultBundlePath "$primary_result_bundle" \
    "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
    test-without-building
  assert_result_bundle "$primary_result_bundle" primary "$primary_simulator_id" ''
  delete_generated_simulator \
    "$primary_simulator_id" \
    "$primary_simulator_name" \
    "$primary_simulator_runtime"

  if [[ "$require_small_device_ui_tests" == "1" ]]; then
    step "Run the narrow iPhone Semester Desk layout test"
    create_generated_simulator small "$small_device_type"
    small_simulator_id="$created_simulator_id"
    small_simulator_name="$created_simulator_name"
    small_simulator_runtime="$created_simulator_runtime"
    printf 'Narrow iPhone simulator UDID: %s\n' "$small_simulator_id"
    boot_generated_simulator "$small_simulator_id" small
    xcodebuild \
      "${simulator_base_arguments[@]}" \
      -destination "platform=iOS Simulator,id=$small_simulator_id" \
      -only-testing:FORGEUITests/FORGEUITests/testSmallDeviceLayoutKeepsCoreSemesterDeskActionsVisible \
      -resultBundlePath "$small_result_bundle" \
      "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
      test-without-building
    assert_result_bundle \
      "$small_result_bundle" \
      small-device \
      "$small_simulator_id" \
      'testSmallDeviceLayoutKeepsCoreSemesterDeskActionsVisible'
    delete_generated_simulator \
      "$small_simulator_id" \
      "$small_simulator_name" \
      "$small_simulator_runtime"
  fi

  if [[ "$require_ipad_ui_tests" == "1" ]]; then
    step "Run the iPad Semester Desk journey"
    create_generated_simulator ipad "$ipad_device_type"
    ipad_simulator_id="$created_simulator_id"
    ipad_simulator_name="$created_simulator_name"
    ipad_simulator_runtime="$created_simulator_runtime"
    printf 'iPad simulator UDID: %s\n' "$ipad_simulator_id"
    boot_generated_simulator "$ipad_simulator_id" ipad
    xcodebuild \
      "${simulator_base_arguments[@]}" \
      -destination "platform=iOS Simulator,id=$ipad_simulator_id" \
      -only-testing:FORGEUITests/FORGEUITests/testSemesterTruthCapacityRecoveryAndNextActionFlow \
      "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
      build-for-testing
    xcodebuild \
      "${simulator_base_arguments[@]}" \
      -destination "platform=iOS Simulator,id=$ipad_simulator_id" \
      -only-testing:FORGEUITests/FORGEUITests/testSemesterTruthCapacityRecoveryAndNextActionFlow \
      -resultBundlePath "$ipad_result_bundle" \
      "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
      test-without-building
    assert_result_bundle \
      "$ipad_result_bundle" \
      iPad \
      "$ipad_simulator_id" \
      'testSemesterTruthCapacityRecoveryAndNextActionFlow'
    delete_generated_simulator \
      "$ipad_simulator_id" \
      "$ipad_simulator_name" \
      "$ipad_simulator_runtime"
  fi
fi

if [[ "$require_unsigned_archive" == "1" ]]; then
  step "Create an unsigned generic iOS Release archive"
  if ! unsigned_archive_path="$(
    resolve_generated_output_path \
      'FORGE_UNSIGNED_ARCHIVE_PATH' \
      "${FORGE_UNSIGNED_ARCHIVE_PATH-}" \
      'FORGE-unsigned-release.xcarchive'
  )"; then
    exit 1
  fi

  if [[ "$unsigned_archive_path" != *.xcarchive ]]; then
    printf 'FORGE_UNSIGNED_ARCHIVE_PATH must end with .xcarchive.\n' >&2
    exit 2
  fi

  xcodebuild \
    -project "$ios_root/FORGE.xcodeproj" \
    -packageCachePath "$package_cache" \
    -scheme FORGE \
    -configuration Release \
    -sdk iphoneos \
    -destination 'generic/platform=iOS' \
    -archivePath "$unsigned_archive_path" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    AD_HOC_CODE_SIGNING_ALLOWED=NO \
    COMPILER_INDEX_STORE_ENABLE=NO \
    "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
    archive

  archive_app="$unsigned_archive_path/Products/Applications/FORGE.app"
  archive_widget="$archive_app/PlugIns/FORGEWidgets.appex"
  archive_app_info="$archive_app/Info.plist"
  archive_widget_info="$archive_widget/Info.plist"

  for archive_path in "$archive_app" "$archive_widget"; do
    if [[ ! -d "$archive_path" ]]; then
      printf 'The unsigned Release archive content is missing: %s\n' "$archive_path" >&2
      exit 1
    fi
  done

  for archive_info in "$archive_app_info" "$archive_widget_info"; do
    if [[ ! -s "$archive_info" ]]; then
      printf 'The unsigned Release archive Info.plist is missing: %s\n' "$archive_info" >&2
      exit 1
    fi
    plutil -lint "$archive_info"
  done

  archive_app_bundle_identifier="$(
    plutil -extract CFBundleIdentifier raw -o - "$archive_app_info"
  )"
  archive_widget_bundle_identifier="$(
    plutil -extract CFBundleIdentifier raw -o - "$archive_widget_info"
  )"
  if [[ "$archive_app_bundle_identifier" != 'com.forgelearning.app' ]]; then
    printf 'The unsigned Release archive app bundle identifier is unexpected: %s\n' \
      "$archive_app_bundle_identifier" >&2
    exit 1
  fi

  if [[ "$archive_widget_bundle_identifier" != 'com.forgelearning.app.widgets' ]]; then
    printf 'The unsigned Release archive widget bundle identifier is unexpected: %s\n' \
      "$archive_widget_bundle_identifier" >&2
    exit 1
  fi

  if [[ -e "$archive_app/embedded.mobileprovision" \
    || -e "$archive_widget/embedded.mobileprovision" ]]; then
    printf 'The unsigned Release archive must not contain provisioning profiles.\n' >&2
    exit 1
  fi

  archive_app_codesign_log="$scratch_root/archive-app-codesign.log"
  archive_widget_codesign_log="$scratch_root/archive-widget-codesign.log"
  if codesign --verify --strict "$archive_app" >"$archive_app_codesign_log" 2>&1; then
    printf 'The Release archive app unexpectedly has a code signature.\n' >&2
    exit 1
  fi

  if codesign --verify --strict "$archive_widget" >"$archive_widget_codesign_log" 2>&1; then
    printf 'The Release archive widget unexpectedly has a code signature.\n' >&2
    exit 1
  fi

  printf '%s\n' \
    'The unsigned generic iOS Release archive passed content checks. This is not signed archive or physical-device proof.'
fi

step "iOS verification completed"
