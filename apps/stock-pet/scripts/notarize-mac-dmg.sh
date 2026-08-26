#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
release_dir="$project_dir/release"
version="$(node -p "require('$project_dir/package.json').version")"
dmg_path="$release_dir/牛来了-$version-universal.dmg"
profile="${APPLE_KEYCHAIN_PROFILE:-oneshowtools-notary}"

if [[ ! -f "$dmg_path" ]]; then
  echo "未找到当前版本的 macOS DMG：$dmg_path" >&2
  exit 1
fi

xcrun notarytool submit "$dmg_path" \
  --keychain-profile "$profile" \
  --wait
xcrun stapler staple "$dmg_path"

echo "当前版本 DMG 已完成 Apple 公证并装订票据。"
