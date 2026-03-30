import { store } from '../store.js';
import { schedule } from '../data/schedule.js';
import { shortWords } from '../data/shortWords.js';
import { confusingPairs } from '../data/confusingPairs.js';
import { trickyWords } from '../data/trickyWords.js';
import { rootWords } from '../data/rootWords.js';
import { wordFamilies } from '../data/wordFamilies.js';
import { officeSlang } from '../data/officeSlang.js';
import { renderFlashcards } from '../components/flashcard.js';
import { renderQuiz, buildMeaningQuiz } from '../components/quiz.js';
import { renderDictation } from '../components/dictation.js';
import { renderPairCards } from '../components/pairCard.js';
import { speakerButton, bindSpeakerButtons } from '../speech.js';

// All words pool for dictation distractors
const allWordsList = [
  ...shortWords.map(w => w.word),
  ...confusingPairs.flatMap(p => [p.wordA.word, p.wordB.word]),
  ...trickyWords.map(w => w.word),
  ...rootWords.flatMap(g => g.words.map(w => w.word)),
  ...wordFamilies.flatMap(f => [f.verb, f.nounThing, f.nounPerson, f.adjective, f.adverbOrNeg].filter(Boolean)),
  ...officeSlang.map(s => s.slang)
].filter(Boolean);

function parseMethodWords(desc) {
  if (!desc) return { type: 'unknown', words: [] };
  const d = desc;

  if (d.includes('短字優先') || d.includes('短字進階')) {
    const words = extractByKeywords(d, shortWords);
    return { type: 'flashcard', words: words.length ? words : shortWords.slice(0, 10), source: 'shortWords' };
  }
  if (d.includes('混淆對決')) {
    const pairs = extractPairs(d, confusingPairs);
    return { type: 'pairs', pairs: pairs.length ? pairs : confusingPairs.slice(0, 4), source: 'confusingPairs' };
  }
  if (d.includes('字根拆解')) {
    const groups = extractRootGroups(d, rootWords);
    const words = groups.flatMap(g => g.words);
    return { type: 'roots', groups, words, source: 'rootWords' };
  }
  if (d.includes('詞族') || d.includes('詞族樹')) {
    const families = extractFamilies(d, wordFamilies);
    return { type: 'families', families: families.length ? families : wordFamilies.slice(0, 3), source: 'wordFamilies' };
  }
  if (d.includes('地雷') || d.includes('地雷掃除')) {
    const words = extractByKeywords(d, trickyWords);
    return { type: 'flashcard', words: words.length ? words : trickyWords.slice(0, 6), source: 'trickyWords' };
  }
  if (d.includes('諧音聯想') || d.includes('諧音')) {
    const words = extractByKeywords(d, trickyWords);
    return { type: 'flashcard', words: words.length ? words : trickyWords.slice(0, 5), source: 'trickyWords' };
  }
  if (d.includes('職場黑話')) {
    const words = extractByKeywords(d, officeSlang, 'slang');
    return { type: 'slang', words: words.length ? words : officeSlang.slice(0, 10), source: 'officeSlang' };
  }
  if (d.includes('聽寫模式')) {
    return { type: 'dictation', source: 'all' };
  }
  if (d.includes('找碴') || d.includes('填空')) {
    return { type: 'quiz', source: 'mixed' };
  }
  if (d.includes('複習') || d.includes('速刷') || d.includes('全真模擬') || d.includes('畢業考') || d.includes('衝刺')) {
    return { type: 'review', source: 'review' };
  }
  return { type: 'flashcard', words: shortWords.slice(0, 10), source: 'shortWords' };
}

function extractByKeywords(desc, pool, wordField = 'word') {
  const keywords = desc.match(/[a-zA-Z]+/g) || [];
  if (keywords.length > 0) {
    const matched = pool.filter(w => keywords.some(k => (w[wordField] || '').toLowerCase().includes(k.toLowerCase())));
    if (matched.length > 0) return matched;
  }
  const numMatch = desc.match(/(\d+)\s*[字個]/);
  const count = numMatch ? parseInt(numMatch[1]) : 10;
  return pool.slice(0, Math.min(count, pool.length));
}

function extractPairs(desc, pool) {
  const keywords = desc.match(/[a-zA-Z]+/g) || [];
  if (keywords.length > 0) {
    const matched = pool.filter(p =>
      keywords.some(k => p.wordA.word.toLowerCase().includes(k.toLowerCase()) ||
                         p.wordB.word.toLowerCase().includes(k.toLowerCase()))
    );
    if (matched.length > 0) return matched;
  }
  const numMatch = desc.match(/(\d+)\s*對/);
  const count = numMatch ? parseInt(numMatch[1]) : 4;
  return pool.slice(0, Math.min(count, pool.length));
}

