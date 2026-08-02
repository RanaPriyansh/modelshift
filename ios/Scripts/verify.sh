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
  plutil
)

if [[ "$verify_mode" == "full" ]]; then
  required_tools+=(
    cat
    grep
    mkdir
    mktemp
    rm
    swift
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
)

store_metadata_build_arguments=()

validate_store_metadata_url() {
  local setting_name="$1"
  local value="$2"
  local https_url_pattern='^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?([/?#][^[:space:]]*)?$'

  if [[ -z "$value" ]]; then
    printf 'FORGE_REQUIRE_STORE_METADATA=1 requires %s.\n' "$setting_name" >&2
    return 1
  fi

  if [[ ! "$value" =~ $https_url_pattern ]]; then
    printf '%s must be a non-placeholder https URL when FORGE_REQUIRE_STORE_METADATA=1.\n' "$setting_name" >&2
    return 1
  fi

  case "$value" in
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

if [[ "$verify_mode" == "static" ]]; then
  step "Static iOS verification completed"
  exit 0
fi

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
if ! xcodebuild -sdk iphoneos -version >"$iphoneos_sdk_log" 2>&1; then
  printf 'The required iOS device SDK is not available.\n' >&2
  printf 'Select an Xcode installation with the iphoneos SDK.\n' >&2
  cat "$iphoneos_sdk_log" >&2
  exit 1
fi

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

    if [[ "${FORGE_REQUIRE_ASSET_BUILD:-0}" == "1" ]]; then
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
  "${store_metadata_build_arguments[@]}" \
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
  "${store_metadata_build_arguments[@]}" \
  EXCLUDED_SOURCE_FILE_NAMES=Assets.xcassets \
  ASSETCATALOG_COMPILER_APPICON_NAME= \
  -quiet \
  build

step "iOS verification completed"
