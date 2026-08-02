#!/bin/zsh
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
resources_dir="$(cd "$script_dir/.." && pwd)"
assets_dir="$resources_dir/Assets.xcassets"

render_png() {
  local source_path="$1"
  local width="$2"
  local height="$3"
  local destination_path="$4"

  /usr/bin/sips -s format png -z "$height" "$width" "$source_path" --out "$destination_path" >/dev/null
}

render_png "$script_dir/forge-editorial-terrain-app-icon.svg" 1024 1024 \
  "$assets_dir/AppIcon.appiconset/AppIcon.png"
/usr/bin/xcrun swift "$script_dir/render-opaque-png.swift" \
  "$assets_dir/AppIcon.appiconset/AppIcon.png"
render_png "$script_dir/forge-editorial-terrain-launch-mark-light.svg" 180 144 \
  "$assets_dir/LaunchMark.imageset/LaunchMark.png"
render_png "$script_dir/forge-editorial-terrain-launch-mark-light.svg" 360 288 \
  "$assets_dir/LaunchMark.imageset/LaunchMark@2x.png"
render_png "$script_dir/forge-editorial-terrain-launch-mark-light.svg" 540 432 \
  "$assets_dir/LaunchMark.imageset/LaunchMark@3x.png"
render_png "$script_dir/forge-editorial-terrain-launch-mark-dark.svg" 180 144 \
  "$assets_dir/LaunchMark.imageset/LaunchMark-dark.png"
render_png "$script_dir/forge-editorial-terrain-launch-mark-dark.svg" 360 288 \
  "$assets_dir/LaunchMark.imageset/LaunchMark-dark@2x.png"
render_png "$script_dir/forge-editorial-terrain-launch-mark-dark.svg" 540 432 \
  "$assets_dir/LaunchMark.imageset/LaunchMark-dark@3x.png"