function extractRootGroups(desc, pool) {
  const rootMatches = desc.match(/-\w+/g) || [];
  if (rootMatches.length > 0) {
    const matched = pool.filter(g => rootMatches.some(r => g.root.includes(r)));
    if (matched.length > 0) return matched;
  }
  return pool.slice(0, 2);
}

function extractFamilies(desc, pool) {
  const keywords = desc.match(/[a-zA-Z]+/g) || [];
  if (keywords.length > 0) {
    const matched = pool.filter(f => keywords.some(k => f.root.toLowerCase().includes(k.toLowerCase())));
    if (matched.length > 0) return matched;
  }
  return pool.slice(0, 3);
}

function getDayDictationWords(dayNum) {
  const daySchedule = schedule.find(s => s.day === dayNum);
  if (!daySchedule) return shortWords.slice(0, 20);

  const methodA = parseMethodWords(daySchedule.methodA);
  const methodB = parseMethodWords(daySchedule.methodB);

  let pool = [];
  if (methodA.words) pool.push(...methodA.words);
  if (methodA.pairs) pool.push(...methodA.pairs.flatMap(p => [
    { word: p.wordA.word, kk: p.wordA.kk, coreMeaning: p.wordA.meaning },
    { word: p.wordB.word, kk: p.wordB.kk, coreMeaning: p.wordB.meaning }
  ]));
  if (methodB.words) pool.push(...methodB.words);
  if (methodB.groups) pool.push(...methodB.groups.flatMap(g => g.words.map(w => ({ word: w.word, kk: w.kk, coreMeaning: w.meaning }))));

  if (pool.length < 10) {
    pool.push(...shortWords.slice(0, 20 - pool.length));
  }
  return pool.slice(0, 20);
}

export function renderDaily(container, params) {
  const dayNum = parseInt(params.n);
  const dayData = schedule.find(s => s.day === dayNum);
  if (!dayData) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><p>找不到此天的資料</p></div>';
    return;
  }

  const dayStatus = store.getDayStatus(dayNum);
  let activeTab = params.m || 'A';

  function render() {
    const headerInfo = document.getElementById('header-info');
    headerInfo.textContent = `Day ${dayNum} / ${schedule.length}`;

    container.innerHTML = `
      <a href="#/" class="back-btn">← 回首頁</a>
      <div class="day-header">
        <div class="day-number">${dayNum}</div>
        <div class="day-meta">
          <div class="day-title">Day ${dayNum}</div>
          <div class="day-subtitle">新字 ${dayData.newWords} 個 ｜ 累計 ${dayData.cumulative} 字
            ${dayData.milestone ? ` ｜ ${dayData.milestone}` : ''}</div>
        </div>
      </div>
      <div class="tabs">
        <button class="tab ${activeTab === 'A' ? 'active' : ''}" data-tab="A">方法A</button>
        <button class="tab ${activeTab === 'B' ? 'active' : ''}" data-tab="B">方法B</button>
        <button class="tab ${activeTab === 'C' ? 'active' : ''}" data-tab="C">方法C</button>
      </div>
      <div class="method-card">
        <div class="method-label">方法 ${activeTab}</div>
        <div class="method-desc">${activeTab === 'A' ? dayData.methodA : activeTab === 'B' ? dayData.methodB : dayData.methodC}</div>
      </div>
      <div id="method-content"></div>
      <button class="btn btn-success btn-block btn-lg" id="complete-day" style="margin-top:16px">
        ${dayStatus === 'completed' ? '✓ 已完成' : '完成今天'}
      </button>
    `;

    container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        render();
      });
    });

    const content = container.querySelector('#method-content');
    renderMethodContent(content, activeTab, dayNum);

    container.querySelector('#complete-day').addEventListener('click', () => {
      store.completeDay(dayNum);
      if (dayNum < schedule.length) {
        location.hash = `#/day/${dayNum + 1}`;
      } else {
        location.hash = '#/';
      }
    });
  }

  render();
}

