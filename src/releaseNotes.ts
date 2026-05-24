// Newest first. Add user-facing notes for releases with visible changes.
// When releasing, prepend an entry here if users should see "What's New".
export {};

interface ReleaseNote {
  version: string;
  date: string;
  headline: string;
  items: string[];
}

const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: 'v1.1.0',
    date: '2026-05-24',
    headline: 'Rebuilt on Phaser',
    items: [
      'Same game, same look - now running on Phaser 4 for a smoother experience and faster feature work.'
    ]
  },
  {
    version: 'v1.0.1',
    date: '2026-05-17',
    headline: 'New Hall of Fame milestones',
    items: [
      'Hall of Fame now tracks first to 666 points in a single game.',
      'New total-points milestones: first to 100, 500, 1k, 5k, and 10k.'
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-05-13',
    headline: 'Shovel Toss 1.0',
    items: [
      'Every gameplay feature on the original roadmap is shipped.',
      'Behind the scenes: a rebuild on Phaser is coming as v1.1.'
    ]
  },
  {
    version: 'v0.28.1',
    date: '2026-05-14',
    headline: 'Pit and 1v1 fixes',
    items: [
      'Pit boundary throws now score correctly when the shovel catches the edge.',
      'The 1v1 Toss-Off home screen now scrolls through pending challenges and ranked players.'
    ]
  },
  {
    version: 'v0.28.0',
    date: '2026-05-12',
    headline: '1v1 Toss-Off is live',
    items: [
      'Challenge anyone to an async 9-throw 1v1 Toss-Off — pick a level, pick your character, and the result lands when they finish.'
    ]
  },
  {
    version: 'v0.27.0',
    date: '2026-05-08',
    headline: 'Player profiles + meter polish',
    items: [
      'Tap any player on Player Stats to see their profile — top characters, stats, and top 10 scores.',
      'Meter sweet spot is back to yellow.'
    ]
  },
  {
    version: 'v0.26.0',
    date: '2026-05-08',
    headline: '1v1 Toss-Off beta',
    items: [
      'Challenge friends to async 9-throw 1v1 Toss-Off matches.',
      'Brand-new landing screen and a refreshed color palette across the whole game.',
      'Character cards now have ornate wooden frames with engraved metal name plaques — tap the expand icon to see the full art.',
      "All-Time leaderboard now shows your single best score per player, with ranks tied to where they sit among every score in the database."
    ]
  },
  {
    version: 'v0.25.0',
    date: '2026-05-08',
    headline: 'Spot yourself + meme milestones',
    items: [
      'Your leaderboard, Hall of Fame, and Player Stats rows are now highlighted so you can spot yourself fast.',
      'New Hall of Fame milestones — first to 69 and 420 points, plus first to 69 and 420 games. Nice.'
    ]
  },
  {
    version: 'v0.24.1',
    date: '2026-05-07',
    headline: 'Source link and leaderboard cleanup',
    items: [
      'Added a GitHub source-code link.',
      'Leaderboard now rejects junk submissions — only real characters and realistic scores.'
    ]
  },
  {
    version: 'v0.24.0',
    date: '2026-05-06',
    headline: 'New level, new characters, sharper UI',
    items: [
      'New level: The Swamp.',
      'Two new characters: Gucci and Inspector.',
      'Character card flips now animate smoothly.',
      'Refreshed settings and edit icons with crisper Font Awesome glyphs.'
    ]
  },
  {
    version: 'v0.23.1',
    date: '2026-05-06',
    headline: 'Polish',
    items: [
      'Top meter now sits below the score/lives HUD so it never overlaps.',
      'Score-celebration phrases are now randomized.'
    ]
  },
  {
    version: 'v0.23.0',
    date: '2026-05-06',
    headline: 'Settings, daily leaderboard, and celebrations',
    items: [
      'Hall of Fame: new "First to N Games" milestones (10, 20, 30, 50, 75, 100, 150).',
      'In-game settings menu — choose meter position (top/middle/bottom).',
      "Daily leaderboard — toggle between All Time and Today's scores.",
      'Score celebrations — 100-point and high-score confetti, every-20-point hype phrases.'
    ]
  },
  {
    version: 'v0.22.0',
    date: '2026-05-05',
    headline: 'New characters and pit fixes',
    items: [
      'Two new characters: Anheuser and Ore.',
      'Front-wall throws now score 1 point (up from 0).',
      'Fixed throws aimed at the back of the pit ricocheting off the wall and missing — they now land cleanly.',
      'Polish pass on character sprites, pit, and shovel art.'
    ]
  },
  {
    version: 'v0.21.0',
    date: '2026-05-04',
    headline: 'New home screen',
    items: [
      'New landing screen with quick access to Leaderboard, Hall of Fame, Player Stats, and What\'s New.',
      'Hall of Fame: see all-time records across players.',
      'Player Stats: dig into your own run history.'
    ]
  },
  {
    version: 'v0.20.0',
    date: '2026-05-03',
    headline: 'Leaderboard upgrades',
    items: [
      'Flip character cards to preview each character\'s top scores.',
      'Filter the leaderboard by character.'
    ]
  },
  {
    version: 'v0.19.1',
    date: '2026-05-03',
    headline: 'Cleaner ranks',
    items: [
      'Post-run rank messages now handle tied scores correctly.'
    ]
  },
  {
    version: 'v0.19.0',
    date: '2026-05-03',
    headline: 'Global scores',
    items: [
      'Scores now save reliably from the live site.',
      'The leaderboard got a cleaner, easier-to-scan layout.'
    ]
  }
];

function getLatestNotes(count = 3): ReleaseNote[] {
  return RELEASE_NOTES.slice(0, count);
}

declare global {
  interface Window {
    releaseNotes: {
      getLatestNotes: typeof getLatestNotes;
    };
  }
}

window.releaseNotes = { getLatestNotes };
