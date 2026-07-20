# Agent instructions

This repository is a catalog. Every addon is isolated under `addons/<addon-id>/` and installation must be opt-in per addon.

## Safety boundary

- Do not edit, replace, copy, re-sign, or unpack `/Applications/ChatGPT.app`.
- Do not modify `~/.codex`, credentials, conversations, plugins, or account settings.
- Do not publish binaries or create a GitHub release unless explicitly requested.
- Preserve the localhost-only debugging address in `app/launcher.zsh`.
- Treat each manifest's `hostActions` as an allowlist. Do not broaden it implicitly.
- Generated files may exist only under ignored `dist/` and the user-approved install directory.

## Selection rule

1. Run `./scripts/list-addons.sh`.
2. If the user named addon ids, inspect and select only those ids.
3. If the user did not choose, show the catalog and ask. Do not install every addon by default.
4. Read each selected folder's `addon.json`, `README.md`, and entrypoint before installation.

## Install workflow

1. Read `README.md`, `SECURITY.md`, and `docs/ARCHITECTURE.md`.
2. Confirm `/Applications/ChatGPT.app` exists.
3. Run `./scripts/check.sh`.
4. Run `./scripts/install.sh <addon-id> [<addon-id> ...]` only after selection is clear.
5. Verify the helper:

   ```sh
   codesign --verify --deep --strict "$HOME/Applications/Codex Micro Addons.app"
   find "$HOME/Applications/Codex Micro Addons.app/Contents/Resources/addons" -mindepth 1 -maxdepth 1 -type d -print
   ```

6. Report the installed Codex version and build:

   ```sh
   /usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/ChatGPT.app/Contents/Info.plist
   /usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' /Applications/ChatGPT.app/Contents/Info.plist
   ```

7. State separately whether a physical Codex Micro was detected and tested. Synthetic events are not live-hardware proof.

## Addon-specific verification

- `conversation-scroll`: clockwise scrolls down, counter-clockwise scrolls up, and encoder turns do not leak to native handling while the addon mode is active.
- `focus-thread-window`: with Codex in the background, one mapped thread-button press opens its thread and makes Codex frontmost. Unmapped and command keys must not request focus.

## Final integrity checks

- `./scripts/check.sh` passes.
- The installed helper contains exactly the selected addon folders.
- The helper has a valid ad-hoc signature.
- `/Applications/ChatGPT.app` still passes `codesign --verify --deep --strict`.
- No OpenAI binary, icon, authentication state, or conversation content enters the repository.
