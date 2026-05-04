// Newest first. Add user-facing notes for releases with visible changes.
// When releasing, prepend an entry here if users should see "What's New".
const RELEASE_NOTES = [
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

const STORAGE_KEY = 'shoveltoss.lastSeenVersion';

function compareSemver(a, b) {
  const pa = String(a || '').replace(/^v/, '').split('.').map(Number);
  const pb = String(b || '').replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] || 0;
    const bi = pb[i] || 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

function getLastSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function setLastSeen(version) {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {}
}

function getUnseenNotes() {
  const last = getLastSeen();
  if (!last) {
    if (RELEASE_NOTES[0]) setLastSeen(RELEASE_NOTES[0].version);
    return [];
  }
  return RELEASE_NOTES.filter(note => compareSemver(note.version, last) > 0);
}

function getAllNotes() {
  return RELEASE_NOTES.slice();
}

function markAllSeen() {
  if (RELEASE_NOTES[0]) setLastSeen(RELEASE_NOTES[0].version);
}

window.releaseNotes = { getUnseenNotes, getAllNotes, markAllSeen };
