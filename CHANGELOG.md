# Changelog

All notable changes to Shovel Toss. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.23.1] — 2026-05-06

### Changed
- Top meter position now sits below the score/lives HUD instead of overlapping it.
- Score-celebration phrases are now picked randomly instead of by score boundary index.

## [0.23.0] — 2026-05-06

### Added
- Hall of Fame: "First to N Games" milestones tracking the first player to reach 10, 20, 30, 50, 75, 100, and 150 lifetime games.
- In-game settings menu (gear icon) with a meter-position selector (top / middle / bottom), persisted across sessions.
- Daily leaderboard toggle on the leaderboard screen — switch between All Time and Today's scores (since local midnight).
- Score celebrations during a run: emoji confetti at 100 points and when passing the all-time high score, plus high-energy phrases at every 20-point boundary.

### Changed
- Polished menu button layouts.

## [0.22.0] — 2026-05-05

### Added
- Two new playable characters: Anheuser and Ore.
- HTML metadata and share image for social previews.

### Changed
- Front-wall throws now award 1 point (previously 0); feedback color updated to match scoring zones.
- Polished sprite sheets across the existing character roster; refreshed pit, shovel, and champion art.
- Reorganized level background assets under `assets/level/`.

### Fixed
- Throws aimed at the back of the pit no longer trigger a phantom wall bounce that turned would-be back-wall scores into misses (gated bounce on projected landing instead of in-flight x crossing).

## [0.21.0] — 2026-05-04

### Added
- Landing screen with menu navigation (Play, Leaderboard, Hall of Fame, Player Stats, What's New).
- Hall of Fame screen showing all-time records.
- Player Stats screen with per-player run history.
- "What's New" dialog on the landing screen surfacing release notes from `src/releaseNotes.js`.

### Changed
- Extracted `pointerInRect` helper and removed dead pointer hit-test code.

## [0.20.0] — 2026-05-03

### Added
- Character card flip with top-5 score preview on the character-select screen; back-side button opens the leaderboard pre-filtered to that character.
- Leaderboard character filter via dropdown.

## [0.19.1] — 2026-05-03

### Fixed
- Post-run rank message now reflects the player's actual position when scores tie (previously reported the first tied row's rank).

### Added
- Umami analytics tag.

## [0.19.0] — 2026-05-03

### Added
- Production-only score submission (gated by `*.shoveltoss.ing` host check) with a "save disabled (dev)" notice on non-prod.
- Leaderboard score notice.

### Changed
- Improved leaderboard display.

## [0.18.0] — 2026-05-03

### Added
- Alexsama, Patriot, Smokey, and Xena characters.
- Count badges on character-select filter buttons.

### Changed
- Renamed Chambray → Billie.
- Tightened filter button sizing in landscape.
- Updated filter rosters (Champions, New, Ladies) for the expanded character list.

### Removed
- Yinzer character assets.

## [0.17.0] — 2026-05-02

### Added
- Assman, Chambray, and WD40 characters.
- Character selection filters.

### Changed
- Renamed npm script `start` → `dev`.

## [0.16.1] — 2026-05-01

### Added
- README gameplay screenshot.

### Changed
- Matched house background zoom level.
- Adjusted champion plaques.

## [0.16.0] — 2026-05-01

### Added
- Level select screen (House, Lil Italy) shown after character select.
- Champion shovel asset rendered for champion-tier characters.

### Changed
- Leaderboard rank styling updated.
- Refined Lil Italy level layout.
- Updated cropped pit rendering and tightened pit assets.
- Polished shovel landing visuals.

## [0.15.0] — 2026-04-30

### Added
- Cowgirl, Maria, and Seaman characters.
- Champion plaques on character-select tiles for Buck, Wagie, Chef, and Chuggo.
- Vertical scroll on the character-select grid (mouse wheel and touch/drag).

### Changed
- Larger fixed-size character-select tiles, centered horizontally.
- Character-select grid uses four columns in landscape.

## [0.14.0] — 2026-04-29

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

### Removed
- Dead code: write-only state fields, debug console.log, commented-out lines, duplicate badge constant.

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
