import { awlWords } from '../data/awlWords.js';
import { store } from '../store.js';
import { speak, speakerButton, bindSpeakerButtons, isSupported } from '../speech.js';

export function renderAwlDrill(container) {
  let mode = 'en2zh';
  let batchSize = 10;
  let selectedSub = 0; // 0 = all
  let currentBatch = [];
  let idx = 0;
  let correctCount = 0;
  let answered = false;
  let sessionResults = [];

  const sublistCounts = {};
  for (let i = 1; i <= 10; i++) {
    sublistCounts[i] = awlWords.filter(w => w.sub === i).length;
  }

  function getPool() {
    return selectedSub === 0 ? awlWords : awlWords.filter(w => w.sub === selectedSub);
  }

  function getNewBatch() {
    const pool = getPool();
    const weak = pool.filter(w => { const s = store.getWordStats(w.word); return s.seen > 0 && !s.mastered; });
    const unseen = pool.filter(w => store.getWordStats(w.word).seen === 0);
    const mastered = pool.filter(w => store.getWordStats(w.word).mastered);

    let batch = [];
    const weakPick = Math.min(Math.ceil(batchSize * 0.4), weak.length);
    const unseenPick = Math.min(Math.ceil(batchSize * 0.4), unseen.length);
    batch.push(...shuffle(weak).slice(0, weakPick));
    batch.push(...shuffle(unseen).slice(0, unseenPick));
    const remain = batchSize - batch.length;
    if (remain > 0) batch.push(...shuffle(mastered).slice(0, remain));
    while (batch.length < batchSize && batch.length < pool.length) {
      const r = pool.filter(w => !batch.includes(w));
      if (r.length === 0) break;
      batch.push(r[Math.floor(Math.random() * r.length)]);
    }
    return shuffle(batch);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getDistractors(correct, field, count = 3) {
    const pool = getPool();
    return shuffle(pool.filter(w => w[field] !== correct[field])).slice(0, count).map(w => w[field]);
  }

  function renderMain() {
    const pool = getPool();
    const seenCount = pool.filter(w => store.getWordStats(w.word).seen > 0).length;
    const masteredCount = pool.filter(w => store.getWordStats(w.word).mastered).length;

    container.innerHTML = `
      <div class="section-title">📚 AWL 學術字刷題</div>
      <p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:12px">
        Academic Word List 570 個學術高頻詞族，按頻率分 10 級
      </p>

      <div class="stats-grid" style="margin-bottom:12px">
        <div class="stat-card">
          <div class="stat-number">${seenCount}</div>
          <div class="stat-label">已刷過</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${masteredCount}</div>
          <div class="stat-label">已掌握</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${pool.length - masteredCount}</div>
          <div class="stat-label">待加強</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:.85rem;font-weight:600">掌握進度</span>
          <span style="font-size:.85rem;color:var(--text-secondary)">${masteredCount} / ${pool.length}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width:${(masteredCount/pool.length)*100}%;background:var(--success)"></div>
        </div>
      </div>

      <div class="section-title" style="margin-top:16px">Sublist 分級</div>
      <div class="filter-chips" style="margin-bottom:12px">
        <span class="chip ${selectedSub === 0 ? 'active' : ''}" data-sub="0">全部 (${awlWords.length})</span>
        ${[1,2,3,4,5,6,7,8,9,10].map(i => {
          const cnt = sublistCounts[i];
          const mastered = awlWords.filter(w => w.sub === i && store.getWordStats(w.word).mastered).length;
          return `<span class="chip ${selectedSub === i ? 'active' : ''}" data-sub="${i}" title="${mastered}/${cnt} 已掌握">
            L${i} (${cnt})
          </span>`;
        }).join('')}
      </div>

      <div class="section-title">刷題模式</div>
      <div class="tabs" style="margin-bottom:12px">
        <button class="tab ${mode === 'en2zh' ? 'active' : ''}" data-mode="en2zh">英 → 中</button>
        <button class="tab ${mode === 'zh2en' ? 'active' : ''}" data-mode="zh2en">中 → 英</button>
      </div>

      <div class="section-title">每輪題數</div>
      <div class="filter-chips" style="margin-bottom:16px">
        ${[10, 20, 30, 50].map(n =>
          `<span class="chip ${batchSize === n ? 'active' : ''}" data-batch="${n}">${n} 題</span>`
        ).join('')}
      </div>

      <button class="btn btn-primary btn-block btn-lg" id="awl-start">開始刷題</button>

      ${sessionResults.length > 0 ? `
        <div class="section-title" style="margin-top:20px">最近記錄</div>
        <div class="card" style="padding:0;overflow:hidden">
          ${sessionResults.slice(-5).reverse().map(r => `
            <div class="word-list-item">
              <div class="word-list-main">
                <div class="word-list-word" style="color:${r.rate >= 80 ? 'var(--success)' : r.rate >= 60 ? 'var(--warning)' : 'var(--danger)'}">
                  ${r.rate}% 正確
                </div>
                <div class="word-list-meaning">${r.correct}/${r.total} 題 ｜ ${r.label}</div>
              </div>
              <span style="font-size:.75rem;color:var(--text-secondary)">${r.time}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    container.querySelectorAll('[data-sub]').forEach(c => {
      c.addEventListener('click', () => { selectedSub = parseInt(c.dataset.sub); renderMain(); });
    });
    container.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => { mode = t.dataset.mode; renderMain(); });
    });
    container.querySelectorAll('[data-batch]').forEach(c => {
      c.addEventListener('click', () => { batchSize = parseInt(c.dataset.batch); renderMain(); });
    });
    container.querySelector('#awl-start').addEventListener('click', () => {
      currentBatch = getNewBatch();
      idx = 0; correctCount = 0;
      renderQuestion();
    });
  }

  function renderQuestion() {
    if (idx >= currentBatch.length) {
      const rate = Math.round(correctCount / currentBatch.length * 100);
      const now = new Date();
      sessionResults.push({
        correct: correctCount, total: currentBatch.length, rate, mode,
        label: `${mode === 'en2zh' ? '英→中' : '中→英'}${selectedSub ? ' L' + selectedSub : ''}`,
        time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
      });
      container.innerHTML = `
        <div class="score-display card">
          <div class="score-number" style="color:${rate >= 80 ? 'var(--success)' : rate >= 60 ? 'var(--warning)' : 'var(--danger)'}">${rate}%</div>
          <p style="margin:8px 0;font-size:1.1rem;font-weight:600">${correctCount} / ${currentBatch.length} 正確</p>
          <p style="color:var(--text-secondary);margin-bottom:16px">
            ${rate >= 90 ? '太厲害了！' : rate >= 70 ? '不錯，繼續加油！' : rate >= 50 ? '再多練幾次！' : '加油，多刷幾輪！'}
          </p>
          <div style="display:flex;gap:12px">
            <button class="btn btn-outline btn-block" id="awl-back">返回</button>
            <button class="btn btn-primary btn-block" id="awl-again">再刷一輪</button>
          </div>
        </div>`;
      container.querySelector('#awl-back').addEventListener('click', renderMain);
      container.querySelector('#awl-again').addEventListener('click', () => {
        currentBatch = getNewBatch(); idx = 0; correctCount = 0; renderQuestion();
      });
      return;
    }

    answered = false;
    const w = currentBatch[idx];
    let prompt, options, correctIdx;

    if (mode === 'en2zh') {
      prompt = w.word;
      const distractors = getDistractors(w, 'meaning');
      const all = shuffle([w.meaning, ...distractors]);
      options = all;
      correctIdx = all.indexOf(w.meaning);
    } else {
      prompt = w.meaning;
      const distractors = getDistractors(w, 'word');
      const all = shuffle([w.word, ...distractors]);
      options = all;
      correctIdx = all.indexOf(w.word);
    }

    container.innerHTML = `
      <div style="text-align:center;margin-bottom:8px;color:var(--text-secondary);font-size:.85rem">
        ${idx + 1} / ${currentBatch.length}
        ${selectedSub ? `<span class="freq-badge freq-a" style="margin-left:6px">L${w.sub}</span>` : ''}
      </div>
      <div class="progress-bar" style="margin-bottom:16px">
        <div class="progress-bar-fill" style="width:${(idx/currentBatch.length)*100}%;background:var(--primary)"></div>
      </div>
      <div class="card" style="text-align:center">
        ${mode === 'en2zh' && isSupported() ? speakerButton(prompt, 0.85) : ''}
        <div style="font-size:${mode === 'en2zh' ? '2rem' : '1.3rem'};font-weight:700;margin:12px 0">${prompt}</div>
        <div style="font-size:.85rem;color:var(--text-secondary)">
          ${mode === 'en2zh' ? '選出正確的中文意思' : '選出正確的英文單字'}
        </div>
      </div>
      <div class="quiz-options" style="margin-top:12px">
        ${options.map((opt, i) => `<button class="quiz-option" data-idx="${i}">${opt}</button>`).join('')}
      </div>
      <div id="awl-feedback" style="min-height:80px"></div>
    `;

    if (mode === 'en2zh' && isSupported()) setTimeout(() => speak(w.word, 0.85), 200);
    bindSpeakerButtons(container);

    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const chosen = parseInt(btn.dataset.idx);
        const isCorrect = chosen === correctIdx;

        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        if (!isCorrect) container.querySelectorAll('.quiz-option')[correctIdx].classList.add('correct');

        if (isCorrect) correctCount++;
        store.recordWord(w.word, isCorrect);

        const fb = container.querySelector('#awl-feedback');
        fb.innerHTML = `<div class="card" style="text-align:center;margin-top:8px">
          <div style="color:${isCorrect ? 'var(--success)' : 'var(--danger)'};font-weight:700;margin-bottom:6px">
            ${isCorrect ? '正確！' : '答錯了'}
          </div>
          <div style="font-size:1.1rem;font-weight:700">${w.word} <span class="freq-badge freq-a">L${w.sub}</span></div>
          <div style="color:var(--primary);margin:4px 0">${w.meaning}</div>
          ${w.example ? `<div style="font-size:.85rem;color:var(--text-secondary);font-style:italic">${w.example}</div>` : ''}
        </div>`;

        setTimeout(() => { idx++; renderQuestion(); }, isCorrect ? 1000 : 2000);
      });
    });
  }

  renderMain();
}
