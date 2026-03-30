import { speak, speakerButton, bindSpeakerButtons } from '../speech.js';
import { store } from '../store.js';

export function renderFlashcards(container, words, options = {}) {
  let idx = 0;
  let knownCount = 0;

  function renderCurrent() {
    if (idx >= words.length) {
      container.innerHTML = `
        <div class="score-display card">
          <div class="score-number">${knownCount}/${words.length}</div>
          <p style="margin:12px 0;color:var(--text-secondary)">本輪完成！</p>
          <button class="btn btn-primary btn-block" id="fc-restart">再練一次</button>
        </div>`;
      container.querySelector('#fc-restart').addEventListener('click', () => {
        idx = 0; knownCount = 0; renderCurrent();
      });
      return;
    }

    const w = words[idx];
    const word = w.word || w.slang || '';
    const kk = w.kk || '';
    const pos = w.pos || '';
    const meaning = w.coreMeaning || w.realMeaning || w.realMeaning || '';
    const second = w.secondMeaning || w.falseAssumption || '';
    const mnemonic = w.mnemonic || '';
    const freq = w.frequency || '';

    container.innerHTML = `
      <div style="text-align:center;margin-bottom:8px;color:var(--text-secondary);font-size:.85rem">
        ${idx + 1} / ${words.length}
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${(idx/words.length)*100}%;background:var(--primary)"></div></div>
      <div class="flashcard-container" style="margin-top:16px">
        <div class="flashcard" id="fc-card">
          <div class="flashcard-front">
            ${speakerButton(word, 0.85)}
            <div class="flashcard-word" style="margin-top:12px">${word}</div>
            <div class="flashcard-kk">${kk}</div>
            ${pos ? `<div class="flashcard-pos">${pos}</div>` : ''}
            ${freq ? `<span class="freq-badge freq-${freq.toLowerCase()}" style="margin-top:8px">${freq}</span>` : ''}
            <div style="margin-top:16px;font-size:.8rem;color:var(--text-secondary)">點擊翻面查看中文</div>
          </div>
          <div class="flashcard-back">
            <div class="flashcard-meaning">${meaning}</div>
            ${second ? `<div class="flashcard-second">${second}</div>` : ''}
            ${mnemonic ? `<div class="flashcard-mnemonic">${mnemonic}</div>` : ''}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:20px">
        <button class="btn btn-danger btn-block" id="fc-unknown">不認識</button>
        <button class="btn btn-success btn-block" id="fc-known">認識</button>
      </div>`;

    const card = container.querySelector('#fc-card');
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
      if (card.classList.contains('flipped') && store.getSettings().autoPlay) {
        speak(word);
      }
    });

    bindSpeakerButtons(container);

    container.querySelector('#fc-known').addEventListener('click', () => {
      store.recordWord(word, true);
      knownCount++;
      idx++;
      renderCurrent();
    });
    container.querySelector('#fc-unknown').addEventListener('click', () => {
      store.recordWord(word, false);
      idx++;
      renderCurrent();
    });
  }

  renderCurrent();
}
