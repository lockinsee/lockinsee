import {
  XP_MAP,
  REWARDS,
  todayKey,
  loadState,
  saveState,
  getLevelFromXp,
  getRankTitle,
  escapeHtml,
  capitalize,
  defaultState
} from './data.js';

let state = loadState();

const els = {
  habitName: document.getElementById('habitName'),
  habitDifficulty: document.getElementById('habitDifficulty'),
  habitCategory: document.getElementById('habitCategory'),
  addHabitBtn: document.getElementById('addHabitBtn'),
  habitList: document.getElementById('habitList'),
  rewardList: document.getElementById('rewardList'),
  historyList: document.getElementById('historyList'),
  totalXp: document.getElementById('totalXp'),
  streak: document.getElementById('streak'),
  doneToday: document.getElementById('doneToday'),
  habitCount: document.getElementById('habitCount'),
  xpBar: document.getElementById('xpBar'),
  xpText: document.getElementById('xpText'),
  levelBadge: document.getElementById('levelBadge'),
  rankTitle: document.getElementById('rankTitle'),
  toast: document.getElementById('toast'),
  resetTodayBtn: document.getElementById('resetTodayBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),
  modal: document.getElementById('levelUpModal'),
  modalLevel: document.getElementById('modalLevel'),
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2300);
}

function showLevelUp(level) {
  els.modalLevel.textContent = level;
  els.modal.classList.add('show');
  clearTimeout(showLevelUp.timer);
  showLevelUp.timer = setTimeout(() => els.modal.classList.remove('show'), 1500);
}

els.modal.addEventListener('click', () => els.modal.classList.remove('show'));

function isDoneToday(habitId) {
  return !!(state.completions[todayKey()] || {})[habitId];
}

function countDoneToday() {
  return Object.keys(state.completions[todayKey()] || {}).filter(key => !key.startsWith('bonus-')).length;
}

function updateStreakOnCompletion() {
  const today = todayKey();
  if (state.lastCompletionDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (state.lastCompletionDate === yesterdayKey) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }

  state.lastCompletionDate = today;
  if (state.streak > state.longestStreak) state.longestStreak = state.streak;
}

function maybeAwardDailyBonus() {
  const activeHabits = state.habits.filter(h => h.active);
  if (!activeHabits.length) return 0;

  const done = countDoneToday();
  const today = todayKey();
  const bonusFlag = `bonus-${today}`;

  if (!state.completions[today]) state.completions[today] = {};

  if (done === activeHabits.length && !state.completions[today][bonusFlag]) {
    state.completions[today][bonusFlag] = true;
    state.totalXp += 25;
    state.history.unshift({
      id: crypto.randomUUID(),
      text: 'Daily full clear bonus',
      xp: 25,
      date: new Date().toLocaleString(),
    });
    return 25;
  }
  return 0;
}

function addHabit() {
  const name = els.habitName.value.trim();
  if (!name) {
    showToast('Enter a habit name first');
    return;
  }

  state.habits.unshift({
    id: crypto.randomUUID(),
    name,
    difficulty: els.habitDifficulty.value,
    category: els.habitCategory.value,
    active: true,
  });

  els.habitName.value = '';
  saveState(state);
  render();
  showToast('Habit added');
}

function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  saveState(state);
  render();
  showToast('Habit removed');
}

function completeHabit(id) {
  if (!state.completions[todayKey()]) state.completions[todayKey()] = {};
  if (state.completions[todayKey()][id]) return;

  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;

  const before = getLevelFromXp(state.totalXp).level;
  const baseXp = XP_MAP[habit.difficulty] || 10;

  updateStreakOnCompletion();

  const streakBonus = Math.max(0, Math.min(state.streak * 2, 20));
  const gain = baseXp + streakBonus;

  state.completions[todayKey()][id] = true;
  state.totalXp += gain;
  state.history.unshift({
    id: crypto.randomUUID(),
    text: habit.name,
    xp: gain,
    date: new Date().toLocaleString(),
  });

  const dailyBonus = maybeAwardDailyBonus();
  const after = getLevelFromXp(state.totalXp).level;

  saveState(state);
  render();

  let msg = `+${gain} XP · ${habit.name}`;
  if (dailyBonus) msg += ` · +${dailyBonus} daily bonus`;
  if (after > before) {
    msg += ` · LEVEL UP to ${after}!`;
    showLevelUp(after);
  }
  showToast(msg);
}

