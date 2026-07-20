#!/bin/zsh

set -u

readonly chatgpt_app="${CODEX_MICRO_ADDONS_CHATGPT_APP:-/Applications/ChatGPT copy.app}"
readonly chatgpt_binary="$chatgpt_app/Contents/MacOS/ChatGPT"
readonly bundled_node="$chatgpt_app/Contents/Resources/cua_node/bin/node"
readonly resources_dir="${0:A:h:h}/Resources"
readonly user_data_path="${CODEX_MICRO_ADDONS_USER_DATA_PATH:-$HOME/Library/Application Support/Codex Micro Addons/ChatGPT}"

show_error() {
  /usr/bin/osascript -e "display dialog \"$1\" with title \"Codex Micro Addons\" buttons {\"OK\"} default button \"OK\" with icon stop" >/dev/null
}

if [[ ! -x "$chatgpt_binary" || ! -x "$bundled_node" ]]; then
  show_error "ChatGPT copy.app was not found in /Applications. Create that copy first, then try again."
  exit 1
fi

/bin/mkdir -p "$user_data_path"

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

CODEX_ELECTRON_USER_DATA_PATH="$user_data_path" \
  "$chatgpt_binary" \
  "--user-data-dir=$user_data_path" \
  "--remote-debugging-address=127.0.0.1" \
  "--remote-debugging-port=$port" &
chatgpt_pid=$!

"$bundled_node" "$resources_dir/injector.mjs" --port "$port" --pid "$chatgpt_pid"
injector_status=$?

if (( injector_status != 0 )) && /bin/kill -0 "$chatgpt_pid" >/dev/null 2>&1; then
  show_error "The copied Codex app opened, but the selected addons could not be loaded. Quit the copy and try again."
fi

exit "$injector_status"
