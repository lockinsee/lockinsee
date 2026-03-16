export const STORAGE_KEY = 'lockin-habit-rpg-v3';

export const XP_MAP = {
  easy: 10,
  medium: 20,
  hard: 35,
};

export const LEVEL_TITLES = [
  'Recruit', 'Focused', 'Disciplined', 'Relentless', 'Sharpened',
  'Elite', 'Ascended', 'Locked In', 'Unstoppable', 'Legend'
];

export const REWARDS = [
  { level: 2, title: 'Bronze Focus', desc: 'You started building momentum.' },
  { level: 3, title: 'Streak Shield', desc: 'Miss one day mentally, not forever.' },
  { level: 5, title: 'Silver Discipline', desc: 'Consistency is becoming your identity.' },
  { level: 7, title: 'Deep Work Aura', desc: 'Your grind is visible now.' },
  { level: 10, title: 'Legend Rank', desc: 'You are no longer negotiating with excuses.' },
];

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function defaultState() {
  return {
    habits: [
      { id: crypto.randomUUID(), name: 'Drink water', difficulty: 'easy', category: 'Body', active: true },
      { id: crypto.randomUUID(), name: 'Read 10 pages', difficulty: 'medium', category: 'Mind', active: true },
      { id: crypto.randomUUID(), name: 'Write for 30 minutes', difficulty: 'hard', category: 'Creativity', active: true },
    ],
    completions: {},
    history: [],
    totalXp: 0,
    streak: 0,
    longestStreak: 0,
    lastCompletionDate: null,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function xpForNextLevel(level) {
  return 100 + (level - 1) * 50;
}

export function getLevelFromXp(totalXp) {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  return { level, currentXp: remaining, nextXp: xpForNextLevel(level) };
}

export function getRankTitle(level) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
