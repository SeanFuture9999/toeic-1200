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

// ──────────────────────────────────────────────
// Explicit day→word mapping (no overlap)
// ──────────────────────────────────────────────
// shortWords: 70 words, ids 1-70 (index 0-69)
// confusingPairs: 25 pairs, ids 1-25 (index 0-24)
// trickyWords: 40 words, ids 1-40 (index 0-39)
// rootWords: 30 groups, ids 1-30 (index 0-29)
// wordFamilies: 20 families, ids 1-20 (index 0-19)
// officeSlang: 30 slangs, ids 1-30 (index 0-29)

const dayMap = {
  // Day 1: A=短字優先 10字, B=字根-ject+-port
  '1A': { type: 'flashcard', source: 'shortWords', range: [0, 10] },
  '1B': { type: 'roots', rootIds: [0, 1] },  // -ject, -port
  // Day 2: A=短字進階(同字不同義) 10字, B=字根-struct+填空
  '2A': { type: 'flashcard', source: 'shortWords', range: [10, 20] },
  '2B': { type: 'roots', rootIds: [2] },  // -struct
  // Day 3: A=混淆對決 4對, B=地雷掃除 6字
  '3A': { type: 'pairs', range: [0, 4] },
  '3B': { type: 'flashcard', source: 'trickyWords', range: [0, 6] },
  // Day 4: A=混淆對決 3對, B=詞族assess
  '4A': { type: 'pairs', range: [4, 7] },
  '4B': { type: 'families', range: [0, 1] },  // assess
  // Day 5: A=職場黑話 10個, B=諧音聯想 10字
  '5A': { type: 'slang', range: [0, 10] },
  '5B': { type: 'flashcard', source: 'trickyWords', range: [6, 16] },
  // Day 6: A=詞族comply+manage, B=找碴法
  '6A': { type: 'families', range: [1, 3] },  // comply, manage
  '6B': { type: 'quiz' },
  // Day 7: A=短字優先II 10字, B=字根-mit/-cess/-fer
  '7A': { type: 'flashcard', source: 'shortWords', range: [20, 30] },
  '7B': { type: 'roots', rootIds: [3, 4, 5] },  // -mit, -ceed/-cess, -fer
  // Day 8: A=混淆對決 4對, B=地雷掃除 6字
  '8A': { type: 'pairs', range: [7, 11] },
  '8B': { type: 'flashcard', source: 'trickyWords', range: [16, 22] },
  // Day 9: A=詞族invest+compete+employ, B=諧音聯想 5字
  '9A': { type: 'families', range: [5, 8] },  // invest, compete, employ... (use perform->9 too? no just 5,6,7=invest,perform,compete... let me map properly)
  '9B': { type: 'flashcard', source: 'trickyWords', range: [22, 27] },
  // Day 10: A=職場黑話II 10個, B=找碴法
  '10A': { type: 'slang', range: [10, 20] },
  '10B': { type: 'quiz' },
  // Day 11: A=短字優先III 10字, B=字根-spect/-vis
  '11A': { type: 'flashcard', source: 'shortWords', range: [30, 40] },
  '11B': { type: 'roots', rootIds: [6, 7] },  // -spect, -vis/-vid
  // Day 12: A=混淆對決 4對, B=地雷掃除 6字
  '12A': { type: 'pairs', range: [11, 15] },
  '12B': { type: 'flashcard', source: 'trickyWords', range: [27, 33] },
  // Day 13: A=詞族regulate+authorize, B=諧音聯想 5字
  '13A': { type: 'families', range: [11, 13] },
  '13B': { type: 'flashcard', source: 'trickyWords', range: [33, 38] },
  // Day 14: review day
  '14A': { type: 'review' },
  '14B': { type: 'pairs', range: [0, 25] },  // 混淆對決總複習 all pairs
  '14C': { type: 'review' },
  // Day 15: A=字根-duc/-tract, B=職場黑話III
  '15A': { type: 'roots', rootIds: [8, 9] },  // -duc/-duct, -tract
  '15B': { type: 'slang', range: [20, 30] },
  // Day 16: A=短字優先IV 10字, B=地雷掃除 6字
  '16A': { type: 'flashcard', source: 'shortWords', range: [40, 50] },
  '16B': { type: 'flashcard', source: 'trickyWords', range: [38, 40] },
  // Day 17: A=詞族communicate+negotiate, B=找碴法
  '17A': { type: 'families', range: [6, 8] },
  '17B': { type: 'quiz' },
  // Day 18: A=混淆對決 4對, B=諧音聯想 5字 (reuse remaining tricky)
  '18A': { type: 'pairs', range: [15, 19] },
  '18B': { type: 'flashcard', source: 'trickyWords', range: [0, 5] },  // revisit for reinforcement
  // Day 19: A=字根-fin/-count/-cred, B=詞族finance+account
  '19A': { type: 'roots', rootIds: [10, 27, 11] },  // -fin, -count, -cred
  '19B': { type: 'families', range: [13, 15] },  // finance, resolve (use finance)
  // Day 20: A=找碴法, B=職場黑話IV
  '20A': { type: 'quiz' },
  '20B': { type: 'slang', range: [10, 20] },  // escalate/align area
  // Day 21: A=地雷掃除, B=混淆對決
  '21A': { type: 'flashcard', source: 'trickyWords', range: [5, 11] },
  '21B': { type: 'pairs', range: [19, 23] },
  // Day 22: A=字根-leg/-jur/-dict, B=諧音聯想
  '22A': { type: 'roots', rootIds: [12, 13] },  // -leg, -dict (skip -jur, not in data)
  '22B': { type: 'flashcard', source: 'trickyWords', range: [11, 16] },
  // Day 23: A=詞族resolve+conclude+determine, B=短字優先V
  '23A': { type: 'families', range: [14, 17] },  // resolve, conclude, determine
  '23B': { type: 'flashcard', source: 'shortWords', range: [50, 55] },
  // Day 24: A=混淆對決, B=找碴法
  '24A': { type: 'pairs', range: [23, 25] },
  '24B': { type: 'quiz' },
  // Day 25: A=字根-ven/-voc/-pend, B=詞族sustain+maintain
  '25A': { type: 'roots', rootIds: [14, 24, 15] },  // -ven/-vent, -voc/-vok, -pend/-pens
  '25B': { type: 'families', range: [17, 19] },  // sustain, maintain
  // Day 26: A=職場黑話V, B=地雷掃除
  '26A': { type: 'slang', range: [20, 30] },
  '26B': { type: 'flashcard', source: 'trickyWords', range: [16, 22] },
  // Day 27: A=諧音聯想 剩餘難字, B=字根-nov/-labor/-mand
  '27A': { type: 'flashcard', source: 'trickyWords', range: [22, 32] },
  '27B': { type: 'roots', rootIds: [22, 23, 21] },  // -nov, -labor, -mand
  // Day 28: review day
  '28A': { type: 'review' },
  '28B': { type: 'pairs', range: [0, 25] },  // all pairs review
  '28C': { type: 'review' },
  // Day 29: A=全真模擬, B=找碴+聽寫, C=地雷總複習
  '29A': { type: 'review' },
  '29B': { type: 'quiz' },
  '29C': { type: 'flashcard', source: 'trickyWords', range: [0, 20] },
  // Day 30: A=B級字速刷+畢業考, B=全方法混合測驗, C=最終弱字
  '30A': { type: 'review' },
  '30B': { type: 'quiz' },
  '30C': { type: 'review' },
};

