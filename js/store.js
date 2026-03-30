const STORAGE_KEY = 'toeic1200_progress';

function getDefaultState() {
  return {
    version: 1,
    currentDay: 1,
    streak: { current: 0, best: 0, lastDate: null },
    days: {},
    words: {},
    settings: { speechRate: 0.85, autoPlay: true }
  };
}

let state = null;

function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? JSON.parse(raw) : getDefaultState();
  } catch {
    state = getDefaultState();
  }
  return state;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const store = {
  get() { return load(); },

  getCurrentDay() { return load().currentDay; },

  getDayStatus(day) {
    const s = load();
    const d = s.days[day];
    if (!d) return day <= s.currentDay ? 'available' : 'locked';
    if (d.completed) return 'completed';
    return 'available';
  },

  isDayAccessible(day) {
    const s = load();
    return day <= s.currentDay;
  },

  completeMethod(day, method) {
    const s = load();
    if (!s.days[day]) s.days[day] = { completed: false };
    s.days[day][method] = true;
    if (s.days[day].methodA && s.days[day].methodB && s.days[day].methodC) {
      s.days[day].completed = true;
      s.days[day].date = new Date().toISOString().split('T')[0];
      if (day >= s.currentDay) s.currentDay = day + 1;
      this.updateStreak();
    }
    save();
  },

  completeDay(day) {
    const s = load();
    if (!s.days[day]) s.days[day] = {};
    s.days[day].completed = true;
    s.days[day].methodA = true;
    s.days[day].methodB = true;
    s.days[day].methodC = true;
    s.days[day].date = new Date().toISOString().split('T')[0];
    if (day >= s.currentDay) s.currentDay = day + 1;
    this.updateStreak();
    save();
  },

  recordWord(word, correct) {
    const s = load();
    if (!s.words[word]) s.words[word] = { seen: 0, correct: 0, incorrect: 0, mastered: false };
    s.words[word].seen++;
    if (correct) s.words[word].correct++;
    else s.words[word].incorrect++;
    s.words[word].lastSeen = new Date().toISOString().split('T')[0];
    if (s.words[word].correct >= 3 && s.words[word].incorrect === 0) s.words[word].mastered = true;
    else if (s.words[word].seen >= 5 && s.words[word].correct / s.words[word].seen >= 0.8) s.words[word].mastered = true;
    save();
  },

  getWordStats(word) {
    return load().words[word] || { seen: 0, correct: 0, incorrect: 0, mastered: false };
  },

  getWeakWords() {
    const s = load();
    return Object.entries(s.words)
      .filter(([, v]) => v.seen > 0 && !v.mastered)
      .sort((a, b) => {
        const ra = a[1].correct / (a[1].seen || 1);
        const rb = b[1].correct / (b[1].seen || 1);
        return ra - rb;
      })
      .map(([word, stats]) => ({ word, ...stats }));
  },

  getMasteredCount() {
    return Object.values(load().words).filter(w => w.mastered).length;
  },

  getSeenCount() {
    return Object.values(load().words).filter(w => w.seen > 0).length;
  },

  getCompletedDays() {
    return Object.values(load().days).filter(d => d.completed).length;
  },

  updateStreak() {
    const s = load();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (s.streak.lastDate === today) return;
    if (s.streak.lastDate === yesterday) {
      s.streak.current++;
    } else if (s.streak.lastDate !== today) {
      s.streak.current = 1;
    }
    s.streak.lastDate = today;
    if (s.streak.current > s.streak.best) s.streak.best = s.streak.current;
    save();
  },

  getStreak() { return load().streak; },

  getSettings() { return load().settings; },

  setSetting(key, value) {
    const s = load();
    s.settings[key] = value;
    save();
  },

  getTotalWords() {
    return Object.keys(load().words).length;
  },

  reset() {
    state = getDefaultState();
    save();
  }
};
