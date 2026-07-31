#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
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
    grep
    mktemp
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
bash -n "$script_dir/verify.sh"
git -C "$repo_root" diff --check -- ios .github/workflows/ios-quality.yml

step "Validate Apple property lists and JSON files"
for file in "${plist_files[@]}"; do
  plutil -lint "$file"
done

for file in "${json_files[@]}"; do
  plutil -convert xml1 -o /dev/null "$file"
done

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

scratch_root="$(mktemp -d "$temp_base/forge-ios-verify.XXXXXX")"
module_cache="$scratch_root/ModuleCache"
package_cache="$scratch_root/PackageCache"
task_cache="$scratch_root/Cache"
mkdir -p "$module_cache" "$package_cache" "$task_cache"

export CLANG_MODULE_CACHE_PATH="$module_cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$module_cache"
export XDG_CACHE_HOME="$task_cache"

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

step "Run ForgeCore tests"
swift test \
  --disable-sandbox \
  --package-path "$ios_root/Packages/ForgeCore" \
  --scratch-path "$scratch_root/ForgeCore"

step "Read the Xcode project"
xcodebuild \
  -project "$ios_root/FORGE.xcodeproj" \
  -packageCachePath "$package_cache" \
  -list \
  -json >"$scratch_root/project-list.json"

if ! grep -q '"FORGE"' "$scratch_root/project-list.json"; then
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

for configuration in Debug Release; do
  step "Build the unsigned arm64 $configuration iOS device target"
  build_log="$scratch_root/xcodebuild-$configuration.log"

  if ! xcodebuild \
    "${build_arguments[@]}" \
    -configuration "$configuration" \
    build >"$build_log" 2>&1; then
    if ! grep -q "No available simulator runtimes" "$build_log"; then
      cat "$build_log" >&2
      exit 1
    fi

    if [[ "${FORGE_REQUIRE_ASSET_BUILD:-0}" == "1" ]]; then
      cat "$build_log" >&2
      exit 1
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
  EXCLUDED_SOURCE_FILE_NAMES=Assets.xcassets \
  ASSETCATALOG_COMPILER_APPICON_NAME= \
  -quiet \
  build

step "iOS verification completed"
