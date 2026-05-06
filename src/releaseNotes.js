// Newest first. Add user-facing notes for releases with visible changes.
// When releasing, prepend an entry here if users should see "What's New".
const RELEASE_NOTES = [
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

function getLatestNote() {
  return RELEASE_NOTES[0] || null;
}

window.releaseNotes = { getLatestNote };
