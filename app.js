const $ = (s) => document.querySelector(s),
  modal = $('#modal'),
  stage = $('#stage');
const labels = {
  all: 'Uchlik arena',
  reaction: 'Chaqmoq barmoq',
  memory: 'Miya fleshkasi',
  color: 'Ko‘zingga ishonma',
};
const colors = [
  { name: 'QIZIL', hex: '#ff7a73' },
  { name: 'YASHIL', hex: '#c3f653' },
  { name: 'KO‘K', hex: '#85b8ff' },
  { name: 'SARIQ', hex: '#ffe177' },
];
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
let timer,
  timeout,
  epoch = 0,
  run = null,
  rankMode = 'all',
  context = {},
  lastResult = null;
let savedName = '';
try {
  savedName = localStorage.getItem('chiq-name') || '';
} catch {}
function toast(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('show');
  clearTimeout(timeout);
  timeout = setTimeout(() => $('#toast').classList.remove('show'), 3200);
}
async function api(path, body) {
  const r = await fetch('/api/' + path, {
    ...(body !== undefined
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error('Server bilan aloqa uzildi. Yana urinib ko‘ring.');
  }
  if (!r.ok) throw Error(data.error || 'Xatolik yuz berdi.');
  return data;
}
function clear() {
  clearTimeout(timer);
  epoch++;
}
function open() {
  clear();
  if (!modal.open) modal.showModal();
}
function close() {
  clear();
  run = null;
  modal.close();
}
$('#close-modal').onclick = close;
modal.addEventListener('cancel', () => {
  clear();
  run = null;
});
function center(html) {
  stage.innerHTML = '<div class="stage-center">' + html + '</div>';
}
function intro(mode = 'all', extra = {}) {
  open();
  context = { mode, ...extra };
  const title = extra.daily
    ? 'Bugunning sinovi'
    : extra.challenge
      ? 'Challenge qabul qilindi!'
      : extra.room
        ? 'Xona: ' + extra.room
        : labels[mode];
  center(/* HTML */ `
    <div class="stage-eyebrow">TAYYORMISAN? →</div>
    <h2>${esc(title)}</h2>
    <p>
      ${mode === 'all'
        ? 'Reaksiya + xotira + diqqat. Uchta sinovda o‘zingni ko‘rsat.'
        : mode === 'reaction'
          ? 'Yashil yonganda imkon qadar tez bos. Erta bossang, raundga 0 ball.'
          : mode === 'memory'
            ? 'Raqam bir lahza ko‘rinadi. Eslab qol va yashiringach yoz.'
            : 'Yozuvning MA’NOSINI emas, yozilgan RANGINI tanla.'}
    </p>
    ${extra.opponent
      ? /* HTML */ `
          <div class="challenge-banner">
            <strong>${esc(extra.opponent.name)}</strong>
            : ${extra.opponent.score} ball.
            <br />
            Shu rekordni yangilay olasanmi?
          </div>
        `
      : ''}
    <form class="name-form" id="name-form">
      <label for="player-name">Jadvalda qaysi nom bilan chiqasan?</label>
      <input
        id="player-name"
        maxlength="20"
        placeholder="Isming yoki taxallusing"
        required
        autocomplete="nickname"
        value="${esc(savedName)}"
      />
      <p class="hint">Taxallus va ball umumiy jadvalda ko‘rinadi.</p>
      <button class="primary" type="submit">Ketdik! →</button>
    </form>
  `);
  $('#name-form').onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector('button');
    button.disabled = true;
    button.textContent = 'Tayyorlanyapti…';
    savedName = $('#player-name').value.trim();
    try {
      localStorage.setItem('chiq-name', savedName);
    } catch {}
    const current = epoch;
    try {
      const data = await api('start', { ...context, name: savedName, opponent: undefined });
      if (current !== epoch) return;
      run = { ...data, index: 0, answers: [], name: savedName };
      step();
    } catch (err) {
      if (current !== epoch) return;
      toast(err.message);
      button.disabled = false;
      button.textContent = 'Yana urinib ko‘r →';
    }
  };
}
function step() {
  clear();
  const s = run.steps[run.index];
  const current = epoch;
  center(/* HTML */ `
    <div class="progress">
      <span style="width:${(run.index / run.steps.length) * 100}%"></span>
    </div>
    <div class="stage-eyebrow">
      ${run.index + 1} / ${run.steps.length} ·
      ${s.type === 'reaction' ? 'REAKSIYA' : s.type === 'memory' ? 'XOTIRA' : 'DIQQAT'}
    </div>
    <div id="round"></div>
  `);
  const round = $('#round');
  let settled = false;
  const answer = (value, ms) => {
    if (settled || current !== epoch || !run) return;
    settled = true;
    clearTimeout(timer);
    run.answers.push({ value, ms: Math.min(60000, Math.max(0, ms)) });
    round.innerHTML = /* HTML */ `
      <div class="round-feedback">
        ${s.type === 'reaction'
          ? value
            ? Math.round(ms) + ' ms'
            : 'Shoshilding!'
          : s.type === 'memory'
            ? String(value) === s.value
              ? 'Esingda ekan! ✦'
              : 'Keyingisida topasan!'
            : value === s.ink
              ? 'To‘g‘ri! →'
              : 'Chalg‘iding!'}
      </div>
      <p>
        ${s.type === 'reaction' && !value
          ? 'Yashilni kutish kerak edi.'
          : s.type === 'memory' && String(value) !== s.value
            ? 'Javob: ' + esc(s.value)
            : 'Keyingi raund…'}
      </p>
    `;
    timer = setTimeout(() => {
      if (current !== epoch || !run) return;
      run.index++;
      if (run.index === run.steps.length) finish();
      else step();
    }, 800);
  };
  if (s.type === 'reaction') {
    round.innerHTML = /* HTML */ `
      <button class="reaction-pad" id="pad">
        <span>Shoshma…</span>
        <small>Yashil yonganda bos!</small>
      </button>
      <p class="hint">Tugmani bos yoki Space tugmasidan foydalan.</p>
    `;
    const pad = $('#pad');
    let ready = 0;
    pad.focus();
    pad.onclick = () => answer(Boolean(ready), ready ? performance.now() - ready : 0);
    timer = setTimeout(() => {
      if (current !== epoch) return;
      pad.classList.add('ready');
      pad.innerHTML = '<span>BOS! ϟ</span><small>Hozir!</small>';
      ready = performance.now();
      timer = setTimeout(() => answer(false, 4000), 4000);
    }, s.delay);
  } else if (s.type === 'memory') {
    round.innerHTML =
      '<h2>Eslab qol.</h2><div class="digits" id="digits"></div><p>Raqam yashiringach, javobni yoz.</p>';
    $('#digits').textContent = s.value;
    timer = setTimeout(() => {
      if (current !== epoch) return;
      round.innerHTML = /* HTML */ `
        <h2>Qaysi raqam edi?</h2>
        <div class="digits">· · ·</div>
        <form class="memory-form" id="memory-form">
          <label class="sr-only" for="memory-answer">Eslagan raqamingiz</label>
          <input
            id="memory-answer"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="7"
            autocomplete="off"
            required
          />
          <button class="primary" type="submit">→</button>
        </form>
        <p class="hint">Javob uchun 12 soniya.</p>
      `;
      const began = performance.now();
      $('#memory-answer').focus();
      $('#memory-form').onsubmit = (e) => {
        e.preventDefault();
        answer($('#memory-answer').value.trim(), performance.now() - began);
      };
      timer = setTimeout(() => answer('', 12000), 12000);
    }, s.show);
  } else {
    round.innerHTML = /* HTML */ `
      <h2>Yozuv qaysi rangda?</h2>
      <p>So‘zni o‘qima. Rangini tanla.</p>
      <div class="color-word" style="color:${colors[s.ink].hex}">${colors[s.word].name}</div>
      <div class="color-options">
        ${colors
          .map(
            (c, i) => /* HTML */ `
              <button data-color="${i}">${c.name}</button>
            `,
          )
          .join('')}
      </div>
      <p class="hint">Har savol uchun 6 soniya.</p>
    `;
    const began = performance.now();
    round
      .querySelectorAll('[data-color]')
      .forEach(
        (b) => (b.onclick = () => answer(Number(b.dataset.color), performance.now() - began)),
      );
    timer = setTimeout(() => answer(-1, 6000), 6000);
  }
}
async function finish() {
  clear();
  const current = epoch;
  center(
    '<div class="stage-eyebrow">NATIJA</div><h2>Hisoblayapmiz…</h2><p>Rekording joyiga qo‘yilyapti →</p>',
  );
  try {
    const result = await api('finish', { token: run.token, answers: run.answers });
    if (current !== epoch) return;
    lastResult = result;
    showResult(result);
    loadRank();
  } catch (err) {
    if (current !== epoch) return;
    center(/* HTML */ `
      <h2>Ulanish uzildi.</h2>
      <p class="error">${esc(err.message)}</p>
      <button class="primary" id="retry-save">Natijani qayta saqlash →</button>
      <button class="secondary" id="restart-error">Yangi urinish</button>
    `);
    $('#retry-save').onclick = finish;
    $('#restart-error').onclick = () => intro(context.mode, context);
  }
}
function title(score) {
  return score >= 850
    ? 'Mahallaning Eynshteyni ✦'
    : score >= 650
      ? 'Miya: turbo rejimda ϟ'
      : score >= 400
        ? 'Ichingda kuch bor →'
        : 'Qizish mashqi tugadi ☀';
}
function challengeLink(r) {
  return location.origin + '/?c=' + r.id;
}
function showResult(r) {
  center(/* HTML */ `
    <div class="stage-eyebrow">${esc(r.name)} · ${labels[r.mode].toUpperCase()}</div>
    <h2>Natija gapirsin.</h2>
    <div class="result-score">
      ${r.score}
      <small>/1000</small>
    </div>
    <span class="result-title">${title(r.score)}</span>
    <p>
      ${context.opponent
        ? r.score > context.opponent.score
          ? 'Do‘sting rekordini yangilading! 🔥'
          : r.score === context.opponent.score
            ? 'Durang! Yana bitta urinish-chi?'
            : 'Do‘sting hali oldinda. Qayta urinib ko‘r!'
        : 'Yaxshi. Endi do‘stingni sinab ko‘ramizmi?'}
    </p>
    <button class="primary" id="share-result">Do‘stingga challenge →</button>
    <div class="result-actions">
      <button class="secondary" id="copy-result">Havolani nusxalash</button>
      <button class="secondary" id="download-result">Natija rasmi ↓</button>
    </div>
    <button class="primary" id="again">Yana bir marta ↻</button>
    ${r.room ? '<button class="secondary" id="back-room">Xona natijalari →</button>' : ''}
    <p class="hint">Ball: tezlik va to‘g‘ri javoblar asosida.</p>
  `);
  $('#share-result').onclick = () => {
    const u =
      'https://t.me/share/url?url=' +
      encodeURIComponent(challengeLink(r)) +
      '&text=' +
      encodeURIComponent(`${r.name}: ${r.score}/1000 ball! Meni yenga olasanmi? ⚡`);
    window.open(u, '_blank', 'noopener,noreferrer');
  };
  $('#copy-result').onclick = () => copy(challengeLink(r));
  $('#download-result').onclick = () => downloadCard(r);
  $('#again').onclick = () => intro(context.mode, context);
  if (r.room) $('#back-room').onclick = () => showRoom(r.room);
}
async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast('Havola nusxalandi!');
  } catch {
    center(/* HTML */ `
      <h2>Challenge havolasi</h2>
      <p>Havolani belgilab nusxalang.</p>
      <input id="copy-link" readonly value="${esc(value)}" style="width:100%" />
      <button class="primary" id="copy-back">Orqaga</button>
    `);
    $('#copy-link').select();
    $('#copy-back').onclick = () => (lastResult ? showResult(lastResult) : close());
  }
}
function downloadCard(r) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const c = canvas.getContext('2d');
  c.fillStyle = '#121310';
  c.fillRect(0, 0, 1080, 1080);
  c.strokeStyle = '#34372d';
  c.strokeRect(45, 45, 990, 990);
  c.fillStyle = '#c3f653';
  c.font = '900 44px Arial';
  c.fillText('CHIQ CHIQ →', 85, 135);
  c.fillStyle = '#f3f4e9';
  c.font = 'bold 55px Arial';
  c.fillText(r.name, 85, 285);
  c.font = '900 245px Arial';
  c.fillStyle = '#c3f653';
  c.fillText(String(r.score), 70, 560);
  c.font = '32px Arial';
  c.fillStyle = '#a1a695';
  c.fillText('/ 1000 BALL', 85, 620);
  c.fillStyle = '#ba9cfa';
  c.font = 'bold 36px Arial';
  c.fillText(title(r.score), 85, 735);
  c.fillStyle = '#f3f4e9';
  c.font = 'bold 47px Arial';
  c.fillText('MENI YENGA OLASANMI?', 85, 865);
  c.fillStyle = '#a1a695';
  c.font = '23px Arial';
  c.fillText(location.hostname, 85, 965);
  canvas.toBlob((blob) => {
    if (!blob) return toast('Rasmni saqlab bo‘lmadi.');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chiqchiq-' + r.score + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}
async function loadRank() {
  const requested = rankMode;
  try {
    const rows = await api('leaderboard?mode=' + requested);
    if (rankMode !== requested) return;
    $('#leaderboard').innerHTML = rows.length
      ? rows
          .map(
            (r, i) => /* HTML */ `
              <div class="rank-row">
                <span class="rank-number">${String(i + 1).padStart(2, '0')}</span>
                <span class="rank-avatar">${esc(r.name.slice(0, 1).toUpperCase())}</span>
                <span class="rank-name">${esc(r.name)}</span>
                <span class="rank-score">
                  ${r.score}
                  <small>ball</small>
                </span>
              </div>
            `,
          )
          .join('')
      : '<div class="empty">Hozircha rekord yo‘q.<br>Birinchi bo‘lish uchun ayni vaqt! →</div>';
  } catch {
    $('#leaderboard').innerHTML = /* HTML */ `
      <div class="empty">
        Jadval yuklanmadi.
        <br />
        <button class="secondary" id="rank-retry">Qayta yuklash</button>
      </div>
    `;
    $('#rank-retry').onclick = loadRank;
  }
}
async function createRoom() {
  try {
    const r = await api('rooms', {});
    showRoom(r.code);
  } catch (e) {
    toast(e.message);
  }
}
async function showRoom(code) {
  open();
  const current = epoch;
  center('<h2>Xona ochilyapti…</h2>');
  try {
    const room = await api('rooms/' + encodeURIComponent(code));
    const rows = await api('leaderboard?room=' + room.code);
    if (current !== epoch) return;
    center(/* HTML */ `
      <div class="stage-eyebrow">DO‘STLAR XONASI · ${rows.length}/8 URINISH</div>
      <h2>Kodni ulash. Bellash.</h2>
      <div class="room-code-big">${room.code}</div>
      <p>
        Hamma bir xil sinovdan o‘tadi.
        <br />
        Xona 24 soat ochiq. 8 tagacha urinish.
      </p>
      <button class="primary" id="room-play" ${rows.length >= 8 ? 'disabled' : ''}>
        ${rows.length >= 8 ? 'Xona to‘ldi' : 'Xonada o‘ynash →'}
      </button>
      <div class="result-actions">
        <button class="secondary" id="room-copy">Taklif havolasi</button>
        <button class="secondary" id="room-refresh">Natijalarni yangilash</button>
      </div>
      <div class="leaderboard">
        ${rows.length
          ? rows
              .map(
                (r, i) => /* HTML */ `
                  <div class="rank-row">
                    <span class="rank-number">${i + 1}</span>
                    <span class="rank-name">${esc(r.name)}</span>
                    <span class="rank-score">
                      ${r.score}
                      <small>ball</small>
                    </span>
                  </div>
                `,
              )
              .join('')
          : '<div class="empty">Hali hech kim o‘ynamadi. Boshlab ber! →</div>'}
      </div>
    `);
    $('#room-play').onclick = () => intro('all', { room: room.code });
    $('#room-copy').onclick = () => copy(location.origin + '/?room=' + room.code);
    $('#room-refresh').onclick = () => showRoom(room.code);
  } catch (e) {
    if (current === epoch) {
      center(/* HTML */ `
        <h2>Xona topilmadi.</h2>
        <p>${esc(e.message)}</p>
        <button class="primary" id="new-room">Yangi xona ochish +</button>
      `);
      $('#new-room').onclick = createRoom;
    }
  }
}
$('#start-all').onclick = () => intro();
$('#bottom-play').onclick = () => intro();
$('#daily').onclick = () => intro('all', { daily: true });
document.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => intro(b.dataset.mode)));
document.querySelectorAll('[data-rank]').forEach(
  (b) =>
    (b.onclick = () => {
      rankMode = b.dataset.rank;
      document
        .querySelectorAll('[data-rank]')
        .forEach((x) => x.classList.toggle('active', x === b));
      loadRank();
    }),
);
$('#room-create').onclick = createRoom;
$('#room-top').onclick = createRoom;
$('#join-form').onsubmit = (e) => {
  e.preventDefault();
  showRoom($('#room-code').value.trim().toUpperCase());
};
$('#privacy').onclick = () => {
  open();
  center(/* HTML */ `
    <h2>Maxfiylik.</h2>
    <p>
      Akkaunt shart emas. Taxallusingiz va ballingiz umumiy jadvalda ko‘rinadi. Natijalar serverda
      30 kun saqlanadi. Xonalar 24 soatdan keyin yopiladi.
    </p>
    <p>
      Taxallusingiz keyingi o‘yin uchun shu brauzerda saqlanadi. Reklama kuzatuvi yoki uchinchi
      tomon analitikasi ishlatilmaydi.
    </p>
    <p class="hint">
      Bu ko‘ngilochar o‘yin. Reyting professional sport yoki himoyalangan imtihon tizimi emas.
      Xonaga kirish uchun kodni bilish kifoya.
    </p>
  `);
};
loadRank();
(async () => {
  const q = new URLSearchParams(location.search);
  if (q.has('room')) return showRoom(q.get('room'));
  if (q.has('c')) {
    try {
      const r = await api('challenge/' + encodeURIComponent(q.get('c')));
      intro(r.mode, { challenge: r.id, opponent: r });
    } catch (e) {
      toast(e.message);
    }
  }
})();