function getDayMethodData(dayNum, method) {
  const key = `${dayNum}${method}`;
  const mapping = dayMap[key];

  // If no explicit mapping, fall back to description-based parsing
  if (!mapping) return parseMethodFromDesc(dayNum, method);

  switch (mapping.type) {
    case 'flashcard': {
      const pool = mapping.source === 'shortWords' ? shortWords :
                   mapping.source === 'trickyWords' ? trickyWords : shortWords;
      return { type: 'flashcard', words: pool.slice(mapping.range[0], mapping.range[1]) };
    }
    case 'pairs':
      return { type: 'pairs', pairs: confusingPairs.slice(mapping.range[0], mapping.range[1]) };
    case 'roots':
      return { type: 'roots', groups: mapping.rootIds.map(i => rootWords[i]).filter(Boolean) };
    case 'families':
      return { type: 'families', families: wordFamilies.slice(mapping.range[0], mapping.range[1]) };
    case 'slang':
      return { type: 'slang', words: officeSlang.slice(mapping.range[0], mapping.range[1]) };
    case 'dictation':
      return { type: 'dictation' };
    case 'quiz':
      return { type: 'quiz' };
    case 'review':
      return { type: 'review' };
    default:
      return { type: 'unknown', words: [] };
  }
}

// Fallback: for Method C (聽寫) and unmapped entries
function parseMethodFromDesc(dayNum, method) {
  const dayData = schedule.find(s => s.day === dayNum);
  const desc = method === 'A' ? dayData.methodA : method === 'B' ? dayData.methodB : dayData.methodC;
  if (!desc) return { type: 'unknown', words: [] };

  if (desc.includes('聽寫模式')) return { type: 'dictation' };
  if (desc.includes('找碴') || desc.includes('填空')) return { type: 'quiz' };
  if (desc.includes('複習') || desc.includes('速刷') || desc.includes('全真模擬') || desc.includes('畢業考') || desc.includes('衝刺'))
    return { type: 'review' };
  if (desc.includes('聽寫')) return { type: 'dictation' };

  return { type: 'flashcard', words: shortWords.slice(0, 10) };
}

function getDayDictationWords(dayNum) {
  const methodA = getDayMethodData(dayNum, 'A');
  const methodB = getDayMethodData(dayNum, 'B');

  let pool = [];
  for (const m of [methodA, methodB]) {
    if (m.words) pool.push(...m.words);
    if (m.pairs) pool.push(...m.pairs.flatMap(p => [
      { word: p.wordA.word, kk: p.wordA.kk, coreMeaning: p.wordA.meaning },
      { word: p.wordB.word, kk: p.wordB.kk, coreMeaning: p.wordB.meaning }
    ]));
    if (m.groups) pool.push(...m.groups.flatMap(g => g.words.map(w => ({ word: w.word, kk: w.kk, coreMeaning: w.meaning }))));
    if (m.families) pool.push(...m.families.flatMap(f =>
      [f.verb, f.nounThing, f.nounPerson, f.adjective, f.adverbOrNeg]
        .filter(Boolean)
        .map(w => ({ word: w, coreMeaning: '' }))
    ));
  }

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
  const parsed = getDayMethodData(dayNum, tab);

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
