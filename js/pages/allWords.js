import { shortWords } from '../data/shortWords.js';
import { confusingPairs } from '../data/confusingPairs.js';
import { trickyWords } from '../data/trickyWords.js';
import { rootWords } from '../data/rootWords.js';
import { wordFamilies } from '../data/wordFamilies.js';
import { toeicPhrases } from '../data/toeicPhrases.js';
import { speakerButton, bindSpeakerButtons } from '../speech.js';
import { store } from '../store.js';

function buildAllWords() {
  const all = [];
  shortWords.forEach(w => all.push({ word: w.word, kk: w.kk, meaning: w.coreMeaning, freq: w.frequency, method: '短字優先' }));
  confusingPairs.forEach(p => {
    all.push({ word: p.wordA.word, kk: p.wordA.kk, meaning: p.wordA.meaning, freq: null, method: '混淆對決' });
    all.push({ word: p.wordB.word, kk: p.wordB.kk, meaning: p.wordB.meaning, freq: null, method: '混淆對決' });
  });
  trickyWords.forEach(w => all.push({ word: w.word, kk: w.kk, meaning: w.realMeaning, freq: null, method: '地雷+諧音' }));
  rootWords.forEach(g => g.words.forEach(w => all.push({ word: w.word, kk: w.kk, meaning: w.meaning, freq: null, method: '字根拆解' })));
  wordFamilies.forEach(f => {
    [f.verb, f.nounThing, f.nounPerson, f.adjective, f.adverbOrNeg].filter(Boolean).forEach(x => {
      const w = typeof x === 'string' ? { word: x, meaning: '' } : x;
      if (!all.find(a => a.word === w.word)) all.push({ word: w.word, kk: null, meaning: w.meaning || '', freq: null, method: '詞族家族' });
    });
  });
  toeicPhrases.forEach(p => all.push({ word: p.phrase, kk: p.kk, meaning: p.meaning, freq: null, method: '情境片語' }));

  const seen = new Set();
  return all.filter(w => {
    if (seen.has(w.word)) return false;
    seen.add(w.word);
    return true;
  });
}

export function renderAllWords(container) {
  const allWords = buildAllWords();
  let filter = 'all';
  let search = '';

  function render() {
    let filtered = allWords;
    if (filter !== 'all') filtered = filtered.filter(w => w.method === filter);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(w =>
        w.word.toLowerCase().includes(s) ||
        (w.meaning || '').includes(s)
      );
    }

    const methods = [...new Set(allWords.map(w => w.method))];

    container.innerHTML = `
      <div class="section-title">📖 全部單字 (${allWords.length})</div>
      <input type="text" class="search-box" placeholder="搜尋單字或中文..." value="${search}" id="word-search">
      <div class="filter-chips">
        <span class="chip ${filter === 'all' ? 'active' : ''}" data-filter="all">全部 (${allWords.length})</span>
        ${methods.map(m => {
          const count = allWords.filter(w => w.method === m).length;
          return `<span class="chip ${filter === m ? 'active' : ''}" data-filter="${m}">${m} (${count})</span>`;
        }).join('')}
      </div>
      <div style="font-size:.85rem;color:var(--text-secondary);margin-bottom:8px">顯示 ${filtered.length} 個單字</div>
      <div class="card" style="padding:0;overflow:hidden">
        ${filtered.slice(0, 100).map(w => {
          const stats = store.getWordStats(w.word);
          const mastered = stats.mastered;
          return `<div class="word-list-item">
            <div class="word-list-main">
              <div class="word-list-word">
                ${mastered ? '✓ ' : ''}${w.word}
                ${w.freq ? `<span class="freq-badge freq-${w.freq.toLowerCase()}" style="margin-left:4px">${w.freq}</span>` : ''}
              </div>
              <div class="word-list-meaning">${w.kk || ''} ${w.meaning || ''}</div>
            </div>
            ${speakerButton(w.word, 0.85, 'speaker-btn')}
          </div>`;
        }).join('')}
        ${filtered.length > 100 ? `<div style="padding:12px;text-align:center;color:var(--text-secondary);font-size:.85rem">顯示前 100 個，請用搜尋縮小範圍</div>` : ''}
      </div>
    `;

    bindSpeakerButtons(container);

    container.querySelector('#word-search').addEventListener('input', (e) => {
      search = e.target.value;
      render();
    });
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        filter = chip.dataset.filter;
        render();
      });
    });
  }

  render();
}
