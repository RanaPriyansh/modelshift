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
    mkdir
    mktemp
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

step "Check shell syntax, simulator result bundle guard, and repository whitespace"
if [[ -z "${BASH:-}" || ! -x "$BASH" ]]; then
  printf 'Cannot find the Bash interpreter for the shell syntax check.\n' >&2
  exit 1
fi

"$BASH" -n "$script_dir/verify.sh"
result_bundle_directory_guard_count="$(
  grep -Fc '[[ ! -d "$simulator_result_bundle" ]]' "$script_dir/verify.sh" || true
)"
result_bundle_info_guard_count="$(
  grep -Fc '[[ ! -s "$simulator_result_bundle_info_plist" ]]' "$script_dir/verify.sh" || true
)"
if [[ "$result_bundle_directory_guard_count" -lt 2 \
  || "$result_bundle_info_guard_count" -lt 2 ]]; then
  printf 'The simulator result bundle checks are missing from verify.sh.\n' >&2
  exit 1
fi

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

cleanup() {
  case "$scratch_root" in
    "$temp_base"/forge-ios-verify.*)
      rm -rf -- "$scratch_root"
      ;;
    *)
      printf 'Refused to remove an unexpected temporary path: %s\n' "$scratch_root" >&2
      return 1
      ;;
  esac
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

require_simulator_tests="${FORGE_REQUIRE_SIMULATOR_TESTS:-0}"
case "$require_simulator_tests" in
  0)
    ;;
  1)
    step "Build deterministic iOS Simulator test products"
    simulator_destination="platform=iOS Simulator,OS=26.5,name=iPhone 17 Pro"
    simulator_derived_data="$scratch_root/SimulatorDerivedData"

    if [[ -n "${FORGE_RESULT_BUNDLE_PATH:-}" ]]; then
      simulator_result_bundle="$FORGE_RESULT_BUNDLE_PATH"

      if [[ "$simulator_result_bundle" != /* ]]; then
        printf 'FORGE_RESULT_BUNDLE_PATH must be an absolute path.\n' >&2
        exit 2
      fi
    else
      simulator_result_bundle="$scratch_root/FORGE-simulator-tests.xcresult"
    fi

    simulator_result_bundle_parent="${simulator_result_bundle%/*}"
    if [[ -z "$simulator_result_bundle_parent" ]]; then
      simulator_result_bundle_parent="/"
    fi

    if [[ ! -d "$simulator_result_bundle_parent" ]]; then
      printf 'The result bundle parent directory does not exist: %s\n' \
        "$simulator_result_bundle_parent" >&2
      exit 1
    fi

    if [[ ! -w "$simulator_result_bundle_parent" ]]; then
      printf 'The result bundle parent directory is not writable: %s\n' \
        "$simulator_result_bundle_parent" >&2
      exit 1
    fi

    if [[ -e "$simulator_result_bundle" ]]; then
      printf 'The result bundle path already exists: %s\n' \
        "$simulator_result_bundle" >&2
      exit 1
    fi

    xcodebuild \
      -project "$ios_root/FORGE.xcodeproj" \
      -packageCachePath "$package_cache" \
      -scheme FORGE \
      -configuration Debug \
      -sdk iphonesimulator \
      -destination "$simulator_destination" \
      -destination-timeout 180 \
      -only-testing:FORGEAppTests \
      -only-testing:FORGEUITests \
      -parallel-testing-enabled NO \
      -maximum-parallel-testing-workers 1 \
      -derivedDataPath "$simulator_derived_data" \
      COMPILER_INDEX_STORE_ENABLE=NO \
      "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
      build-for-testing

    simulator_app="$simulator_derived_data/Build/Products/Debug-iphonesimulator/FORGE.app"
    simulator_widget="$simulator_derived_data/Build/Products/Debug-iphonesimulator/FORGE.app/PlugIns/FORGEWidgets.appex"
    simulator_app_simulated_entitlements="$simulator_derived_data/Build/Intermediates.noindex/FORGE.build/Debug-iphonesimulator/FORGE.build/FORGE.app-Simulated.xcent"
    simulator_widget_simulated_entitlements="$simulator_derived_data/Build/Intermediates.noindex/FORGE.build/Debug-iphonesimulator/FORGEWidgets.build/FORGEWidgets.appex-Simulated.xcent"

    if [[ ! -d "$simulator_app" ]]; then
      printf 'The signed simulator app was not created: %s\n' "$simulator_app" >&2
      exit 1
    fi

    if [[ ! -d "$simulator_widget" ]]; then
      printf 'The signed simulator widget extension was not created: %s\n' \
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

    step "Run deterministic iOS Simulator tests"
    xcodebuild \
      -project "$ios_root/FORGE.xcodeproj" \
      -packageCachePath "$package_cache" \
      -scheme FORGE \
      -configuration Debug \
      -sdk iphonesimulator \
      -destination "$simulator_destination" \
      -destination-timeout 180 \
      -only-testing:FORGEAppTests \
      -only-testing:FORGEUITests \
      -parallel-testing-enabled NO \
      -maximum-parallel-testing-workers 1 \
      -derivedDataPath "$simulator_derived_data" \
      -resultBundlePath "$simulator_result_bundle" \
      COMPILER_INDEX_STORE_ENABLE=NO \
      "${store_metadata_build_arguments[@]+"${store_metadata_build_arguments[@]}"}" \
      test-without-building

    if [[ ! -d "$simulator_result_bundle" ]]; then
      printf 'The simulator test result bundle was not created: %s\n' \
        "$simulator_result_bundle" >&2
      exit 1
    fi

    simulator_result_bundle_info_plist="$simulator_result_bundle/Info.plist"
    if [[ ! -s "$simulator_result_bundle_info_plist" ]]; then
      printf 'The simulator test result bundle Info.plist is missing or empty: %s\n' \
        "$simulator_result_bundle_info_plist" >&2
      exit 1
    fi
    ;;
  *)
    printf 'FORGE_REQUIRE_SIMULATOR_TESTS must be 0 or 1.\n' >&2
    exit 2
    ;;
esac

step "iOS verification completed"
