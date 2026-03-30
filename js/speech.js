let supported = null;

export function isSupported() {
  if (supported === null) supported = 'speechSynthesis' in window;
  return supported;
}

export function speak(word, rate = 0.85) {
  if (!isSupported()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  u.rate = rate;
  speechSynthesis.speak(u);
}

export function speakerIcon(size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
}

export function speakerButton(word, rate, className = 'speaker-btn') {
  return `<button class="${className}" data-speak="${word}" data-rate="${rate || 0.85}" title="播放發音">${speakerIcon()}</button>`;
}

export function bindSpeakerButtons(container) {
  container.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(btn.dataset.speak, parseFloat(btn.dataset.rate) || 0.85);
    });
  });
}

// Generate distractor options for dictation
export function generateDistractors(target, pool, count = 3) {
  const targetLower = target.toLowerCase();
  const scored = pool
    .filter(w => w.toLowerCase() !== targetLower)
    .map(w => ({ word: w, dist: levenshtein(targetLower, w.toLowerCase()) }))
    .sort((a, b) => a.dist - b.dist);

  const result = [];
  const used = new Set();
  // Pick closest words
  for (const s of scored) {
    if (result.length >= count) break;
    if (!used.has(s.word.toLowerCase())) {
      result.push(s.word);
      used.add(s.word.toLowerCase());
    }
  }
  // Fill if needed
  while (result.length < count && scored.length > result.length) {
    const w = scored[result.length].word;
    if (!used.has(w.toLowerCase())) {
      result.push(w);
      used.add(w.toLowerCase());
    }
  }
  return result;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}
