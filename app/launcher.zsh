#!/bin/zsh

set -u

readonly chatgpt_app="${CODEX_MICRO_ADDONS_CHATGPT_APP:-/Applications/ChatGPT.app}"
readonly chatgpt_binary="$chatgpt_app/Contents/MacOS/ChatGPT"
readonly bundled_node="$chatgpt_app/Contents/Resources/cua_node/bin/node"
readonly resources_dir="${0:A:h:h}/Resources"
readonly inspector_port=9229

show_error() {
  /usr/bin/osascript -e "display dialog \"$1\" with title \"Codex Micro Addons\" buttons {\"OK\"} default button \"OK\" with icon stop" >/dev/null
}

find_chatgpt_pid() {
  /bin/ps -axo pid=,command= | /usr/bin/awk -v executable="$chatgpt_binary" \
    '$2 == executable { print $1; exit }'
}

codex_renderer_ready() {
  /bin/ps -axo ppid=,command= | /usr/bin/awk \
    -v parent_pid="$chatgpt_pid" -v app_path="$chatgpt_app" '
      $1 == parent_pid && index($0, app_path) && index($0, "--type=renderer") { found = 1 }
      END { exit(found ? 0 : 1) }
    '
}

if [[ ! -x "$chatgpt_binary" || ! -x "$bundled_node" ]]; then
  show_error "ChatGPT.app was not found in /Applications. Install Codex, then try again."
  exit 1
fi

chatgpt_pid="$(find_chatgpt_pid)"
if [[ -z "$chatgpt_pid" ]]; then
  show_error "Open Codex first, wait for its window to appear, then open Codex Micro Addons again."
  exit 1
fi

for attempt in {1..40}; do
  codex_renderer_ready && break
  /bin/sleep 0.25
done
if ! codex_renderer_ready; then
  show_error "Codex is still starting. Wait for its window to finish loading, then try again."
  exit 1
fi

inspector_owner="$(/usr/sbin/lsof -nP -tiTCP:$inspector_port -sTCP:LISTEN 2>/dev/null | /usr/bin/head -n 1)"
if [[ -n "$inspector_owner" ]]; then
  show_error "Local port 9229 is already in use. Close the existing debugger or restart Codex before attaching addons."
  exit 1
fi

"$bundled_node" "$resources_dir/injector.mjs" --port "$inspector_port" --pid "$chatgpt_pid" &
injector_pid=$!
/bin/sleep 0.05
/bin/kill -USR1 "$chatgpt_pid"
wait "$injector_pid"
injector_status=$?

for attempt in {1..40}; do
  inspector_owner="$(/usr/sbin/lsof -nP -tiTCP:$inspector_port -sTCP:LISTEN 2>/dev/null | /usr/bin/head -n 1)"
  [[ -z "$inspector_owner" ]] && break
  /bin/sleep 0.1
done
if [[ "$inspector_owner" == "$chatgpt_pid" ]]; then
  "$bundled_node" "$resources_dir/injector.mjs" \
    --port "$inspector_port" --pid "$chatgpt_pid" --mode close-only >/dev/null 2>&1
  for attempt in {1..40}; do
    inspector_owner="$(/usr/sbin/lsof -nP -tiTCP:$inspector_port -sTCP:LISTEN 2>/dev/null | /usr/bin/head -n 1)"
    [[ -z "$inspector_owner" ]] && break
    /bin/sleep 0.1
  done
fi

if [[ -n "$inspector_owner" ]]; then
  show_error "Codex's temporary runtime endpoint could not be closed. Quit Codex before continuing."
  exit 1
fi

if (( injector_status != 0 )); then
  show_error "Codex is open, but the selected addons could not be loaded. Try opening Codex Micro Addons again."
  exit "$injector_status"
fi

/usr/bin/open "$chatgpt_app"
exit 0
