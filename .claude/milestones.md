# Zilean — Milestones

## V1 — Core Overlay
- [x] P1: electron-vite scaffold + windows + hotkeys + tray
- [x] P2: Riot Live Client poller (TDD)
- [x] P3: Claude coaching engine (TDD)
- [x] P4: Overlay UI (TDD)
- [x] P5: Wired loop + integration tests
- [x] P6: Settings + Docker scaffold + config files

## Live Data Enhancement (Pre-V2)
- [x] P0: Event feed — fast polling (5s) + overlay + main window reactive event stream
- [x] P-docs: Local API reference doc (`docs/riot-live-client-api.md`) + Swagger capture utility (`electron/main/swaggerDump.ts`)
- [x] P0.5: Items, abilities, runes, summoner spells, lane opponent, matchupTip coaching

## V2 — Historical Analysis + RAG
- [ ] P1: DB schema + pgvector setup
- [ ] P2: Riot Match-V5 fetcher (TDD)
- [ ] P3: Per-game analyzer — stats + AI summary (TDD)
- [ ] P4: Embedding + storage pipeline
- [ ] P5: RAG retrieval + coach prompt injection (TDD)
- [ ] P6: Repeat mistake detection + toast alerts (TDD)
- [ ] P7: Main window "Analyze My Games" UI
- [ ] P8: Incremental analysis on startup

## V3 — Distribution
- [ ] electron-builder NSIS installer (.exe)
- [ ] Auto-start with Windows
- [ ] Detect LoL process start → auto-activate overlay
- [ ] Auto-fetch new games on app startup (opt-in)
- [ ] Auto-updater

## V4 — Advanced (TBD)
- [ ] Post-game report card (graded, improvement areas)
- [ ] Multi-account support
- [ ] Custom coaching focus (e.g. "focus on macro only")
