# Conversation scrolling

Adds **Conversation scrolling** to **Settings > Codex Micro > Knob**.

- Clockwise scrolls the active conversation down.
- Counter-clockwise scrolls it up.
- Each turn moves roughly three-fifths of the visible conversation without smooth-scroll lag.
- While selected, encoder-turn messages are gated before Codex's native composer-navigation listener runs.
- Encoder press and release events retain Codex's native behavior.
- Selecting either native knob mode disables this addon immediately.

Install only this addon:

```sh
./scripts/install.sh conversation-scroll
```

The initial settings matcher supports the English Codex interface.
