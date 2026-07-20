#!/bin/zsh

set -euo pipefail

readonly repo_root="${0:A:h:h}"
readonly install_dir="${CODEX_MICRO_PLUS_INSTALL_DIR:-$HOME/Applications}"
readonly source_app="$repo_root/dist/Codex Micro Plus.app"
readonly target_app="$install_dir/Codex Micro Plus.app"

"$repo_root/scripts/build.sh"
/bin/mkdir -p "$install_dir"

if [[ -e "$target_app" ]]; then
  /bin/rm -rf "$target_app"
fi
/usr/bin/ditto "$source_app" "$target_app"
/usr/bin/codesign --verify --deep --strict "$target_app"

print "Installed $target_app"
print "Open Codex Micro Plus from Finder or Spotlight."
