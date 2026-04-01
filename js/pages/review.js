import { store } from '../store.js';
import { shortWords } from '../data/shortWords.js';
import { trickyWords } from '../data/trickyWords.js';
import { toeicPhrases } from '../data/toeicPhrases.js';
import { confusingPairs } from '../data/confusingPairs.js';
import { rootWords } from '../data/rootWords.js';
import { wordFamilies } from '../data/wordFamilies.js';
import { speakerButton, bindSpeakerButtons } from '../speech.js';

const allWordsMap = new Map();

function initMap() {
  if (allWordsMap.size > 0) return;
  shortWords.forEach(w => allWordsMap.set(w.word, { ...w, method: '短字優先' }));
  trickyWords.forEach(w => allWordsMap.set(w.word, { word: w.word, kk: w.kk, coreMeaning: w.realMeaning, method: '地雷+諧音' }));
  toeicPhrases.forEach(p => allWordsMap.set(p.phrase, { word: p.phrase, kk: p.kk, coreMeaning: p.meaning, method: '情境片語' }));
  confusingPairs.forEach(p => {
    allWordsMap.set(p.wordA.word, { word: p.wordA.word, kk: p.wordA.kk, coreMeaning: p.wordA.meaning, method: '混淆對決' });
    allWordsMap.set(p.wordB.word, { word: p.wordB.word, kk: p.wordB.kk, coreMeaning: p.wordB.meaning, method: '混淆對決' });
  });
  rootWords.forEach(g => g.words.forEach(w => {
    allWordsMap.set(w.word, { word: w.word, kk: w.kk, coreMeaning: w.meaning, method: '字根拆解' });
  }));
  wordFamilies.forEach(f => {
    [f.verb, f.nounThing, f.nounPerson, f.adjective, f.adverbOrNeg].filter(Boolean).forEach(x => {
      const w = typeof x === 'string' ? { word: x, meaning: '' } : x;
      if (!allWordsMap.has(w.word)) allWordsMap.set(w.word, { word: w.word, coreMeaning: w.meaning || '', method: '詞族家族' });
    });
  });
}

export function renderReview(container) {
  initMap();
  const weakWords = store.getWeakWords();
  const seenCount = store.getSeenCount();
  const masteredCount = store.getMasteredCount();
  const totalWords = allWordsMap.size;
  const accuracy = seenCount > 0 ?
    Math.round(Object.values(store.get().words).reduce((sum, w) => sum + w.correct, 0) /
    Object.values(store.get().words).reduce((sum, w) => sum + w.seen, 0) * 100) : 0;

  container.innerHTML = `
    <div class="section-title">📊 學習統計</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${seenCount}</div>
        <div class="stat-label">已學單字</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${masteredCount}</div>
        <div class="stat-label">已掌握</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${accuracy}%</div>
        <div class="stat-label">正確率</div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:.85rem;font-weight:600">學習進度</span>
        <span style="font-size:.85rem;color:var(--text-secondary)">${seenCount} / ${totalWords}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width:${(seenCount/totalWords)*100}%;background:var(--primary)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:.85rem;font-weight:600">掌握度</span>
        <span style="font-size:.85rem;color:var(--text-secondary)">${masteredCount} / ${totalWords}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" style="width:${(masteredCount/totalWords)*100}%;background:var(--success)"></div>
      </div>
    </div>

    <div class="section-title" style="margin-top:16px">⚠️ 需加強的單字 (${weakWords.length})</div>
    ${weakWords.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <p>還沒有需加強的單字，開始學習後會自動追蹤！</p>
      </div>
    ` : `
      <div class="card" style="padding:0;overflow:hidden">
        ${weakWords.slice(0, 30).map(w => {
          const info = allWordsMap.get(w.word) || { word: w.word, coreMeaning: '' };
          const rate = w.seen > 0 ? Math.round(w.correct / w.seen * 100) : 0;
          return `<div class="word-list-item">
            <div class="word-list-main">
              <div class="word-list-word">${w.word}</div>
              <div class="word-list-meaning">${info.coreMeaning || ''} — ${rate}% 正確</div>
            </div>
            ${speakerButton(w.word, 0.85, 'speaker-btn')}
          </div>`;
        }).join('')}
      </div>
    `}

    <a href="#/words" class="btn btn-outline btn-block" style="margin-top:16px;text-decoration:none;text-align:center">
      瀏覽全部單字 →
    </a>
  `;

  bindSpeakerButtons(container);
}