function resetToday() {
  state.completions[todayKey()] = {};
  saveState(state);
  render();
  showToast('Today reset');
}

function clearAll() {
  const confirmed = confirm('Clear all habits, XP, streaks, and history?');
  if (!confirmed) return;
  state = defaultState();
  saveState(state);
  render();
  showToast('All data cleared');
}

function renderRewards(level) {
  els.rewardList.innerHTML = REWARDS.map(reward => `
    <div class="reward-card ${level >= reward.level ? '' : 'locked'}">
      <strong>Level ${reward.level} · ${escapeHtml(reward.title)}</strong>
      <div class="tiny">${escapeHtml(reward.desc)}</div>
    </div>
  `).join('');
}

function renderHistory() {
  const items = state.history.slice(0, 8);
  if (!items.length) {
    els.historyList.innerHTML = '<div class="empty">No activity yet. Complete a habit to start building momentum.</div>';
    return;
  }

  els.historyList.innerHTML = items.map(item => `
    <div class="history-card">
      <strong>${escapeHtml(item.text)}</strong>
      <div class="tiny">+${item.xp} XP · ${escapeHtml(item.date)}</div>
    </div>
  `).join('');
}

function renderHabits() {
  const habits = state.habits.filter(h => h.active);
  if (!habits.length) {
    els.habitList.innerHTML = '<div class="empty">No habits yet. Add your first quest above.</div>';
    return;
  }

  els.habitList.innerHTML = '';

  for (const habit of habits) {
    const done = isDoneToday(habit.id);
    const xp = XP_MAP[habit.difficulty] || 10;

    const card = document.createElement('div');
    card.className = 'habit-card pop';
    card.innerHTML = `
      <div class="habit-main">
        <button class="check ${done ? 'done' : ''}" aria-label="Complete habit">${done ? '✓' : ''}</button>
        <div>
          <p class="habit-name">${escapeHtml(habit.name)}</p>
          <div class="meta">
            <span class="pill ${habit.difficulty}">${capitalize(habit.difficulty)} · ${xp} XP</span>
            <span class="pill">${escapeHtml(habit.category)}</span>
            ${done ? '<span class="pill">Completed today</span>' : ''}
          </div>
        </div>
      </div>
      <div class="habit-actions">
        <button class="btn btn-primary complete-btn" ${done ? 'disabled' : ''}>${done ? 'Done' : 'Complete'}</button>
        <button class="btn btn-danger delete-btn">Delete</button>
      </div>
    `;

    card.querySelector('.check').addEventListener('click', () => completeHabit(habit.id));
    card.querySelector('.complete-btn').addEventListener('click', () => completeHabit(habit.id));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteHabit(habit.id));
    els.habitList.appendChild(card);
  }
}

function renderHeader() {
  const { level, currentXp, nextXp } = getLevelFromXp(state.totalXp);
  const pct = Math.max(0, Math.min(100, (currentXp / nextXp) * 100));

  els.totalXp.textContent = state.totalXp;
  els.streak.textContent = `${state.streak} 🔥`;
  els.doneToday.textContent = countDoneToday();
  els.habitCount.textContent = state.habits.filter(h => h.active).length;
  els.xpBar.style.width = `${pct}%`;
  els.xpText.textContent = `${currentXp} / ${nextXp} XP`;
  els.levelBadge.textContent = level;
  els.rankTitle.textContent = `Level ${level} · ${getRankTitle(level)}`;
  renderRewards(level);
}

function render() {
  renderHeader();
  renderHabits();
  renderHistory();
}

els.addHabitBtn.addEventListener('click', addHabit);
els.habitName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addHabit();
});
els.resetTodayBtn.addEventListener('click', resetToday);
els.clearAllBtn.addEventListener('click', clearAll);

render();
