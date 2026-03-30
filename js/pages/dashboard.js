import { store } from '../store.js';
import { schedule } from '../data/schedule.js';

export function renderDashboard(container) {
  const s = store.get();
  const streak = store.getStreak();
  const completedDays = store.getCompletedDays();
  const seenWords = store.getSeenCount();
  const masteredWords = store.getMasteredCount();
  const totalDays = schedule.length;
  const pct = Math.round((completedDays / totalDays) * 100);

  const headerInfo = document.getElementById('header-info');
  headerInfo.textContent = `Day ${Math.min(s.currentDay, totalDays)} / ${totalDays}`;

  let calendarHTML = '';
  for (const day of schedule) {
    const status = store.getDayStatus(day.day);
    const ms = day.milestone ? `<small>${day.milestone}</small>` : '';
    const cls = status === 'completed' ? 'completed' :
                day.day === s.currentDay ? 'current' :
                status === 'available' ? 'available' : 'locked';
    const href = status !== 'locked' ? `#/day/${day.day}` : 'javascript:void(0)';
    calendarHTML += `<a href="${href}" class="calendar-day ${cls}">${day.day}${ms}</a>`;
  }

  container.innerHTML = `
    <div class="card" style="text-align:center;margin-bottom:16px">
      <div class="streak-display" style="justify-content:center">
        <span class="streak-flame">${streak.current > 0 ? '🔥' : '💤'}</span>
        <span>${streak.current} 天連續</span>
      </div>
      <div style="font-size:.8rem;color:var(--text-secondary);margin-top:4px">最佳記錄：${streak.best} 天</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${completedDays}</div>
        <div class="stat-label">完成天數</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${seenWords}</div>
        <div class="stat-label">已學單字</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${masteredWords}</div>
        <div class="stat-label">已掌握</div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="section-title" style="margin-bottom:0">總進度</span>
        <span style="font-weight:700;color:var(--primary)">${pct}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width:${pct}%;background:var(--primary)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-secondary);margin-top:4px">
        <span>0</span>
        <span>${completedDays} / ${totalDays} 天</span>
      </div>
    </div>

    <div class="section-title" style="margin-top:16px">📅 30天學習日曆</div>
    <div class="calendar">${calendarHTML}</div>

    ${s.currentDay <= totalDays ? `
      <a href="#/day/${s.currentDay}" class="btn btn-primary btn-block btn-lg" style="text-decoration:none;text-align:center;margin-top:8px">
        開始 Day ${s.currentDay}
      </a>
    ` : `
      <div class="card" style="text-align:center">
        <div style="font-size:2rem">🎓</div>
        <div style="font-size:1.2rem;font-weight:700;margin-top:8px">恭喜畢業！</div>
        <p style="color:var(--text-secondary);margin-top:4px">你已完成30天學習計劃</p>
      </div>
    `}
  `;
}
