#!/bin/zsh

set -euo pipefail

readonly repo_root="${0:A:h:h}"
readonly install_dir="${CODEX_MICRO_ADDONS_INSTALL_DIR:-$HOME/Applications}"
readonly source_app="$repo_root/dist/Codex Micro Addons.app"
readonly target_app="$install_dir/Codex Micro Addons.app"

if (( $# == 0 )); then
  print -u2 "Choose the addons to install."
  "$repo_root/scripts/list-addons.sh" >&2
  exit 2
fi

"$repo_root/scripts/build.sh" "$@"
/bin/mkdir -p "$install_dir"

if [[ -e "$target_app" ]]; then
  /bin/rm -rf "$target_app"
fi
/usr/bin/ditto "$source_app" "$target_app"
/usr/bin/codesign --verify --deep --strict "$target_app"

print "Installed $target_app"
print "Selected addons: $*"
print "Open Codex Micro Addons from Finder or Spotlight."
