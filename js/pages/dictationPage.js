import { shortWords } from '../data/shortWords.js';
import { confusingPairs } from '../data/confusingPairs.js';
import { trickyWords } from '../data/trickyWords.js';
import { rootWords } from '../data/rootWords.js';
import { toeicPhrases } from '../data/toeicPhrases.js';
import { renderDictation } from '../components/dictation.js';

const allWordsList = [
  ...shortWords.map(w => w.word),
  ...confusingPairs.flatMap(p => [p.wordA.word, p.wordB.word]),
  ...trickyWords.map(w => w.word),
  ...rootWords.flatMap(g => g.words.map(w => w.word)),
  ...toeicPhrases.map(p => p.keyWord)
].filter(Boolean);

export function renderDictationPage(container) {
  let activeFilter = 'all';

  function getWords() {
    switch (activeFilter) {
      case 'short': return shortWords;
      case 'tricky': return trickyWords.map(w => ({ word: w.word, kk: w.kk, coreMeaning: w.realMeaning }));
      case 'roots': return rootWords.flatMap(g => g.words.map(w => ({ word: w.word, kk: w.kk, coreMeaning: w.meaning })));
      case 'pairs': return confusingPairs.flatMap(p => [
        { word: p.wordA.word, kk: p.wordA.kk, coreMeaning: p.wordA.meaning },
        { word: p.wordB.word, kk: p.wordB.kk, coreMeaning: p.wordB.meaning }
      ]);
      default:
        return [
          ...shortWords.slice(0, 15),
          ...trickyWords.slice(0, 10).map(w => ({ word: w.word, kk: w.kk, coreMeaning: w.realMeaning })),
          ...rootWords.slice(0, 2).flatMap(g => g.words.map(w => ({ word: w.word, kk: w.kk, coreMeaning: w.meaning })))
        ];
    }
  }

  function render() {
    container.innerHTML = `
      <div class="section-title">🎧 聽寫模式</div>
      <div class="filter-chips">
        <span class="chip ${activeFilter === 'all' ? 'active' : ''}" data-f="all">綜合</span>
        <span class="chip ${activeFilter === 'short' ? 'active' : ''}" data-f="short">短字優先</span>
        <span class="chip ${activeFilter === 'tricky' ? 'active' : ''}" data-f="tricky">地雷字</span>
        <span class="chip ${activeFilter === 'pairs' ? 'active' : ''}" data-f="pairs">混淆字</span>
        <span class="chip ${activeFilter === 'roots' ? 'active' : ''}" data-f="roots">字根字</span>
      </div>
      <div id="dictation-area"></div>
    `;

    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.f;
        render();
      });
    });

    const words = getWords().sort(() => Math.random() - 0.5).slice(0, 20);
    renderDictation(container.querySelector('#dictation-area'), words, allWordsList);
  }

  render();
}
