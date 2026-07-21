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
for addon_source in "$repo_root"/addons/*/*.js(N); do
  "$node_binary" --check "$addon_source"
done
for manifest in "$repo_root"/addons/*/addon.json(N); do
  "$node_binary" -e 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))' "$manifest"
done
/bin/zsh -n "$repo_root/app/launcher.zsh"
/bin/zsh -n "$repo_root/scripts/build.sh"
/bin/zsh -n "$repo_root/scripts/install.sh"
/bin/zsh -n "$repo_root/scripts/list-addons.sh"
/usr/bin/plutil -lint "$repo_root/app/Info.plist" >/dev/null

if /usr/bin/grep -q 'ChatGPT copy.app\|--user-data-dir\|--remote-debugging-port' \
  "$repo_root/app/launcher.zsh"; then
  print -u2 "Launcher must attach to the original Codex process instead of starting a copy"
  exit 1
fi

if /usr/bin/find "$repo_root" \( -path "$repo_root/.git" -o -path "$repo_root/dist" \) -prune -o \( -type f -name '*.icns' -o -type d -name '*.app' \) -print | /usr/bin/grep -q .; then
  print -u2 "The source tree must not redistribute OpenAI app bundles or icons"
  exit 1
fi

list_output="$("$repo_root/scripts/list-addons.sh")"
for expected in conversation-scroll focus-thread-window; do
  if [[ "$list_output" != *"$expected"* ]]; then
    print -u2 "Addon missing from catalog: $expected"
    exit 1
  fi
done

"$repo_root/scripts/build.sh" conversation-scroll
[[ -d "$repo_root/dist/Codex Micro Addons.app/Contents/Resources/addons/conversation-scroll" ]]
[[ ! -d "$repo_root/dist/Codex Micro Addons.app/Contents/Resources/addons/focus-thread-window" ]]

"$repo_root/scripts/build.sh" focus-thread-window
[[ ! -d "$repo_root/dist/Codex Micro Addons.app/Contents/Resources/addons/conversation-scroll" ]]
[[ -d "$repo_root/dist/Codex Micro Addons.app/Contents/Resources/addons/focus-thread-window" ]]

"$repo_root/scripts/build.sh" conversation-scroll focus-thread-window
readonly built_app="$repo_root/dist/Codex Micro Addons.app"
/usr/bin/codesign --verify --deep --strict "$built_app"
if ! /usr/bin/file "$built_app/Contents/MacOS/applet" | /usr/bin/grep -q 'Mach-O universal binary'; then
  print -u2 "Generated helper must use the native universal applet wrapper"
  exit 1
fi
[[ -x "$built_app/Contents/Resources/launcher.zsh" ]]
[[ -d "$built_app/Contents/Resources/addons/conversation-scroll" ]]
[[ -d "$built_app/Contents/Resources/addons/focus-thread-window" ]]
if /usr/bin/grep -R -E '__ADDON_(ID|VERSION)__' "$built_app/Contents/Resources/addons" >/dev/null; then
  print -u2 "Built addon still contains an unresolved template token"
  exit 1
fi

if /usr/bin/git -C "$repo_root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  /usr/bin/git -C "$repo_root" diff --check
fi

print "All checks passed"