function renderMethodContent(content, tab, dayNum) {
  const dayData = schedule.find(s => s.day === dayNum);
  const desc = tab === 'A' ? dayData.methodA : tab === 'B' ? dayData.methodB : dayData.methodC;
  const parsed = parseMethodWords(desc);

  switch (parsed.type) {
    case 'flashcard':
      renderFlashcards(content, parsed.words);
      break;
    case 'pairs':
      renderPairCards(content, parsed.pairs);
      break;
    case 'roots':
      renderRootView(content, parsed.groups);
      break;
    case 'families':
      renderFamilyView(content, parsed.families);
      break;
    case 'slang':
      renderSlangView(content, parsed.words);
      break;
    case 'dictation':
      const dictWords = getDayDictationWords(dayNum);
      renderDictation(content, dictWords, allWordsList);
      break;
    case 'quiz':
      const quizPool = [...shortWords, ...trickyWords].sort(() => Math.random() - .5).slice(0, 10);
      const questions = buildMeaningQuiz(quizPool, [...shortWords, ...trickyWords]);
      renderQuiz(content, questions);
      break;
    case 'review':
      const weak = store.getWeakWords();
      if (weak.length > 0) {
        const reviewWords = weak.slice(0, 20).map(w => {
          const found = shortWords.find(sw => sw.word === w.word) ||
                        trickyWords.find(tw => tw.word === w.word) ||
                        officeSlang.find(os => os.slang === w.word);
          return found || { word: w.word, coreMeaning: '(複習)' };
        });
        renderFlashcards(content, reviewWords);
      } else {
        const allPool = [...shortWords, ...trickyWords].sort(() => Math.random() - .5).slice(0, 20);
        renderFlashcards(content, allPool);
      }
      break;
    default:
      content.innerHTML = `<div class="card"><p>${desc}</p></div>`;
  }
}

function renderRootView(content, groups) {
  let html = '';
  for (const g of groups) {
    html += `<div class="card">
      <div class="root-header">
        <span class="root-badge">${g.root}</span>
        <span class="root-meaning">= ${g.rootMeaning}</span>
      </div>
      <div class="root-words">
        ${g.words.map(w => `
          <div class="card" style="padding:10px;margin-bottom:0">
            ${speakerButton(w.word, 0.85, 'speaker-btn')}
            <div style="font-weight:700;margin-top:4px">${w.word}</div>
            <div style="font-size:.8rem;color:var(--text-secondary)">${w.kk || ''}</div>
            <div style="font-size:.85rem;color:var(--primary)">${w.meaning || ''}</div>
          </div>
        `).join('')}
      </div>
      ${g.dictationHint ? `<div style="font-size:.8rem;color:var(--text-secondary);margin-top:8px">🎧 ${g.dictationHint}</div>` : ''}
    </div>`;
  }
  content.innerHTML = html;
  bindSpeakerButtons(content);
}

function renderFamilyView(content, families) {
  let html = '';
  for (const f of families) {
    const cells = [
      { label: '動詞', word: f.verb },
      { label: '名詞(事)', word: f.nounThing },
      { label: '名詞(人)', word: f.nounPerson },
      { label: '形容詞', word: f.adjective },
      { label: '副詞/否定', word: f.adverbOrNeg }
    ];
    html += `<div class="card">
      <div class="root-header">
        <span class="root-badge">${f.root}</span>
      </div>
      <div class="family-grid">
        ${cells.map(c => c.word ?
          `<div class="family-cell">
            <div class="family-cell-label">${c.label}</div>
            <div class="family-cell-word">${c.word}</div>
          </div>` :
          `<div class="family-cell empty">
            <div class="family-cell-label">${c.label}</div>
            <div class="family-cell-word">—</div>
          </div>`
        ).join('')}
      </div>
      ${f.part5Hint ? `<div style="margin-top:8px;font-size:.85rem;background:var(--primary-light);padding:8px 12px;border-radius:var(--radius-sm)">📝 ${f.part5Hint}</div>` : ''}
      ${f.listeningDiff ? `<div style="margin-top:4px;font-size:.8rem;color:var(--text-secondary)">🎧 ${f.listeningDiff}</div>` : ''}
    </div>`;
  }
  content.innerHTML = html;
}

function renderSlangView(content, words) {
  let html = '';
  for (const w of words) {
    html += `<div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        ${speakerButton(w.slang, 0.85, 'speaker-btn')}
        <div style="font-size:1.3rem;font-weight:700">${w.slang}</div>
        <span style="font-size:.8rem;color:var(--text-secondary)">${w.kk || ''}</span>
      </div>
      <div class="slang-real">${w.realMeaning || ''}</div>
      <div class="slang-false">${w.falseTranslation || ''}</div>
      ${w.toeicWords ? `<div style="font-size:.8rem;color:var(--primary)">對應多益字：${w.toeicWords}</div>` : ''}
      ${w.context ? `<div class="slang-context">${w.context}</div>` : ''}
      ${w.speedTip ? `<div style="font-size:.75rem;color:var(--text-secondary);margin-top:4px">🔊 ${w.speedTip}</div>` : ''}
    </div>`;
  }
  content.innerHTML = html;
  bindSpeakerButtons(content);
}
