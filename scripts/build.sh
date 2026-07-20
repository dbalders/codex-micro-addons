#!/bin/zsh

set -euo pipefail

readonly repo_root="${0:A:h:h}"
readonly version="$(<"$repo_root/VERSION")"
readonly dist_dir="$repo_root/dist"
readonly app_bundle="$dist_dir/Codex Micro Plus.app"
readonly sign_identity="${CODEX_MICRO_PLUS_SIGN_IDENTITY:--}"

if [[ ! "$version" =~ '^[0-9]+\.[0-9]+\.[0-9]+$' ]]; then
  print -u2 "VERSION must contain a semantic version such as 0.1.0"
  exit 1
fi

/bin/mkdir -p "$dist_dir"
if [[ -e "$app_bundle" ]]; then /bin/rm -rf "$app_bundle"; fi

/bin/mkdir -p "$app_bundle/Contents/MacOS" "$app_bundle/Contents/Resources"
/usr/bin/sed "s/__VERSION__/$version/g" "$repo_root/app/Info.plist" > "$app_bundle/Contents/Info.plist"
/usr/bin/install -m 755 "$repo_root/app/launcher.zsh" "$app_bundle/Contents/MacOS/Codex Micro Plus"
/usr/bin/install -m 644 "$repo_root/src/injector.mjs" "$app_bundle/Contents/Resources/injector.mjs"
/usr/bin/sed "s/__VERSION__/$version/g" "$repo_root/src/injected.js" > "$app_bundle/Contents/Resources/injected.js"

/usr/bin/codesign --force --deep --sign "$sign_identity" "$app_bundle"
/usr/bin/codesign --verify --deep --strict "$app_bundle"

print "Built $app_bundle"
