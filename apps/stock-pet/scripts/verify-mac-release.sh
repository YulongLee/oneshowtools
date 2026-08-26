#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
release_dir="$project_dir/release"
version="$(node -p "require('$project_dir/package.json').version")"
app_path="$release_dir/mac-universal/牛来了.app"
dmg_path="$release_dir/牛来了-$version-universal.dmg"

if [[ ! -d "$app_path" || ! -f "$dmg_path" ]]; then
  echo "未找到当前版本的 macOS 应用或 DMG 安装包。" >&2
  exit 1
fi

codesign --verify --deep --strict --verbose=2 "$app_path"
spctl --assess --type execute --verbose=2 "$app_path"
xcrun stapler validate "$app_path"
xcrun stapler validate "$dmg_path"

echo "macOS 签名、公证票据和 Gatekeeper 验证均已通过。"
