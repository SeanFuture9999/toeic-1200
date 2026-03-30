import { store } from '../store.js';

export function renderQuiz(container, questions, options = {}) {
  let idx = 0;
  let correctCount = 0;
  let answered = false;

  function renderQuestion() {
    if (idx >= questions.length) {
      container.innerHTML = `
        <div class="score-display card">
          <div class="score-number">${correctCount}/${questions.length}</div>
          <p style="margin:12px 0;color:var(--text-secondary)">測驗完成！正確率 ${Math.round(correctCount/questions.length*100)}%</p>
          <button class="btn btn-primary btn-block" id="quiz-restart">再測一次</button>
        </div>`;
      container.querySelector('#quiz-restart').addEventListener('click', () => {
        idx = 0; correctCount = 0; renderQuestion();
      });
      return;
    }

    answered = false;
    const q = questions[idx];
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:8px;color:var(--text-secondary);font-size:.85rem">
        ${idx + 1} / ${questions.length}
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${(idx/questions.length)*100}%;background:var(--primary)"></div></div>
      <div class="card" style="text-align:center;margin-top:16px">
        <div style="font-size:1.5rem;font-weight:700;margin-bottom:4px">${q.prompt}</div>
        ${q.subPrompt ? `<div style="font-size:.85rem;color:var(--text-secondary)">${q.subPrompt}</div>` : ''}
      </div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `<button class="quiz-option" data-idx="${i}">${opt.label}</button>`).join('')}
      </div>
      <div id="quiz-feedback" style="min-height:40px"></div>`;

    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const chosen = parseInt(btn.dataset.idx);
        const isCorrect = chosen === q.correctIndex;

        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) {
          container.querySelectorAll('.quiz-option')[q.correctIndex].classList.add('correct');
        }

        if (isCorrect) correctCount++;
        if (q.word) store.recordWord(q.word, isCorrect);

        const fb = container.querySelector('#quiz-feedback');
        fb.innerHTML = `<div style="text-align:center;margin-top:8px;color:${isCorrect ? 'var(--success)' : 'var(--danger)'}">
          ${isCorrect ? '正確！' : `答錯了 — 正確答案：${q.options[q.correctIndex].label}`}
        </div>`;

        setTimeout(() => { idx++; renderQuestion(); }, 1200);
      });
    });
  }

  renderQuestion();
}

// Helper to build quiz questions from word data
export function buildMeaningQuiz(words, allWords) {
  return words.map(w => {
    const word = w.word || w.slang || '';
    const meaning = w.coreMeaning || w.realMeaning || '';
    const others = allWords
      .filter(o => (o.word || o.slang) !== word && (o.coreMeaning || o.realMeaning))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(o => ({ label: o.coreMeaning || o.realMeaning }));
    const correct = { label: meaning };
    const optionsList = [...others, correct].sort(() => Math.random() - 0.5);
    return {
      prompt: word,
      subPrompt: w.kk || '',
      word,
      options: optionsList,
      correctIndex: optionsList.indexOf(correct)
    };
  });
}
