import { speakerButton, bindSpeakerButtons } from '../speech.js';
import { store } from '../store.js';

export function renderPairCards(container, pairs) {
  let idx = 0;

  function renderPair() {
    if (idx >= pairs.length) {
      container.innerHTML = `
        <div class="score-display card">
          <div class="score-number">${pairs.length}</div>
          <p style="margin:12px 0;color:var(--text-secondary)">所有混淆對已學完！</p>
          <button class="btn btn-primary btn-block" id="pair-restart">再看一次</button>
        </div>`;
      container.querySelector('#pair-restart').addEventListener('click', () => { idx = 0; renderPair(); });
      return;
    }

    const p = pairs[idx];
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:8px;color:var(--text-secondary);font-size:.85rem">
        ${idx + 1} / ${pairs.length}
      </div>
      <div class="pair-container">
        <div class="pair-card">
          ${speakerButton(p.wordA.word, 0.85)}
          <div class="pair-word" style="margin-top:8px">${p.wordA.word}</div>
          <div class="pair-kk">${p.wordA.kk || ''}</div>
          <div class="pair-meaning">${p.wordA.meaning || ''}</div>
        </div>
        <div class="pair-card">
          ${speakerButton(p.wordB.word, 0.85)}
          <div class="pair-word" style="margin-top:8px">${p.wordB.word}</div>
          <div class="pair-kk">${p.wordB.kk || ''}</div>
          <div class="pair-meaning">${p.wordB.meaning || ''}</div>
        </div>
      </div>
      <div class="mnemonic-box">
        <strong>秒殺口訣：</strong>${p.mnemonic || ''}
      </div>
      ${p.toeicHint ? `<div class="card"><strong>多益考法：</strong>${p.toeicHint}</div>` : ''}
      ${p.dictationTrap ? `<div style="margin-top:8px;font-size:.85rem;color:var(--warning)">⚠️ ${p.dictationTrap}</div>` : ''}
      <div style="display:flex;gap:12px;margin-top:16px">
        <button class="btn btn-outline btn-block" id="pair-prev" ${idx === 0 ? 'disabled' : ''}>上一對</button>
        <button class="btn btn-primary btn-block" id="pair-next">${idx < pairs.length - 1 ? '下一對' : '完成'}</button>
      </div>`;

    bindSpeakerButtons(container);
    container.querySelector('#pair-prev')?.addEventListener('click', () => { if (idx > 0) { idx--; renderPair(); } });
    container.querySelector('#pair-next').addEventListener('click', () => {
      store.recordWord(p.wordA.word, true);
      store.recordWord(p.wordB.word, true);
      idx++; renderPair();
    });
  }

  renderPair();
}

export function renderPairQuiz(container, pairs, allWords) {
  const questions = pairs.map(p => {
    const isA = Math.random() > 0.5;
    const sentence = p.toeicHint || `${p.wordA.word} vs ${p.wordB.word}`;
    return {
      prompt: sentence,
      subPrompt: isA ? `選出「${p.wordA.meaning}」的字` : `選出「${p.wordB.meaning}」的字`,
      word: isA ? p.wordA.word : p.wordB.word,
      options: [
        { label: p.wordA.word },
        { label: p.wordB.word }
      ],
      correctIndex: isA ? 0 : 1
    };
  });
  // Reuse quiz component
  import('../components/quiz.js').then(({ renderQuiz }) => {
    renderQuiz(container, questions);
  });
}
