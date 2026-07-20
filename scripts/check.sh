#!/bin/zsh

set -euo pipefail

readonly repo_root="${0:A:h:h}"
node_binary="$(command -v node || true)"
if [[ -z "$node_binary" && -x /Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node ]]; then
  node_binary=/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node
fi
if [[ -z "$node_binary" ]]; then
  print -u2 "Node.js is required for source checks"
  exit 1
fi

"$node_binary" --check "$repo_root/src/injector.mjs"
"$node_binary" --check "$repo_root/src/injected.js"
/bin/zsh -n "$repo_root/app/launcher.zsh"
/bin/zsh -n "$repo_root/scripts/build.sh"
/bin/zsh -n "$repo_root/scripts/install.sh"
/usr/bin/plutil -lint "$repo_root/app/Info.plist" >/dev/null

if /usr/bin/find "$repo_root" \( -path "$repo_root/.git" -o -path "$repo_root/dist" \) -prune -o \( -type f -name '*.icns' -o -type d -name '*.app' \) -print | /usr/bin/grep -q .; then
  print -u2 "The source tree must not redistribute OpenAI app bundles or icons"
  exit 1
fi

"$repo_root/scripts/build.sh"
/usr/bin/codesign --verify --deep --strict "$repo_root/dist/Codex Micro Plus.app"

if ! /usr/bin/grep -Fq "const VERSION = \"$(<"$repo_root/VERSION")\"" "$repo_root/dist/Codex Micro Plus.app/Contents/Resources/injected.js"; then
  print -u2 "Built renderer version does not match VERSION"
  exit 1
fi

if /usr/bin/git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  /usr/bin/git -C "$repo_root" diff --check
fi

print "All checks passed"
