# Changelog

All notable changes to Shovel Toss. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Username first-open flow (saved in `localStorage`).
- Buck character.
- Pit landing depth illusion.

### Changed
- Polished character-select screen subtitle and version footer.
- Randomized meter sweet-spot position per throw.
- Tuned meter difficulty and high-score badge display.
- Tuned throw parity and meter-to-power mapping.
- Updated `README.md` with current gameplay flow and scoring table.

## [0.11.0] — 2026-04-28

### Added
- Luchador character.

### Fixed
- Meter stick logic and HUD cleanup.

## [0.10.0] — 2026-04-28

### Added
- Supabase global leaderboard, loaded via CDN — no bundler required.

## [0.9.0] — 2026-04-27

### Added
- Meter difficulty ramp (speed increases per stick).

### Changed
- Improved character-select flow.

## [0.8.0] — 2026-04-27

### Added
- Lives HUD (3 misses per run).

### Changed
- Tuned meter sweet-spot scoring.
- HUD scales for phone landscape.
- Pit sizing tuned by orientation.

### Removed
- Combo scoring.
- Visual ground overlay.

## [0.7.0] — 2026-04-27

### Changed
- Replaced placeholder pit with `pit.png` asset.
- Replaced placeholder shovel with `shovel.png` asset.

## [0.6.0] — 2026-04-26

### Changed
- Updated sprite sheets.

## [0.5.0] — 2026-04-26

### Added
- Character selection screen as entry state.
- Background image on the gameplay screen.

## [0.4.0] — 2026-04-25

### Added
- Character sprite integration (Chuggo sheet).
- Shovel rotation and angle-based stick scoring.

### Changed
- Wagie set as default character.
- Character render size increased to 150 px.
- Sprite frame size now derived from `naturalWidth`/`naturalHeight` at load time.

## [0.3.0] — 2026-04-25

### Added
- Real-rules scoring zones: `stick`, `back_wall`, `in_pit`, `front_wall`, `miss`.
- Princess and Chuggo characters.

### Changed
- Piecewise-linear meter-to-power remap.
- Constant meter speed at 0.85s cycle time.
- Shorter wall with open-sky bounce boundary.

### Fixed
- Wall bounce re-triggering on descent for high-arc throws.

## [0.2.0] — 2026-04-25

### Changed
- Orientation-aware launch angle.
- UI layout refined: stacked HUD, narrowed meter, shorter wall.

## [0.1.0] — 2026-04-25

Initial playable build.

### Added
- Canvas-based game loop with throw MVP.
- Run-level state machine (`READY`, `PLAYING`, `GAME_OVER`).
- Scoring system with zones, combo multiplier, and feedback display.
- HUD: safe-area padding, throw counter, rounded meter.
- Difficulty scaling: faster meter and narrowing pit over run progression.
- Top-mounted meter, far pit, and wall deflection physics.

### Changed
- State consolidated into `run`, `throw_`, `scoring`, `difficulty` objects.
- Difficulty shifted from pit-width tightening to meter-speed ramp.
