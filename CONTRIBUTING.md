# Contributing

Contributions are welcome, especially new self-contained addon folders, compatibility fixes for new Codex desktop builds, localization-safe UI matching, and additional tests.

1. Fork the repository and create a focused branch.
2. Put each new addon under `addons/<addon-id>/` with `addon.json`, `injected.js`, and `README.md`.
3. Declare the narrowest possible `hostActions`; use an empty array when none are required.
4. Keep changes small and avoid copying code or assets from `ChatGPT.app`.
5. Run `./scripts/check.sh`.
6. Describe the Codex desktop version and build used for live testing.
7. If hardware behavior changed, state whether it was tested with a physical Codex Micro or only synthetic events.

Do not submit OpenAI binaries, icons, proprietary source, credentials, conversation data, or captured authentication state.
