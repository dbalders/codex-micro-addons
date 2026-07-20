#!/bin/zsh

set -euo pipefail

readonly repo_root="${0:A:h:h}"
readonly version="$(<"$repo_root/VERSION")"
readonly dist_dir="$repo_root/dist"
readonly app_bundle="$dist_dir/Codex Micro Addons.app"
readonly sign_identity="${CODEX_MICRO_ADDONS_SIGN_IDENTITY:--}"
typeset -a selected_addons
selected_addons=("$@")

if [[ ! "$version" =~ '^[0-9]+\.[0-9]+\.[0-9]+$' ]]; then
  print -u2 "VERSION must contain a semantic version such as 0.1.0"
  exit 1
fi
if (( ${#selected_addons} == 0 )); then
  print -u2 "Choose at least one addon."
  "$repo_root/scripts/list-addons.sh" >&2
  exit 2
fi

/bin/mkdir -p "$dist_dir"
if [[ -e "$app_bundle" ]]; then /bin/rm -rf "$app_bundle"; fi

/bin/mkdir -p "$app_bundle/Contents/MacOS" "$app_bundle/Contents/Resources/addons"
/usr/bin/sed "s/__VERSION__/$version/g" "$repo_root/app/Info.plist" > "$app_bundle/Contents/Info.plist"
/usr/bin/install -m 755 "$repo_root/app/launcher.zsh" "$app_bundle/Contents/MacOS/Codex Micro Addons"
/usr/bin/install -m 644 "$repo_root/src/injector.mjs" "$app_bundle/Contents/Resources/injector.mjs"

typeset -A seen_addons
for addon_id in "${selected_addons[@]}"; do
  if [[ ! "$addon_id" =~ '^[a-z0-9-]+$' ]]; then
    print -u2 "Invalid addon id: $addon_id"
    exit 2
  fi
  if [[ -n "${seen_addons[$addon_id]:-}" ]]; then
    print -u2 "Addon selected more than once: $addon_id"
    exit 2
  fi
  seen_addons[$addon_id]=1

  addon_dir="$repo_root/addons/$addon_id"
  manifest="$addon_dir/addon.json"
  if [[ ! -f "$manifest" ]]; then
    print -u2 "Unknown addon: $addon_id"
    "$repo_root/scripts/list-addons.sh" >&2
    exit 2
  fi
  manifest_id="$(/usr/bin/plutil -extract id raw -o - "$manifest")"
  addon_version="$(/usr/bin/plutil -extract version raw -o - "$manifest")"
  addon_main="$(/usr/bin/plutil -extract main raw -o - "$manifest")"
  if [[ "$manifest_id" != "$addon_id" || "$addon_main" != "${addon_main:t}" || ! "$addon_version" =~ '^[0-9]+\.[0-9]+\.[0-9]+$' ]]; then
    print -u2 "Invalid manifest: $manifest"
    exit 2
  fi
  if [[ ! -f "$addon_dir/$addon_main" ]]; then
    print -u2 "Missing addon entrypoint: $addon_id/$addon_main"
    exit 2
  fi

  target_dir="$app_bundle/Contents/Resources/addons/$addon_id"
  /bin/mkdir -p "$target_dir"
  /usr/bin/install -m 644 "$manifest" "$target_dir/addon.json"
  /usr/bin/sed \
    -e "s/__ADDON_ID__/$addon_id/g" \
    -e "s/__ADDON_VERSION__/$addon_version/g" \
    "$addon_dir/$addon_main" > "$target_dir/$addon_main"
done

/usr/bin/codesign --force --deep --sign "$sign_identity" "$app_bundle"
/usr/bin/codesign --verify --deep --strict "$app_bundle"

print "Built $app_bundle"
print "Selected addons: ${selected_addons[*]}"
