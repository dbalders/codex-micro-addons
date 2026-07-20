#!/bin/zsh

set -euo pipefail

readonly repo_root="${0:A:h:h}"

print "Available addons:"
for manifest in "$repo_root"/addons/*/addon.json(N); do
  addon_id="$(/usr/bin/plutil -extract id raw -o - "$manifest")"
  addon_name="$(/usr/bin/plutil -extract name raw -o - "$manifest")"
  addon_description="$(/usr/bin/plutil -extract description raw -o - "$manifest")"
  print "  $addon_id"
  print "    $addon_name — $addon_description"
done
