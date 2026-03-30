import { speak, generateDistractors, isSupported, speakerIcon } from '../speech.js';
import { store } from '../store.js';

export function renderDictation(container, words, allWordPool) {
  if (!isSupported()) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔇</div><p>您的瀏覽器不支援語音功能</p></div>';
    return;
  }

  const queue = [...words].sort(() => Math.random() - 0.5);
  const retryQueue = [];
  let idx = 0;
  let correctCount = 0;
  let totalAnswered = 0;
  let answered = false;
  const rate = store.getSettings().speechRate || 0.85;

  function currentWord() {
    if (idx < queue.length) return queue[idx];
    if (retryQueue.length > 0) return retryQueue.shift();
    return null;
  }

  function renderCurrent() {
    const w = currentWord();
    if (!w) {
      container.innerHTML = `
        <div class="score-display card">
          <div class="score-number">${correctCount}/${totalAnswered}</div>
          <p style="margin:12px 0;color:var(--text-secondary)">聽寫完成！正確率 ${totalAnswered ? Math.round(correctCount/totalAnswered*100) : 0}%</p>
          <button class="btn btn-primary btn-block" id="dict-restart">再練一次</button>
        </div>`;
      container.querySelector('#dict-restart').addEventListener('click', () => {
        idx = 0; correctCount = 0; totalAnswered = 0; retryQueue.length = 0;
        queue.sort(() => Math.random() - 0.5);
        renderCurrent();
      });
      return;
    }

    answered = false;
    const word = w.word || w.slang || '';
    const meaning = w.coreMeaning || w.realMeaning || '';
    const distractors = generateDistractors(word, allWordPool, 3);
    const options = [word, ...distractors].sort(() => Math.random() - 0.5);
    const correctIdx = options.indexOf(word);

    container.innerHTML = `
      <div style="text-align:center;margin-bottom:8px;color:var(--text-secondary);font-size:.85rem">
        ${idx + 1} / ${queue.length}${retryQueue.length ? ` (+${retryQueue.length} 重試)` : ''}
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${(idx/queue.length)*100}%;background:var(--primary)"></div></div>
      <button class="dictation-speaker pulse" id="dict-play">${speakerIcon(48)}</button>
      <p style="text-align:center;color:var(--text-secondary);font-size:.85rem;margin-bottom:16px">點擊喇叭聽發音，選出正確的單字</p>
      <div class="quiz-options">
        ${options.map((opt, i) => `<button class="quiz-option" data-idx="${i}">${opt}</button>`).join('')}
      </div>
      <div id="dict-feedback" style="min-height:60px"></div>`;

    // Auto-play
    setTimeout(() => speak(word, rate), 300);

    container.querySelector('#dict-play').addEventListener('click', () => speak(word, rate));

    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const chosen = parseInt(btn.dataset.idx);
        const isCorrect = chosen === correctIdx;

        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
          container.querySelectorAll('.quiz-option')[correctIdx].classList.add('correct');
          retryQueue.push(w);
        }

        if (isCorrect) correctCount++;
        totalAnswered++;
        store.recordWord(word, isCorrect);

        const fb = container.querySelector('#dict-feedback');
        fb.innerHTML = `<div class="card" style="text-align:center">
          <div style="color:${isCorrect ? 'var(--success)' : 'var(--danger)'};font-weight:700;margin-bottom:4px">
            ${isCorrect ? '正確！' : '答錯了'}
          </div>
          <div style="font-size:1.2rem;font-weight:700">${word}</div>
          <div style="font-size:.85rem;color:var(--text-secondary)">${meaning}</div>
        </div>`;

        setTimeout(() => { idx++; renderCurrent(); }, 1500);
      });
    });
  }

  renderCurrent();
}
