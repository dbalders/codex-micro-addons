# Agent instructions

This repository is designed to be cloned, inspected, installed, and verified by a local coding agent.

## Safety boundary

- Do not edit, replace, copy, re-sign, or unpack `/Applications/ChatGPT.app`.
- Do not modify `~/.codex`, Codex credentials, conversations, plugins, or account settings.
- Do not publish, upload, or create a GitHub release unless the user explicitly requests it.
- The generated launcher may write only under this repository's ignored `dist/` directory and the selected local install directory.
- Preserve the localhost-only debugging address in `app/launcher.zsh`.

## Install workflow

1. Read `README.md`, `SECURITY.md`, and `docs/ARCHITECTURE.md`.
2. Confirm `/Applications/ChatGPT.app` exists.
3. Run `./scripts/check.sh`.
4. Run `./scripts/install.sh` only when installation is requested.
5. Verify the installed helper with:

   ```sh
   codesign --verify --deep --strict "$HOME/Applications/Codex Micro Plus.app"
   ```

6. Report the installed Codex version and build without changing it:

   ```sh
   /usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/ChatGPT.app/Contents/Info.plist
   /usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' /Applications/ChatGPT.app/Contents/Info.plist
   ```

7. State separately whether a physical Codex Micro was detected and tested. Synthetic encoder tests are not live-hardware proof.

## Expected user flow

The user opens `Codex Micro Plus.app`, approves a Codex relaunch if prompted, then selects **Settings > Codex Micro > Knob > Conversation scrolling**. Clockwise should scroll down and counter-clockwise should scroll up.

## Verification expectations

- `./scripts/check.sh` passes.
- The helper has a valid ad-hoc code signature.
- `/Applications/ChatGPT.app` still passes `codesign --verify --deep --strict`.
- No OpenAI binary, icon, authentication state, or conversation content is added to the repository.
