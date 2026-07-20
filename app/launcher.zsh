#!/bin/zsh

set -u

readonly chatgpt_app="${CODEX_MICRO_ADDONS_CHATGPT_APP:-/Applications/ChatGPT.app}"
readonly chatgpt_binary="$chatgpt_app/Contents/MacOS/ChatGPT"
readonly bundled_node="$chatgpt_app/Contents/Resources/cua_node/bin/node"
readonly resources_dir="${0:A:h:h}/Resources"

show_error() {
  /usr/bin/osascript -e "display dialog \"$1\" with title \"Codex Micro Addons\" buttons {\"OK\"} default button \"OK\" with icon stop" >/dev/null
}

if [[ ! -x "$chatgpt_binary" || ! -x "$bundled_node" ]]; then
  show_error "ChatGPT.app was not found. Install it in /Applications, then try again."
  exit 1
fi

if /usr/bin/pgrep -x ChatGPT >/dev/null 2>&1; then
  choice=$(/usr/bin/osascript -e 'button returned of (display dialog "Codex needs to relaunch once so the selected Codex Micro addons can load. Your open tasks are preserved." with title "Codex Micro Addons" buttons {"Cancel", "Quit and Relaunch"} default button "Quit and Relaunch" with icon caution)' 2>/dev/null) || exit 0
  if [[ "$choice" != "Quit and Relaunch" ]]; then
    exit 0
  fi
  /usr/bin/osascript -e 'tell application "ChatGPT" to quit' >/dev/null 2>&1 || true
  for _ in {1..60}; do
    /usr/bin/pgrep -x ChatGPT >/dev/null 2>&1 || break
    /bin/sleep 0.25
  done
  if /usr/bin/pgrep -x ChatGPT >/dev/null 2>&1; then
    show_error "Codex did not finish quitting. Quit it manually, then open Codex Micro Addons again."
    exit 1
  fi
fi

integer port=$((42000 + RANDOM % 10000))
integer attempts=0
while /usr/bin/nc -z 127.0.0.1 "$port" >/dev/null 2>&1; do
  port=$((42000 + RANDOM % 10000))
  attempts=$((attempts + 1))
  if (( attempts > 20 )); then
    show_error "Could not find a free local port. Try again."
    exit 1
  fi
done

"$chatgpt_binary" "--remote-debugging-address=127.0.0.1" "--remote-debugging-port=$port" &
chatgpt_pid=$!

"$bundled_node" "$resources_dir/injector.mjs" --port "$port" --pid "$chatgpt_pid"
injector_status=$?

if (( injector_status != 0 )) && /bin/kill -0 "$chatgpt_pid" >/dev/null 2>&1; then
  show_error "Codex opened, but the selected addons could not be loaded. Quit Codex and try again."
fi

exit "$injector_status"
