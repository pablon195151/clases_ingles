/* ============================================================
   APLICACIÓN: estado, navegación y pantallas
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const fmtTime = s => { s = Math.round(s || 0); const m = Math.floor(s / 60); return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`; };

/* ---------------- Estado guardado (localStorage) ---------------- */
const STORE_KEY = 'charla-ingles.v1';
function defaultState() {
  return {
    v: 1, name: '', character: null, levelIdx: null, test: null, goal: null,
    plan: { sessionsPerWeek: 3, minutes: 30, days: [1, 3, 5] },
    completed: {}, secondsSpoken: 0, review: [], sessions: [], chats: 0,
    settings: { cc: true, slow: false, mute: false, useAI: true, audioFirst: true }
  };
}
function loadState() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const d = JSON.parse(raw); const def = defaultState(); return { ...def, ...d, settings: { ...def.settings, ...(d.settings || {}) }, plan: { ...def.plan, ...(d.plan || {}) } }; } } catch (e) { }
  return defaultState();
}
let S = loadState();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } }
function addSpoken(sec) { if (sec > 0) { S.secondsSpoken += sec; save(); } }
function addReview(item) {
  if (!item || !item.en) return;
  const k = normalize(item.en).join(' ');
  if (S.review.some(r => normalize(r.en).join(' ') === k)) return;
  S.review.push({ en: item.en, es: item.es || '', note: item.note || '', said: item.said || '', reps: 0, added: Date.now() });
}

/* ---------------- Tutor (personaje animado) ---------------- */
const MOOD_FRAME = { idle: 'neutral', greet: 'happy', celebrate: 'happy', listen: 'listen', think: 'think', correct: 'correct' };
const Tutor = {
  root: null, char: CHARACTERS.fox, t: 0, isPhoto: false, frames: {}, cur: 'neutral', moodName: 'idle', isTalking: false, blinkT: 0,
  mount(el) { this.root = el; },
  set(id) {
    this.char = CHARACTERS[id] || CHARACTERS.fox;
    clearTimeout(this.blinkT);
    this.isPhoto = this.char.kind === 'photo' && !this.char.photoFailed;
    this.root.className = 'char-wrap char-' + this.char.id + (this.isPhoto ? ' is-photo' : '');
    if (this.isPhoto) {
      // Cuadros apilados; solo uno visible. Precarga todos para cambiar sin parpadeo.
      this.root.innerHTML = `<div class="photo-char">${PHOTO_FRAMES.map(fr => `<img class="fr fr-${fr}${fr === 'neutral' ? ' on' : ''}" src="${this.char.dir}${fr}.webp" alt="" draggable="false">`).join('')}</div>
        <svg class="photo-fx" viewBox="0 0 220 260" aria-hidden="true">${FX_SVG}</svg>`;
      this.frames = {}; $$('.fr', this.root).forEach(img => { this.frames[img.className.match(/fr-(\w+)/)[1]] = img; });
      this.frames.neutral.addEventListener('error', () => { this.char.photoFailed = true; this.set(this.char.id); }, { once: true });
      this.cur = 'neutral'; this.scheduleBlink();
    } else {
      this.root.innerHTML = this.char.svg ? this.char.svg() : `<div class="thumb-fallback big">${this.char.name.charAt(0)}</div>`;
    }
  },
  show(fr) {
    if (!this.isPhoto || fr === this.cur || !this.frames[fr]) return;
    this.frames[this.cur].classList.remove('on'); this.frames[fr].classList.add('on'); this.cur = fr;
  },
  base() { return this.isTalking ? 'neutral' : (MOOD_FRAME[this.moodName] || 'neutral'); },
  // Boca: v = apertura 0..1 (de la voz), round = vocal redonda (o/u)
  mouth(v, round) {
    if (!this.isPhoto) return;
    if (!this.isTalking) return;
    this.show(v < 0.12 ? 'neutral' : (round && v >= 0.25) ? 'round' : v < 0.45 ? 'mid' : 'open');
  },
  scheduleBlink() {
    clearTimeout(this.blinkT);
    this.blinkT = setTimeout(() => {
      if (this.isPhoto && this.cur === 'neutral') { this.show('blink'); setTimeout(() => { if (this.cur === 'blink') this.show(this.base()); }, 130); }
      this.scheduleBlink();
    }, 2800 + Math.random() * 3200);
  },
  mood(m, ms) {
    clearTimeout(this.t);
    ['greet', 'listen', 'think', 'celebrate', 'correct'].forEach(x => this.root.classList.remove('mood-' + x));
    if (m && m !== 'idle') this.root.classList.add('mood-' + m);
    this.moodName = m || 'idle';
    if (!this.isTalking) this.show(this.base());
    const auto = { greet: 2600, celebrate: 2600, correct: 2800 }[m];
    if (ms || auto) this.t = setTimeout(() => this.mood('idle'), ms || auto);
  },
  talking(on) {
    if (!this.root) return;
    this.isTalking = !!on; this.root.classList.toggle('talking', !!on);
    this.show(on ? 'neutral' : this.base());
  }
};
const setScene = id => { $('#scene').innerHTML = sceneSVG(id); };

/* ---------------- Navegación y flujos ---------------- */
const ABORT = { abort: true };
const App = {
  flow: 0, screen: null,
  go(name, arg) {
    this.flow++; Voice.stop(); Ears.abort(); this.screen = name;
    Tutor.mood('idle'); Subs.hide();
    $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === name || (name === 'lesson' && b.dataset.go === 'lessons') || (name === 'freeChat' && b.dataset.go === 'free') || (name === 'review' && b.dataset.go === 'progress') || (name === 'practiceRun' && b.dataset.go === 'practice')));
    $('#nav').hidden = S.levelIdx === null;
    window.scrollTo({ top: 0 });
    SCREENS[name](arg);
  },
  check(f) { if (f !== this.flow) throw ABORT; },
  updateStatus() {
    const el = $('#statusLine');
    if (el) el.innerHTML = `<span title="${esc(Voice.label())}">🔊 ${esc(Voice.short())}</span><span title="${esc(Ears.label())}">🎤 ${esc(Ears.short())}</span><span title="${esc(AI.label())}">🧠 ${esc(AI.short())}</span>`;
    const st = $('#settingsStatus'); if (st) st.innerHTML = statusList();
    const ch = $('#checks'); if (ch) ch.innerHTML = statusList();
  }
};
function statusList() {
  return `<ul class="status-list">
    <li><b>🔊 Voz:</b> ${esc(Voice.label())}</li>
    <li><b>🎤 Micrófono:</b> ${esc(Ears.label())}</li>
    <li><b>🧠 Conversación:</b> ${esc(AI.label())}</li>
    <li><b>🎙️ Pronunciación:</b> ${esc(typeof Pron !== 'undefined' ? Pron.label() : '')}</li></ul>`;
}
function run(fn) { Promise.resolve().then(fn).catch(e => { if (e !== ABORT) { console.error(e); toast('Algo salió mal: ' + (e.message || e)); } }); }
const en = (text, who = 'tutor', npc) => ({ text, lang: 'en', who, npc });
const es = text => ({ text, lang: 'es', who: 'tutor' });
async function say(f, lines, opts) { await Voice.speak(Array.isArray(lines) ? lines : [lines], opts); App.check(f); }
function view(html) { $('#view').innerHTML = html; }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3500); }
function waitClick(el) { return new Promise(r => { el.addEventListener('click', () => r(), { once: true }); }); }
function choose(container) {
  return new Promise(r => {
    $$('.opt', container).forEach(b => b.addEventListener('click', () => {
      $$('.opt', container).forEach(x => { x.disabled = true; });
      b.classList.add('picked'); r(+b.dataset.k);
    }));
  });
}

/* ---------------- Barra de respuesta (micrófono o teclado) ---------------- */
function askAnswer(container, opts = {}) {
  return new Promise(resolve => {
    const micOK = Ears.available() && !opts.textOnly && !S.forceText;
    container.innerHTML = `
      <div class="answer">
        ${opts.label ? `<p class="ans-label">${opts.label}</p>` : ''}
        <div class="ans-live" aria-live="polite">${micOK ? 'Toca el micrófono cuando quieras responder.' : ''}</div>
        ${micOK ? `<button class="mic" type="button"><span class="mic-ico" aria-hidden="true"></span><span class="mic-lbl">Toca y habla</span></button>` : ''}
        <form class="ans-form" ${micOK ? 'hidden' : ''}>
          <input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(opts.placeholder || 'Escribe tu respuesta en inglés…')}" aria-label="Tu respuesta">
          <button class="btn primary" type="submit">Enviar</button>
        </form>
        <div class="ans-tools">
          ${micOK ? '<button type="button" class="link" data-a="type">⌨️ Prefiero escribir</button>' : ''}
          ${opts.hint ? '<button type="button" class="link" data-a="hint">💡 Pista</button>' : ''}
          ${opts.allowHelp !== false ? '<button type="button" class="link" data-a="repeat">🐢 No entendí, repite lento</button>' : ''}
          ${opts.skip ? '<button type="button" class="link" data-a="skip">Saltar</button>' : ''}
        </div>
        <div class="ans-hint" hidden></div>
      </div>`;
    const live = $('.ans-live', container), mic = $('.mic', container), form = $('form', container), input = $('input', form);
    let finalText = '', partial = '', t0 = 0, tLast = 0, timer = 0, done = false;
    const setMic = on => { if (!mic) return; mic.classList.toggle('on', on); $('.mic-lbl', mic).textContent = on ? 'Te escucho… toca para terminar' : 'Toca y habla'; };
    const showText = () => { form.hidden = false; input.focus(); };
    const finish = r => { if (done) return; done = true; clearTimeout(timer); Ears.abort(); setMic(false); $('.answer', container).classList.add('done'); Tutor.mood('idle'); resolve(r); };
    const submitSpoken = () => {
      const text = (finalText || partial).trim();
      if (!text) { live.textContent = 'No te escuché. Toca el micrófono e intenta otra vez, o escribe tu respuesta.'; setMic(false); Tutor.mood('idle'); return; }
      const seconds = t0 ? Math.max(1, (tLast - t0) / 1000 + 0.6) : 1;
      live.innerHTML = `<span class="you">Tú:</span> ${esc(text)}`;
      finish({ text, viaMic: true, seconds });
    };
    if (mic) mic.addEventListener('click', () => {
      if (Ears.listening) { Ears.stop(); return; }
      Voice.stop(); Voice.unlock();
      finalText = ''; partial = ''; t0 = 0;
      setMic(true); Tutor.mood('listen'); live.textContent = 'Te escucho…';
      Ears.start({
        partial: t => { if (!t0) t0 = performance.now(); tLast = performance.now(); partial = t; live.innerHTML = `<span class="you">Tú:</span> ${esc((finalText + ' ' + t).trim())}…`; if (Ears.backend === 'claude') { clearTimeout(timer); timer = setTimeout(() => Ears.stop(), 2600); } },
        final: t => { if (!t0) t0 = performance.now(); tLast = performance.now(); finalText = (finalText + ' ' + t).trim(); partial = ''; live.innerHTML = `<span class="you">Tú:</span> ${esc(finalText)}`; if (Ears.backend === 'claude') { clearTimeout(timer); timer = setTimeout(() => Ears.stop(), 1300); } },
        state: (st, reason) => {
          if (st !== 'idle' || done) return;
          setMic(false);
          if (finalText || partial) submitSpoken();
          else { Tutor.mood('idle'); if (!Ears.denied) live.textContent = 'No te escuché. Toca el micrófono e intenta otra vez.'; }
        },
        error: code => {
          setMic(false); Tutor.mood('idle');
          if (Ears.denied) { live.textContent = 'No hay permiso para usar el micrófono. Responde por escrito.'; if (mic) mic.hidden = true; showText(); opts.onDenied && opts.onDenied(); }
          else if (code === 'no-speech') live.textContent = 'No te escuché. Intenta otra vez.';
          else if (code !== 'aborted') live.textContent = `El micrófono tuvo un problema (${code}). Intenta de nuevo o escribe tu respuesta.`;
        }
      });
    });
    form.addEventListener('submit', e => { e.preventDefault(); const t = input.value.trim(); if (!t) return; live.innerHTML = `<span class="you">Tú (escrito):</span> ${esc(t)}`; finish({ text: t, viaMic: false, seconds: 0 }); });
    $$('.ans-tools .link', container).forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'type') { showText(); b.hidden = true; }
      if (a === 'hint') { const h = $('.ans-hint', container); h.hidden = false; h.innerHTML = `💡 ${esc(opts.hint)}`; }
      if (a === 'repeat') finish({ cmd: 'repeat' });
      if (a === 'skip') finish({ cmd: 'skip', text: '' });
    }));
    if (!micOK) setTimeout(() => input.focus({ preventScroll: true }), 50);
  });
}

function diffHTML(cmp, label) {
  const pct = Math.round(cmp.ratio * 100);
  return `<div class="diff">
    <div class="diff-words">${cmp.words.map(w => `<span class="${w.ok ? 'ok' : 'miss'}">${esc(w.w)}</span>`).join(' ')}</div>
    <div class="meter"><span style="width:${pct}%"></span></div>
    <p class="fine">${label || 'Coincidencia con la frase'}: <b>${pct}%</b> · Se compara el texto reconocido, no la pronunciación.</p></div>`;
}

/* ============================================================
   PANTALLAS
   ============================================================ */
const SCREENS = {};

/* ---------- 1. Bienvenida y selección de personaje ---------- */
SCREENS.welcome = () => {
  setScene('studio');
  view(`<div class="card hero">
    <p class="eyebrow">Inglés conversacional para hispanohablantes</p>
    <h1>Habla inglés desde tu primera sesión</h1>
    <p class="lead">Escucha situaciones reales, entiende, habla y perfecciona con un tutor que te contesta con su propia voz.</p>
    <div class="method">${['🎧 Escuchar', '💡 Comprender', '🗣️ Hablar', '✨ Perfeccionar'].map(s => `<span>${s}</span>`).join('')}</div>
    <label class="field"><span>¿Cómo te llamas? <small>(opcional)</small></span>
      <input id="nameIn" value="${esc(S.name)}" autocomplete="given-name" placeholder="Tu nombre"></label>
    <h2>Elige a tu tutor</h2>
    <div class="char-grid">${Object.values(CHARACTERS).map(c => `
      <button class="char-card ${S.character === c.id ? 'sel' : ''}" data-c="${c.id}" aria-pressed="${S.character === c.id}">
        <div class="mini">${charThumb(c)}</div>
        <b>${c.name}</b><span class="species">${c.species} · ${c.style || ''}</span>
        <span class="tag">${c.tagline}</span>
        <span class="listen-btn">🔊 Escuchar su voz</span>
      </button>`).join('')}</div>
    <details class="checks-box"><summary>Revisar voz y micrófono</summary><div id="checks">${statusList()}</div>
      <p class="fine">Para hablar con el tutor usa Chrome o Edge (computadora o Android) y permite el micrófono. Si tu navegador no lo permite, podrás responder por escrito.</p></details>
    <div class="actions">
      <button class="btn primary big" id="startTest" ${S.character ? '' : 'disabled'}>Empezar examen inicial · 8–10 min</button>
      <button class="btn ghost" id="skipTest">Saltar examen y empezar en A1</button>
    </div>
  </div>`);
  if (!S.character) Subs.show({ text: '¡Hola! Elige a tu tutor para empezar.', lang: 'es', who: 'tutor' });
  $$('.char-card').forEach(b => b.addEventListener('click', () => {
    const c = CHARACTERS[b.dataset.c];
    S.character = c.id; save(); Tutor.set(c.id); Voice.unlock();
    $$('.char-card').forEach(x => { x.classList.toggle('sel', x === b); x.setAttribute('aria-pressed', x === b); });
    $('#startTest').disabled = false;
    Tutor.mood('greet');
    const f = App.flow;
    run(() => say(f, [es(c.hello_es), en(c.hello_en)]));
  }));
  $('#nameIn').addEventListener('change', e => { S.name = e.target.value.trim().slice(0, 30); save(); });
  $('#startTest').addEventListener('click', () => { S.name = $('#nameIn').value.trim().slice(0, 30); save(); Voice.unlock(); App.go('test'); });
  $('#skipTest').addEventListener('click', () => {
    S.name = $('#nameIn').value.trim().slice(0, 30);
    if (!S.character) { S.character = 'fox'; Tutor.set('fox'); }
    S.levelIdx = 0; S.test = { skipped: true, date: new Date().toISOString(), level: 'A1', levelIdx: 0 }; save(); App.go('goal');
  });
};

/* ---------- 2. Examen inicial adaptativo ---------- */
SCREENS.test = () => run(testFlow);

function pickItem(kind, T) {
  const bank = TEST_BANK[kind];
  const free = bank.filter(it => !T.used.has(it.id));
  free.sort((a, b) => Math.abs(a.d - T.d) - Math.abs(b.d - T.d) || b.d - a.d);
  const it = free[0]; T.used.add(it.id); return it;
}

async function testFlow() {
  const f = App.flow; setScene('studio');
  const T = { items: [], d: 2, start: Date.now(), used: new Set(), micMode: Ears.available(), intro: {} };
  S.forceText = false;
  view(`<div class="card test">
    <div class="test-head"><div><p class="eyebrow">Examen inicial</p><h1 id="tTitle">Preparación</h1></div>
      <div class="test-meta"><span id="tTimer">0:00</span><span id="tCount">0 / 10</span></div></div>
    <div class="progress"><span id="tBar" style="width:0%"></span></div>
    <div id="tBody"></div></div>`);
  const timer = setInterval(() => {
    if (App.flow !== f) return clearInterval(timer);
    const s = Math.floor((Date.now() - T.start) / 1000); const el = $('#tTimer'); if (el) el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);
  const body = html => { $('#tBody').innerHTML = html; };
  Tutor.mood('greet');
  await say(f, [es(`¡Hola${S.name ? ', ' + S.name : ''}! Antes de empezar el curso, vamos a estimar tu nivel. Son 10 actividades cortas, de 8 a 10 minutos: vas a escuchar, elegir respuestas y platicar conmigo.`)]);

  // Prueba de micrófono
  if (Ears.available()) {
    body(`<h2>Prueba tu micrófono</h2><p>Toca el micrófono y di: <b class="say">"Hello, I'm ready!"</b></p><div id="ans"></div>
      <button class="link" id="noMic">No puedo usar el micrófono ahora · responder por escrito</button>`);
    let noMic; const noMicP = new Promise(r => { noMic = r; });
    $('#noMic').addEventListener('click', () => noMic({ cmd: 'nomic' }));
    await say(f, [es('Primero probemos tu micrófono. Toca el botón y dime:'), en("Hello, I'm ready!")]);
    let r;
    for (; ;) {
      r = await Promise.race([askAnswer($('#ans'), { allowHelp: false, onDenied: () => noMic({ cmd: 'nomic' }) }), noMicP]);
      App.check(f);
      if (r.cmd === 'nomic' || Ears.denied || !r.viaMic) break;
      if (r.viaMic) break;
    }
    if (r.cmd === 'nomic' || Ears.denied || !r.viaMic) {
      T.micMode = false; S.forceText = true;
      await say(f, [es('Sin problema. Responderás por escrito y la expresión oral quedará como «sin evaluar».')]);
    } else {
      addSpoken(r.seconds); Tutor.mood('celebrate');
      await say(f, [en("Great, I can hear you! Let's start.")]);
    }
  } else {
    T.micMode = false;
    body(`<div class="notice">🎤 Tu navegador no permite reconocimiento de voz aquí. Responderás por escrito y la <b>expresión oral quedará «sin evaluar»</b>.<br><small>Para hablar con el tutor, abre la app en Chrome o Edge y permite el micrófono.</small></div>
      <button class="btn primary" id="go">Continuar</button>`);
    const goP = waitClick($('#go'));
    await Promise.race([say(f, [es('Tu navegador no me deja escucharte por micrófono, así que responderás por escrito. La parte oral quedará sin evaluar.')]), goP]);
    await goP; Voice.stop(); App.check(f);
  }

  for (let i = 0; i < TEST_SEQUENCE.length; i++) {
    const kind = TEST_SEQUENCE[i];
    $('#tCount').textContent = `${i + 1} / 10`; $('#tBar').style.width = `${(i / 10) * 100}%`;
    let res;
    if (kind === 'C') res = await testConversation(f, T, body);
    else res = await TEST_RUN[kind](f, pickItem(kind, T), T, body);
    T.items.push(res);
    if (kind !== 'C') T.d = clamp(T.d + (res.score >= 0.6 ? 1 : -1), 1, 5);
  }
  $('#tBar').style.width = '100%';
  S.test = computeResult(T); S.levelIdx = S.test.levelIdx; save();
  App.go('results');
}

const TEST_RUN = {
  async L(f, item, T, body) {
    $('#tTitle').textContent = 'Comprensión auditiva';
    const options = shuffle(item.options.map((t, k) => ({ t, ok: k === item.answer })));
    body(`<p class="skill-chip">🎧 Escucha y elige</p>
      <div class="audio-box"><div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <p class="muted">El texto está oculto: concéntrate en escuchar.</p>
      <button class="btn soft" id="replay" disabled>🔁 Escuchar otra vez <small id="rc">(2)</small></button></div>
      <div id="q" hidden><h3>${esc(item.q)}</h3><div class="opts">${options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o.t)}</button>`).join('')}</div></div>`);
    const lines = item.lines.map(l => ({ text: l.en, lang: 'en', who: l.who, npc: { name: 'Audio', icon: '🎧' } }));
    if (!T.intro.L) { T.intro.L = 1; await say(f, [es('Escucha con atención y elige la respuesta correcta.')]); }
    await say(f, lines, { audioOnly: true });
    $('#q').hidden = false;
    let replays = 2; const rb = $('#replay'); rb.disabled = false;
    rb.addEventListener('click', () => { if (replays <= 0) return; replays--; $('#rc').textContent = `(${replays})`; if (!replays) rb.disabled = true; Voice.speak(lines, { audioOnly: true }); });
    const k = await choose($('#q .opts')); App.check(f); Voice.stop();
    Tutor.mood('think', 900); await sleep(450); App.check(f);
    return { kind: 'L', skill: 'L', d: item.d, score: options[k].ok ? 1 : 0, prompt: item.q };
  },
  async V(f, item, T, body) {
    $('#tTitle').textContent = 'Vocabulario en contexto';
    const options = shuffle(item.options.map((t, k) => ({ t, ok: k === item.answer })));
    body(`<p class="skill-chip">📚 Completa la frase</p>
      <p class="sentence">${esc(item.sentence).replace('___', '<span class="blank">_____</span>')}</p>
      <div class="opts">${options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o.t)}</button>`).join('')}</div>`);
    if (!T.intro.V) { T.intro.V = 1; await say(f, [es('Elige la palabra que completa mejor la frase.')]); }
    run(() => say(f, [en(item.sentence.replace('___', '… blank …'))]));
    const k = await choose($('.opts', $('#tBody'))); App.check(f); Voice.stop();
    Tutor.mood('think', 800); await sleep(400); App.check(f);
    return { kind: 'V', skill: 'V', d: item.d, score: options[k].ok ? 1 : 0, prompt: item.sentence };
  },
  async R(f, item, T, body) {
    $('#tTitle').textContent = T.micMode ? 'Expresión oral' : 'Dictado';
    body(`<p class="skill-chip">${T.micMode ? '🗣️ Escucha y repite' : '✍️ Escucha y escribe'}</p>
      <div class="audio-box"><div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <p class="muted">${T.micMode ? 'Repite la frase tal como la escuches.' : 'Escribe exactamente lo que escuches.'}</p></div>
      <div id="ans"></div>`);
    await say(f, [es(T.micMode ? 'Ahora repite después de mí.' : 'Escribe exactamente lo que escuches.'), en(item.en)], { audioOnly: true });
    let r;
    for (; ;) {
      r = await askAnswer($('#ans'), { placeholder: 'Escribe lo que escuchaste…' }); App.check(f);
      if (r.cmd === 'repeat') { await say(f, [en(item.en)], { slow: true, audioOnly: true }); continue; }
      break;
    }
    const cmp = compareText(item.en, r.text);
    if (r.viaMic) addSpoken(r.seconds);
    Tutor.mood('think', 800); await sleep(400); App.check(f);
    return { kind: 'R', skill: r.viaMic ? 'S' : 'L', d: item.d, score: cmp.ratio >= 0.85 ? 1 : cmp.ratio, viaMic: r.viaMic, prompt: item.en, answer: r.text };
  },
  async S(f, item, T, body) {
    $('#tTitle').textContent = T.micMode ? 'Respuesta oral' : 'Respuesta escrita';
    body(`<p class="skill-chip">💬 Responde la pregunta</p>
      <div class="audio-box"><div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <button class="link" id="showQ">📄 Ver la pregunta escrita</button><p class="q-text" id="qText" hidden>${esc(item.en)}</p></div>
      <div id="ans"></div>`);
    $('#showQ').addEventListener('click', () => { $('#qText').hidden = false; $('#showQ').hidden = true; });
    if (!T.intro.S) { T.intro.S = 1; await say(f, [es('Contesta con tus propias palabras. Intenta decir al menos una frase completa.')]); }
    await say(f, [en(item.en)], { audioOnly: true });
    let r;
    for (; ;) {
      r = await askAnswer($('#ans'), {}); App.check(f);
      if (r.cmd === 'repeat') { $('#qText').hidden = false; await say(f, [en(item.en)], { slow: true }); continue; }
      break;
    }
    if (r.viaMic) addSpoken(r.seconds);
    const sc = scoreOpen(r.text, item);
    let tags = sc.corrections ? sc.corrections.tags : [];
    if (AI.active()) {
      Tutor.mood('think');
      const j = await AI.json(promptScore({ question: item.en, answer: r.text, level: LEVELS[T.d - 1] })); App.check(f);
      if (j && typeof j.score === 'number') { sc.score = 0.5 * sc.score + 0.5 * clamp(j.score, 0, 1); if (j.tag_es) tags = tags.concat([j.tag_es]); }
    }
    Tutor.mood('idle');
    await say(f, [en(pick(['Thank you!', 'Okay, thanks!', 'Got it, thank you!']))]);
    return { kind: 'S', skill: r.viaMic ? 'S' : 'W', d: item.d, score: sc.score, viaMic: r.viaMic, prompt: item.en, answer: r.text, tags };
  }
};

async function testConversation(f, T, body) {
  $('#tTitle').textContent = 'Conversación breve';
  body(`<p class="skill-chip">💬 Plática con ${esc(Tutor.char.name)}</p><div class="chat" id="chat"></div><div id="ans"></div>`);
  await say(f, [es('Última actividad: una plática corta conmigo. Respóndeme con naturalidad.')]);
  const levelIdx = T.d - 1;
  const dlg = new FreeDialog('intro', { levelIdx, userName: S.name }, 99);
  let q = dlg.opening();
  const history = [], scores = [], tags = [];
  let mic = 0, turns = 0;
  while (turns < 3) {
    addChat('tutor', q); history.push({ role: 'tutor', text: q });
    await say(f, [en(q)]);
    let r;
    for (; ;) { r = await askAnswer($('#ans'), {}); App.check(f); if (r.cmd === 'repeat') { await say(f, [en(q)], { slow: true }); continue; } break; }
    addChat('user', r.text); history.push({ role: 'user', text: r.text });
    if (r.viaMic) { mic++; addSpoken(r.seconds); }
    const sc = scoreOpen(r.text, { minWords: [4, 6, 9, 12, 15][levelIdx] });
    scores.push(sc.score); if (sc.corrections) tags.push(...sc.corrections.tags);
    turns++;
    if (turns >= 3) break;
    const local = dlg.respond(r.text);
    q = local.reply;
    if (AI.active() && !local.help) {
      Tutor.mood('think');
      const j = await AI.json(promptConversation({ tutorName: Tutor.char.name, level: LEVELS[levelIdx], scenario: 'A short, friendly getting-to-know-you chat in a placement test. Ask about the student\'s life, free time and reasons to learn English.', role: 'a friendly English tutor', history, said: r.text, turn: turns + 1, maxTurns: 3 }));
      App.check(f); Tutor.mood('idle');
      if (j && j.reply) q = j.reply;
    }
  }
  const bye = "Thanks for chatting with me! That's the end of the test.";
  addChat('tutor', bye); Tutor.mood('celebrate');
  await say(f, [en(bye)]);
  const score = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { kind: 'C', skill: 'C', d: T.d, score, viaMic: mic > 0, written: mic === 0, tags };
}

function computeResult(T) {
  const items = T.items;
  const est = items.reduce((a, it) => a + (it.d - 0.5 + it.score), 0) / items.length;
  const levelIdx = clamp(Math.round(est) - 1, 0, 4);
  const groups = {};
  items.forEach(it => { (groups[it.skill] = groups[it.skill] || []).push(it); });
  const skills = {};
  Object.entries(groups).forEach(([k, arr]) => {
    const avg = arr.reduce((a, it) => a + it.score, 0) / arr.length;
    const lv = arr.reduce((a, it) => a + (it.d - 0.5 + it.score), 0) / arr.length;
    skills[k] = { pct: Math.round(avg * 100), level: LEVELS[clamp(Math.round(lv) - 1, 0, 4)], n: arr.length };
  });
  const speakingEvaluated = !!skills.S;
  const convWritten = items.find(i => i.kind === 'C')?.written;
  const STRONG = { L: 'Entiendes bien el inglés hablado en situaciones reales.', V: 'Reconoces el vocabulario correcto según el contexto.', S: 'Te animas a responder en voz alta con frases completas.', C: 'Sostienes una plática respondiendo a lo que te preguntan.', W: 'Te expresas con claridad por escrito.' };
  const WEAK = { L: 'Comprensión auditiva: escucha audios cortos varias veces antes de leer el texto.', V: 'Vocabulario: aprende frases completas, no palabras sueltas.', S: 'Expresión oral: responde con frases más completas (sujeto + verbo + un detalle).', C: 'Conversación: después de responder, agrega un detalle o una razón ("because…").', W: 'Respuestas escritas: cuida el orden sujeto-verbo y los tiempos verbales.' };
  const sorted = Object.entries(skills).sort((a, b) => b[1].pct - a[1].pct);
  let strengths = sorted.filter(([, v]) => v.pct >= 70).map(([k]) => STRONG[k]);
  if (!strengths.length && sorted.length) strengths = [`Tu mejor resultado fue en ${SKILL_LABELS[sorted[0][0]].toLowerCase()} (${sorted[0][1].pct}%). ¡Ahí hay una buena base!`];
  const improvements = sorted.filter(([, v]) => v.pct < 60).reverse().map(([k]) => WEAK[k]);
  const tags = [...new Set(items.flatMap(i => i.tags || []))].slice(0, 3);
  tags.forEach(t => improvements.push(`Practicar: ${t}.`));
  if (!improvements.length) improvements.push('Ganar fluidez: responde más rápido y con más detalle en conversaciones largas.');
  if (!speakingEvaluated) improvements.push('Expresión oral: sin evaluar. Cuando puedas, usa el micrófono para medirla.');
  return {
    date: new Date().toISOString(), levelIdx, level: LEVELS[levelIdx], est: Math.round(est * 100) / 100,
    skills, speakingEvaluated, convWritten, strengths, improvements,
    recommended: recommendLesson(levelIdx, S.goal).id, minutes: Math.max(1, Math.round((Date.now() - T.start) / 60000))
  };
}

function lessonRank(l, levelIdx, goal) {
  return Math.abs(l.level - (levelIdx + 1)) + (goal && !l.goals.includes(goal) ? 2.5 : 0) + (S.completed[l.id] ? 6 : 0) + l.level * 0.01;
}
function recommendLesson(levelIdx = 0, goal = null) {
  return LESSONS.slice().sort((a, b) => lessonRank(a, levelIdx, goal) - lessonRank(b, levelIdx, goal))[0];
}

/* ---------- 3. Resultados ---------- */
function skillBars(R) {
  const order = ['L', 'V', 'S', 'C', 'W'];
  return order.map(k => {
    if (k === 'S' && !R.skills.S) return `<div class="skill"><div class="skill-top"><span>${SKILL_LABELS.S}</span><b class="na">Sin evaluar</b></div><div class="meter na"><span style="width:0"></span></div></div>`;
    const s = R.skills[k]; if (!s) return '';
    const label = k === 'C' && R.convWritten ? SKILL_LABELS.C + ' (escrita)' : SKILL_LABELS[k];
    return `<div class="skill"><div class="skill-top"><span>${label}</span><b>${s.pct}% · ≈${s.level}</b></div><div class="meter"><span style="width:${s.pct}%"></span></div></div>`;
  }).join('');
}

SCREENS.results = () => {
  const R = S.test; const f = App.flow; setScene('studio');
  if (!R || R.skipped) return App.go('goal');
  const rec = LESSONS.find(l => l.id === R.recommended) || LESSONS[0];
  view(`<div class="card results">
    <p class="eyebrow">Resultado del examen inicial · ${R.minutes} min</p>
    <div class="level-badge"><span class="lv">${R.level}</span><div><b>Nivel estimado (MCER)</b><p>${LEVEL_DESC_ES[R.level]}</p></div></div>
    <p class="notice soft">⚠️ Es una <b>estimación inicial</b> basada en 10 actividades. No es una certificación oficial.</p>
    <h2>Desempeño por habilidad</h2><div class="skills">${skillBars(R)}</div>
    <div class="two-col">
      <div><h3>💪 Fortalezas</h3><ul>${R.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
      <div><h3>🎯 Aspectos por mejorar</h3><ul>${R.improvements.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
    </div>
    <div class="rec-card"><span class="rec-ico">${GOALS[rec.goals[0]].icon}</span><div><p class="eyebrow">Primera lección recomendada</p><b>${esc(rec.title)}</b><p class="muted">${esc(rec.title_en)} · ${LEVELS[rec.level - 1]}</p></div></div>
    ${R.speakingEvaluated ? '<p class="fine">La expresión oral se estimó con el texto que reconoció el micrófono (contenido y gramática). La app no evaluó tu pronunciación.</p>' : ''}
    <div class="actions"><button class="btn primary big" id="toGoal">Personalizar mi curso</button><button class="btn ghost" id="retest">Repetir examen</button></div>
  </div>`);
  $('#toGoal').addEventListener('click', () => App.go('goal'));
  $('#retest').addEventListener('click', () => App.go('test'));
  Tutor.mood('celebrate');
  run(() => say(f, [es(`¡Terminamos! Tu nivel estimado es ${R.level}. Recuerda: es una estimación inicial, no una certificación.`), en("Great job today! Now let's build your plan.")]));
};

/* ---------- 4. Curso personalizado: objetivo y plan ---------- */
SCREENS.goal = () => {
  const f = App.flow; setScene('studio');
  const DAYS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']];
  let goal = S.goal, days = S.plan.days.slice();
  view(`<div class="card">
    <p class="eyebrow">Curso personalizado</p><h1>¿Para qué quieres aprender inglés?</h1>
    <div class="goal-grid">${Object.entries(GOALS).map(([k, g]) => `<button class="goal-card ${goal === k ? 'sel' : ''}" data-g="${k}"><span class="g-ico">${g.icon}</span><b>${g.label}</b><span class="muted">${g.desc}</span></button>`).join('')}</div>
    <h2>Tu plan de estudio</h2>
    <label class="plan-opt sel"><input type="radio" name="plan" checked> <div><b>3 sesiones por semana · 30 minutos</b>
      <span class="muted">Cada sesión: lección guiada (~20 min) + repaso de frases (~5 min) + conversación libre (~5 min).</span></div></label>
    <p class="field-label">Elige tus 3 días</p>
    <div class="days">${DAYS.map(([d, n]) => `<button class="day ${days.includes(d) ? 'sel' : ''}" data-d="${d}" aria-pressed="${days.includes(d)}">${n}</button>`).join('')}</div>
    <p class="fine" id="dayHint"></p>
    <div class="actions"><button class="btn primary big" id="savePlan">Guardar mi plan</button></div></div>`);
  const refresh = () => {
    $$('.day').forEach(b => { const on = days.includes(+b.dataset.d); b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); });
    $('#dayHint').textContent = days.length === 3 ? '' : `Selecciona exactamente 3 días (llevas ${days.length}).`;
    $('#savePlan').disabled = !(goal && days.length === 3);
  };
  const REACT = { viajes: "Traveling! Great. Let's get you ready for airports, hotels and new places.", trabajo: "Work! Perfect. We'll practice meetings, introductions and ideas.", cotidiana: "Everyday life! Nice. Cafés, shops and small talk, here we go.", entretenimiento: "Entertainment! Fun. We'll talk about series, music and recommendations." };
  $$('.goal-card').forEach(b => b.addEventListener('click', () => {
    goal = b.dataset.g; $$('.goal-card').forEach(x => x.classList.toggle('sel', x === b)); refresh();
    Tutor.mood('celebrate'); run(() => say(f, [en(REACT[goal])]));
  }));
  $$('.day').forEach(b => b.addEventListener('click', () => {
    const d = +b.dataset.d;
    if (days.includes(d)) days = days.filter(x => x !== d); else if (days.length < 3) days.push(d); else { days.shift(); days.push(d); }
    refresh();
  }));
  $('#savePlan').addEventListener('click', () => { S.goal = goal; S.plan.days = days.sort(); save(); App.go('plan'); });
  refresh();
  Tutor.mood('greet');
  run(() => say(f, [es('Ahora dime para qué quieres aprender inglés y elige tus tres días de práctica.'), en('What do you want to use English for?')]));
};

/* ---------- 5. Plan de estudio (inicio) ---------- */
function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.getTime(); }
const sessionsThisWeek = () => S.sessions.filter(s => s.date >= weekStart()).length;

SCREENS.plan = () => {
  if (S.levelIdx === null) return App.go('welcome');
  if (!S.goal) return App.go('goal');
  const f = App.flow; setScene('studio');
  const rec = recommendLesson(S.levelIdx, S.goal);
  const done = sessionsThisWeek();
  const DN = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const route = LESSONS.slice().sort((a, b) => (lessonRank(a, S.levelIdx, S.goal) - (S.completed[a.id] ? 6 : 0)) - (lessonRank(b, S.levelIdx, S.goal) - (S.completed[b.id] ? 6 : 0)));
  view(`<div class="card">
    <p class="eyebrow">${GOALS[S.goal].icon} ${GOALS[S.goal].label} · Nivel ${LEVELS[S.levelIdx]}${S.test && !S.test.skipped ? ' (estimado)' : ''}</p>
    <h1>Hola${S.name ? ', ' + esc(S.name) : ''} 👋</h1>
    <div class="week">
      <div><b>Esta semana</b><span class="muted">${done} de ${S.plan.sessionsPerWeek} sesiones · ${S.plan.days.map(d => DN[d]).join(', ')}</span></div>
      <div class="dots">${[0, 1, 2].map(i => `<span class="${i < done ? 'on' : ''}"></span>`).join('')}</div>
    </div>
    <div class="next-session">
      <p class="eyebrow">Siguiente sesión · 30 min</p>
      <ol class="session-steps">
        <li><span>🎬</span><div><b>${esc(rec.title)}</b><small>Lección guiada · ~20 min</small></div></li>
        <li><span>🔁</span><div><b>Repaso de frases difíciles</b><small>${S.review.length ? S.review.length + ' frases guardadas' : 'Se llena con tus lecciones'} · ~5 min</small></div></li>
        <li><span>💬</span><div><b>Conversación libre</b><small>Plática sobre un tema que elijas · ~5 min</small></div></li>
      </ol>
      <button class="btn primary big" id="startSession">Empezar sesión</button>
    </div>
    <h2>Tu ruta</h2>
    <div class="lesson-list">${route.map(l => lessonRow(l, l.id === rec.id)).join('')}</div>
    <button class="practice-cta" id="toPractice"><span>🎙️</span><div><b>Práctica de pronunciación</b><small>Pura práctica oral: el tutor corrige cada palabra y cada sonido</small></div><span>→</span></button>
    <button class="link" id="editPlan">Cambiar objetivo o días</button>
  </div>`);
  $('#startSession').addEventListener('click', () => App.go('lesson', { id: rec.id, session: true }));
  bindLessonRows();
  $('#editPlan').addEventListener('click', () => App.go('goal'));
  $('#toPractice').addEventListener('click', () => App.go('practice'));
  Tutor.mood('greet');
  run(() => say(f, [en(`Welcome${S.name ? ', ' + S.name : ''}! Ready for today's session?`)]));
};
function lessonRow(l, recommended) {
  const c = S.completed[l.id];
  return `<div class="lesson-row ${c ? 'done' : ''}">
    <span class="l-ico">${c ? '✅' : GOALS[l.goals[0]].icon}</span>
    <div class="l-info"><b>${esc(l.title)}</b><span class="muted">${esc(l.title_en)} · ${LEVELS[l.level - 1]} · ${l.goals.map(g => GOALS[g].label).join(', ')}</span>
    ${recommended ? '<span class="pill">Recomendada</span>' : ''}</div>
    <button class="btn soft sm" data-lesson="${l.id}">${c ? 'Repetir' : 'Empezar'}</button></div>`;
}
function bindLessonRows() { $$('[data-lesson]').forEach(b => b.addEventListener('click', () => App.go('lesson', { id: b.dataset.lesson }))); }

SCREENS.lessons = () => {
  setScene('studio');
  view(`<div class="card"><p class="eyebrow">Lecciones de ejemplo</p><h1>Lecciones</h1>
    <p class="muted">Cada lección sigue el método: escuchar → comprender → hablar → perfeccionar.</p>
    <div class="lesson-list">${LESSONS.map(l => lessonRow(l, false)).join('')}</div></div>`);
  bindLessonRows();
};

/* ---------- 6. Lección (6 pasos) ---------- */
SCREENS.lesson = arg => run(() => lessonFlow(arg.id, arg));

function addChat(role, text, extra = '') {
  const chat = $('#chat'); if (!chat) return;
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  if (role === 'tutor') {
    const blur = S.settings.audioFirst;
    d.innerHTML = `<span class="who">${esc(Tutor.char.name)}</span><p class="${blur ? 'blur' : ''}" title="${blur ? 'Toca para ver el texto' : ''}">${esc(text)}</p>${extra}`;
    const p = $('p', d); if (blur) p.addEventListener('click', () => p.classList.remove('blur'));
  } else if (role === 'user') d.innerHTML = `<span class="who">Tú</span><p>${esc(text)}</p>`;
  else d.innerHTML = text;
  chat.appendChild(d); d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  return d;
}

async function lessonFlow(id, opts = {}) {
  const L = LESSONS.find(l => l.id === id) || LESSONS[0];
  const f = App.flow; setScene(L.scene);
  const levelIdx = S.levelIdx ?? 0;
  const vars = { tutor: Tutor.char.name };
  const npc = { name: L.npc.name, icon: L.npc.icon };
  const st = { comp: [], phrase: [], corrections: [], said: [] };
  const STEPS = ['Escucha', 'Comprende', 'Frases', 'Conversa', 'Corrige', 'Repasa'];
  view(`<div class="card lesson">
    <p class="eyebrow">${GOALS[L.goals[0]].icon} Lección · ${LEVELS[L.level - 1]}</p>
    <h1>${esc(L.title)}</h1><p class="muted">${esc(L.title_en)}</p>
    <ol class="stepper">${STEPS.map((s, i) => `<li data-s="${i}"><span>${i + 1}</span>${s}</li>`).join('')}</ol>
    <div id="lb"></div></div>`);
  const step = i => $$('.stepper li').forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('past', k < i); });
  const body = html => { $('#lb').innerHTML = html; };
  const sitLines = L.situation.map(l => ({ text: fill(l.en, vars), lang: 'en', who: l.who, npc }));

  /* Paso 1 · Escucha la situación (solo audio) */
  step(0);
  body(`<h2>1 · Escucha la situación</h2><p>${esc(L.intro_es)}</p>
    <div class="audio-box"><div class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="row-btns"><button class="btn soft" id="rep" disabled>🔁 Otra vez</button><button class="btn soft" id="slw" disabled>🐢 Más lento</button><button class="btn soft" id="tx" disabled>📄 Ver texto</button></div></div>
    <div class="transcript" id="trans" hidden>${L.situation.map(l => `<p><b>${l.who === 'npc' ? esc(L.npc.name) : esc(Tutor.char.name)}:</b> ${esc(fill(l.en, vars))}<span class="es">${esc(fill(l.es, vars))}</span></p>`).join('')}</div>
    <div class="actions"><button class="btn primary" id="next" disabled>Continuar</button></div>`);
  Tutor.mood('greet');
  await say(f, [es(L.intro_es)]);
  await say(f, sitLines, { audioOnly: true });
  ['rep', 'slw', 'tx', 'next'].forEach(k => { $('#' + k).disabled = false; });
  $('#rep').addEventListener('click', () => Voice.speak(sitLines, { audioOnly: $('#trans').hidden }));
  $('#slw').addEventListener('click', () => Voice.speak(sitLines, { slow: true, audioOnly: $('#trans').hidden }));
  $('#tx').addEventListener('click', () => { $('#trans').hidden = !$('#trans').hidden; });
  await waitClick($('#next')); App.check(f); Voice.stop();

  /* Paso 2 · Demuestra qué comprendiste */
  step(1);
  for (let qi = 0; qi < L.comprehension.length; qi++) {
    const q = L.comprehension[qi];
    if (!q.spoken) {
      const options = shuffle(q.options.map((t, k) => ({ t, ok: k === q.answer })));
      body(`<h2>2 · ¿Qué entendiste?</h2><p class="muted">Pregunta ${qi + 1} de ${L.comprehension.length}</p>
        <h3 class="q-en">${esc(q.q_en)}</h3><p class="q-es">${esc(q.q_es)}</p>
        <div class="opts">${options.map((o, k) => `<button class="opt" data-k="${k}">${esc(o.t)}</button>`).join('')}</div><div id="fb"></div>`);
      if (qi === 0) await say(f, [es('Ahora demuéstrame qué entendiste.')]);
      run(() => say(f, [en(q.q_en)]));
      const k = await choose($('#lb .opts')); App.check(f); Voice.stop();
      const ok = options[k].ok;
      $$('#lb .opt').forEach((b, i) => { if (options[i].ok) b.classList.add('right'); else if (i === k) b.classList.add('wrong'); });
      st.comp.push(ok ? 1 : 0);
      if (ok) { Tutor.mood('celebrate'); await say(f, [en(pick(["That's right!", 'Exactly!', 'Correct, well done!']))]); }
      else { Tutor.mood('correct'); $('#fb').innerHTML = `<p class="hint-box">Escucha otra vez la parte clave: <i>${esc(sitLines[q.line].text)}</i></p>`; await say(f, [es('Casi. Escucha otra vez esta parte.'), sitLines[q.line]]); }
    } else {
      body(`<h2>2 · ¿Qué entendiste?</h2><p class="muted">Pregunta ${qi + 1} de ${L.comprehension.length} · respuesta oral</p>
        <h3 class="q-en">${esc(q.q_en)}</h3><p class="q-es">${esc(q.q_es)}</p><div id="ans"></div><div id="fb"></div>`);
      await say(f, [en(q.q_en)]);
      let tries = 0, ok = false;
      while (tries < 2 && !ok) {
        const r = await askAnswer($('#ans'), { hint: `Una respuesta posible: "${q.model}"` }); App.check(f);
        if (r.cmd === 'repeat') { await say(f, [sitLines[q.line], en(q.q_en)], { slow: true }); continue; }
        tries++; if (r.viaMic) addSpoken(r.seconds);
        ok = q.expect.test(r.text);
        if (ok) { Tutor.mood('celebrate'); $('#fb').innerHTML = `<p class="good-box">✅ ¡Bien! Respuesta modelo: <b>${esc(q.model)}</b></p>`; await say(f, [en('Yes! ' + q.model)]); }
        else {
          Tutor.mood('correct');
          $('#fb').innerHTML = `<p class="hint-box">Escucha la parte clave: <i>${esc(sitLines[q.line].text)}</i><br>Una respuesta posible: <b>${esc(q.model)}</b></p>`;
          await say(f, tries < 2 ? [es('Casi. Escucha esta parte y vuelve a intentarlo.'), sitLines[q.line]] : [es('Una respuesta posible es:'), en(q.model)]);
          if (tries >= 2) addReview({ en: q.model, es: q.q_es, note: 'Comprensión' });
        }
      }
      st.comp.push(ok ? 1 : 0);
      $('#fb').insertAdjacentHTML('beforeend', '<div class="actions"><button class="btn primary" id="next">Continuar</button></div>');
      await waitClick($('#next')); App.check(f);
    }
    if (!q.spoken) { await sleep(700); App.check(f); }
  }

  /* Paso 3 · Frases útiles: escucha y repite */
  step(2);
  for (let pi = 0; pi < L.phrases.length; pi++) {
    const p = L.phrases[pi];
    body(`<h2>3 · Frases útiles</h2><p class="muted">Frase ${pi + 1} de ${L.phrases.length} · escucha y repite</p>
      <div class="phrase"><p class="p-en">${esc(p.en)}</p><p class="p-es">${esc(p.es)}</p><p class="p-tip">💡 ${esc(p.tip)}</p>
        <div class="row-btns"><button class="btn soft sm" id="pl">🔊 Escuchar</button><button class="btn soft sm" id="ps">🐢 Lento</button></div></div>
      <div id="ans"></div><div id="fb"></div>`);
    $('#pl').addEventListener('click', () => Voice.speak([en(p.en)]));
    $('#ps').addEventListener('click', () => Voice.speak([en(p.en)], { slow: true }));
    if (pi === 0) await say(f, [es('Te enseño frases útiles. Escucha cada una y repítela en voz alta.')]);
    await say(f, [en(p.en)]);
    let best = 0, tries = 0, lastSaid = '';
    for (; ;) {
      if (Pron.available()) {
        // Con Azure: evaluación real de pronunciación del audio
        const pr = await pronounceAttempt($('#ans'), p.en, { label: 'Repite la frase:' }); App.check(f);
        tries++; lastSaid = pr.text || ''; best = Math.max(best, (pr.score || 0) / 100);
        const goodP = (pr.score || 0) >= 80;
        $('#fb').innerHTML = pronResultHTML(pr, p.en) + `<div class="actions">${goodP ? '' : '<button class="btn soft" id="again">🔁 Intentar otra vez</button>'}<button class="btn primary" id="next">${pi < L.phrases.length - 1 ? 'Siguiente frase' : 'Continuar'}</button></div>`;
        bindPronResult($('#fb'), pr, p.en);
        const w = pr.res && Pron.worst(pr.res);
        if (goodP && !w) { Tutor.mood('celebrate'); run(() => say(f, [en(pick(['Great!', 'Nice job!', 'Perfect!']))])); }
        else { Tutor.mood('correct'); const t = w ? phTip(w.p) : null; run(() => say(f, [es(t ? `Cuida el sonido ${t[0]} en «${w.word}». ${t[1]}` : 'Casi. Escúchala otra vez.'), en(p.en)], { slow: true })); }
        const actP = await new Promise(res => { $('#next').addEventListener('click', () => res('next')); $('#again')?.addEventListener('click', () => res('again')); });
        App.check(f); Voice.stop();
        if (actP === 'next') break; else continue;
      }
      const r = await askAnswer($('#ans'), { label: 'Repite la frase:' }); App.check(f);
      if (r.cmd === 'repeat') { await say(f, [en(p.en)], { slow: true }); continue; }
      tries++; if (r.viaMic) addSpoken(r.seconds);
      const cmp = compareText(p.en, r.text); lastSaid = r.text;
      best = Math.max(best, cmp.ratio);
      const good = cmp.ratio >= 0.85;
      $('#fb').innerHTML = `${diffHTML(cmp, r.viaMic ? 'Coincidencia del texto reconocido' : 'Coincidencia del texto escrito')}
        <div class="actions">${good ? '' : '<button class="btn soft" id="again">🔁 Intentar otra vez</button>'}<button class="btn primary" id="next">${pi < L.phrases.length - 1 ? 'Siguiente frase' : 'Continuar'}</button></div>`;
      if (good) { Tutor.mood('celebrate'); run(() => say(f, [en(pick(['Great!', 'Nice job!', 'Perfect!', 'Well done!']))])); }
      else { Tutor.mood('correct'); run(() => say(f, [es(cmp.missing.length ? 'Casi. Te faltaron algunas palabras. Escúchala otra vez.' : 'Casi. Escúchala otra vez.'), en(p.en)], { slow: true })); }
      const act = await new Promise(res => { $('#next').addEventListener('click', () => res('next')); $('#again')?.addEventListener('click', () => res('again')); });
      App.check(f); Voice.stop();
      if (act === 'next') break;
    }
    st.phrase.push({ p, best, said: lastSaid, tries });
    if (best < 0.85) addReview({ en: p.en, es: p.es, note: p.tip, said: lastSaid });
  }

  /* Paso 4 · Conversación */
  step(3);
  body(`<h2>4 · Conversación</h2><p>${esc(L.conversation.role_es)}</p><div class="chat" id="chat"></div><div id="ans"></div>`);
  await say(f, [es(L.conversation.role_es)]);
  const dlg = new LessonDialog(L, { levelIdx, tutorName: Tutor.char.name, userName: S.name });
  const history = [];
  let tutorText = dlg.opening(), end = false, turn = 0;
  while (turn < 14) {
    addChat('tutor', tutorText); history.push({ role: 'tutor', text: tutorText });
    await say(f, [en(tutorText)]);
    if (end) break;
    const r = await askAnswer($('#ans'), { hint: dlg.current?.hint }); App.check(f);
    if (r.cmd === 'repeat') {
      addChat('note', `<p class="hint-box">💡 ${esc(dlg.current?.hint || 'Responde con una frase corta.')}</p>`);
      await say(f, [en(dlg.question(true))], { slow: true });
      continue;
    }
    turn++;
    addChat('user', r.text); history.push({ role: 'user', text: r.text }); st.said.push(r.text);
    if (r.viaMic) addSpoken(r.seconds);
    const local = dlg.respond(r.text);
    let reply = local.reply, corr = local.correction; end = !!local.end;
    if (AI.active() && !local.help) {
      Tutor.mood('think');
      const goals = dlg.turns.slice(dlg.i).map(t => t.ask);
      const j = await AI.json(promptConversation({ tutorName: Tutor.char.name, level: LEVELS[levelIdx], scenario: L.conversation.scenario, role: L.conversation.role_en, goals: goals.length ? goals : ['Close the conversation kindly'], history, said: r.text, turn, maxTurns: dlg.turns.length + 1 }));
      App.check(f); Tutor.mood('idle');
      if (j && j.reply && (!end || j.end)) reply = j.reply;
      if (!corr && j && j.correction && j.correction.natural && normalize(j.correction.natural).join(' ') !== normalize(r.text).join(' '))
        corr = { said: r.text, natural: j.correction.natural, tip_es: j.correction.tip_es || '', tags: ['Sugerencia de la IA'] };
    }
    if (local.help && local.hint_es) { addChat('note', `<p class="hint-box">💡 ${esc(local.hint_es)}</p>`); await say(f, [es(local.hint_es)]); }
    if (corr) { st.corrections.push(corr); addChat('note', `<p class="note-chip">✏️ Anoté una sugerencia para el paso 5</p>`); }
    tutorText = reply;
  }
  Tutor.mood('celebrate');
  $('#ans').innerHTML = `<div class="actions"><button class="btn primary" id="next">Continuar a la corrección</button></div>`;
  await waitClick($('#next')); App.check(f);

  /* Paso 5 · Corrección concreta y nuevo intento */
  step(4);
  let main = st.corrections[0];
  if (!main) {
    const weak = st.phrase.filter(x => x.best < 0.85 && x.said).sort((a, b) => a.best - b.best)[0];
    if (weak) main = { said: weak.said, natural: weak.p.en, tip_es: weak.p.tip, tags: [] };
  }
  if (main) {
    body(`<h2>5 · Corrección</h2>
      <div class="corr">
        <div class="corr-row said"><span>Lo que dijiste</span><p>${esc(main.said)}</p></div>
        <div class="corr-row natural"><span>Una forma más natural</span><p>${esc(main.natural)}</p></div>
        ${main.tip_es ? `<p class="corr-tip">💡 ${esc(main.tip_es)}</p>` : ''}
        <div class="corr-row retry"><span>Inténtalo de nuevo</span><div id="ans"></div></div>
      </div><div id="fb"></div>
      ${st.corrections.length > 1 ? `<details class="more"><summary>Otras ${st.corrections.length - 1} sugerencias (también se guardan para repasar)</summary>${st.corrections.slice(1).map(c => `<p><s>${esc(c.said)}</s> → <b>${esc(c.natural)}</b><br><small>${esc(c.tip_es)}</small></p>`).join('')}</details>` : ''}`);
    Tutor.mood('correct');
    await say(f, [es('Mira esta sugerencia. Una forma más natural de decirlo es:'), en(main.natural), ...(main.tip_es ? [es(main.tip_es)] : []), es('Inténtalo de nuevo.')]);
    for (; ;) {
      const r = await askAnswer($('#ans'), { label: 'Di la forma más natural:' }); App.check(f);
      if (r.cmd === 'repeat') { await say(f, [en(main.natural)], { slow: true }); continue; }
      if (r.viaMic) addSpoken(r.seconds);
      const cmp = compareText(main.natural, r.text);
      const good = cmp.ratio >= 0.85;
      $('#fb').innerHTML = diffHTML(cmp, r.viaMic ? 'Coincidencia del texto reconocido' : 'Coincidencia del texto escrito') +
        `<div class="actions">${good ? '' : '<button class="btn soft" id="again">🔁 Intentar otra vez</button>'}<button class="btn primary" id="next">Continuar</button></div>`;
      if (good) { Tutor.mood('celebrate'); run(() => say(f, [en(pick(['Much better!', 'Yes, that sounds very natural!', 'Excellent!']))])); }
      else { Tutor.mood('correct'); run(() => say(f, [es('Vamos otra vez, con calma.'), en(main.natural)], { slow: true })); }
      const act = await new Promise(res => { $('#next').addEventListener('click', () => res('next')); $('#again')?.addEventListener('click', () => res('again')); });
      App.check(f); Voice.stop();
      if (act === 'next') { if (!good) main.keep = true; break; }
    }
  } else {
    body(`<h2>5 · Corrección</h2><div class="good-box big">🎉 No encontré errores claros en lo que reconocí. ¡Muy bien!</div>
      <p class="muted">Reto extra: di esta frase con naturalidad.</p><p class="p-en">${esc(dlg.turns[0].model)}</p><div id="ans"></div><div id="fb"></div>`);
    Tutor.mood('celebrate');
    await say(f, [es('¡Muy bien! No encontré errores claros. Te dejo un reto extra:'), en(dlg.turns[0].model)]);
    const r = await askAnswer($('#ans'), { skip: true }); App.check(f);
    if (r.text) { if (r.viaMic) addSpoken(r.seconds); $('#fb').innerHTML = diffHTML(compareText(dlg.turns[0].model, r.text)); }
    $('#fb').insertAdjacentHTML('beforeend', '<div class="actions"><button class="btn primary" id="next">Continuar</button></div>');
    await waitClick($('#next')); App.check(f);
  }

  /* Paso 6 · Guardar frases difíciles */
  step(5);
  const toSave = [];
  st.corrections.forEach(c => toSave.push({ en: c.natural, es: '', note: c.tip_es, said: c.said }));
  st.phrase.filter(x => x.best < 0.85).forEach(x => toSave.push({ en: x.p.en, es: x.p.es, note: x.p.tip, said: x.said }));
  const uniq = []; toSave.forEach(t => { if (!uniq.some(u => normalize(u.en).join(' ') === normalize(t.en).join(' '))) uniq.push(t); });
  body(`<h2>6 · Frases para repasar</h2>
    ${uniq.length ? `<p>Estas frases te costaron más. Se guardarán en tu repaso:</p>
      <div class="save-list">${uniq.map((u, i) => `<label class="save-item"><input type="checkbox" checked data-i="${i}"><div><b>${esc(u.en)}</b>${u.es ? `<span>${esc(u.es)}</span>` : ''}${u.note ? `<small>${esc(u.note)}</small>` : ''}</div></label>`).join('')}</div>`
      : '<div class="good-box">Todas las frases salieron bien. Aun así puedes repasar cuando quieras.</div>'}
    <div class="actions"><button class="btn primary big" id="finish">Guardar y terminar lección</button></div>`);
  await say(f, [es(uniq.length ? 'Guardé las frases que te costaron más para que las repases después.' : '¡Excelente! Todas las frases salieron bien.')]);
  await waitClick($('#finish')); App.check(f);
  $$('.save-item input').forEach(cb => { if (cb.checked) addReview(uniq[+cb.dataset.i]); });
  const compScore = st.comp.length ? st.comp.reduce((a, b) => a + b, 0) / st.comp.length : 0;
  S.completed[L.id] = { date: Date.now(), comp: Math.round(compScore * 100), phrases: Math.round(st.phrase.reduce((a, x) => a + x.best, 0) / st.phrase.length * 100) };
  S.sessions.push({ date: Date.now(), lesson: L.id });
  save();

  // Lección completa
  step(6);
  const next = recommendLesson(S.levelIdx ?? 0, S.goal);
  body(`<div class="done-box"><div class="big-emoji">🏆</div><h2>¡Lección terminada!</h2>
    <p>Comprensión: <b>${S.completed[L.id].comp}%</b> · Frases: <b>${S.completed[L.id].phrases}%</b> de coincidencia</p>
    <p class="muted">Tiempo hablado acumulado: ${fmtTime(S.secondsSpoken)}</p></div>
    <div class="actions col">
      ${opts.session ? '<p class="eyebrow">Sigue tu sesión de 30 minutos</p>' : ''}
      <button class="btn primary" id="toReview" ${S.review.length ? '' : 'hidden'}>🔁 Repasar frases difíciles (~5 min)</button>
      <button class="btn ${S.review.length ? 'soft' : 'primary'}" id="toFree">💬 Conversación libre (~5 min)</button>
      <button class="btn ghost" id="toPlan">Volver a mi plan · siguiente: ${esc(next.title)}</button></div>`);
  $('#toReview').addEventListener('click', () => App.go('review'));
  $('#toFree').addEventListener('click', () => App.go('free'));
  $('#toPlan').addEventListener('click', () => App.go('plan'));
  Tutor.mood('celebrate');
  await say(f, [en('You did it! Lesson complete.'), es('¡Lección terminada! Sigue con tu repaso o una conversación libre.')]);
}

/* ---------- 7. Conversación libre ---------- */
SCREENS.free = () => {
  setScene('living');
  view(`<div class="card"><p class="eyebrow">Conversación libre</p><h1>¿De qué quieres platicar?</h1>
    <p class="muted">${esc(Tutor.char.name)} te hará una pregunta a la vez y responderá a lo que digas. Si algo puede sonar más natural, te lo dirá.</p>
    <div class="goal-grid">${FREE_TOPICS.filter(t => !t.hidden).map(t => `<button class="goal-card" data-t="${t.id}"><span class="g-ico">${t.icon}</span><b>${t.label}</b></button>`).join('')}</div>
    <p class="fine">Conversación: ${esc(AI.label())}.</p></div>`);
  $$('[data-t]').forEach(b => b.addEventListener('click', () => App.go('freeChat', b.dataset.t)));
  const f = App.flow; Tutor.mood('greet');
  run(() => say(f, [en("Let's chat! Pick a topic.")]));
};

SCREENS.freeChat = topicId => run(async () => {
  const f = App.flow; setScene('living');
  const topic = FREE_TOPICS.find(t => t.id === topicId);
  const levelIdx = S.levelIdx ?? 0;
  view(`<div class="card"><div class="row-between"><div><p class="eyebrow">Conversación libre</p><h1>${topic.icon} ${topic.label}</h1></div>
    <button class="btn ghost sm" id="endChat">Terminar</button></div>
    <div class="chat" id="chat"></div><div id="ans"></div></div>`);
  let endNow; const endP = new Promise(r => { endNow = r; });
  $('#endChat').addEventListener('click', () => endNow({ cmd: 'end' }));
  const dlg = new FreeDialog(topicId, { levelIdx, userName: S.name });
  const history = [], corrections = [];
  const t0 = S.secondsSpoken;
  let q = dlg.opening(), end = false, turns = 0, retryNatural = null;
  for (; ;) {
    addChat('tutor', q); history.push({ role: 'tutor', text: q });
    await say(f, [en(q)]);
    if (end) break;
    let r;
    for (; ;) {
      let retryClick; const retryP = new Promise(res => { retryClick = res; });
      if (retryNatural) { const bs = $$('#chat .retry-btn'); const b = bs[bs.length - 1]; if (b) b.onclick = () => { b.disabled = true; retryClick({ cmd: 'retry' }); }; }
      r = await Promise.race([askAnswer($('#ans'), {}), endP, retryP]); App.check(f);
      if (r.cmd === 'repeat') { await say(f, [en(dlg.lastQuestion || q)], { slow: true }); continue; }
      if (r.cmd === 'retry') {
        const target = retryNatural; retryNatural = null;
        const rr = await askAnswer($('#ans'), { label: `Inténtalo de nuevo: «${target}»`, allowHelp: false }); App.check(f);
        if (rr.viaMic) addSpoken(rr.seconds);
        const cmp = compareText(target, rr.text);
        addChat('note', `<div class="corr-mini">${diffHTML(cmp, rr.viaMic ? 'Coincidencia del texto reconocido' : 'Coincidencia del texto escrito')}</div>`);
        if (cmp.ratio >= 0.85) { Tutor.mood('celebrate'); await say(f, [en('Much better! Now, back to my question.')]); }
        else { Tutor.mood('correct'); await say(f, [en(`Good try. It's: ${target}`)]); }
        await say(f, [en(dlg.lastQuestion || q)]);
        continue;
      }
      break;
    }
    if (r.cmd === 'end') break;
    turns++;
    addChat('user', r.text); history.push({ role: 'user', text: r.text });
    if (r.viaMic) addSpoken(r.seconds);
    const local = dlg.respond(r.text);
    let reply = local.reply, corr = local.correction; end = !!local.end;
    if (AI.active() && !local.help) {
      Tutor.mood('think');
      const j = await AI.json(promptConversation({ tutorName: Tutor.char.name, level: LEVELS[levelIdx], scenario: `A relaxed free conversation about: ${topic.label} (${topic.qB[0]})`, role: 'a friendly conversation partner who is curious about the student', history, said: r.text, turn: turns, maxTurns: dlg.maxTurns }));
      App.check(f); Tutor.mood('idle');
      if (j && j.reply) { reply = j.reply; end = !!j.end || turns >= dlg.maxTurns + 2; if (!end && local.end) end = false; }
      if (!corr && j && j.correction && j.correction.natural && normalize(j.correction.natural).join(' ') !== normalize(r.text).join(' '))
        corr = { said: r.text, natural: j.correction.natural, tip_es: j.correction.tip_es || '', tags: ['Sugerencia de la IA'] };
    }
    if (local.help && local.hint_es) addChat('note', `<p class="hint-box">💡 ${esc(local.hint_es)}</p>`);
    q = reply;
    if (corr) {
      corrections.push(corr); addReview({ en: corr.natural, note: corr.tip_es, said: corr.said }); save();
      retryNatural = corr.natural;
      addChat('note', `<div class="corr corr-mini">
        <div class="corr-row said"><span>Lo que dijiste</span><p>${esc(corr.said)}</p></div>
        <div class="corr-row natural"><span>Una forma más natural</span><p>${esc(corr.natural)}</p></div>
        ${corr.tip_es ? `<p class="corr-tip">💡 ${esc(corr.tip_es)}</p>` : ''}
        <button class="btn soft sm retry-btn">🔁 Inténtalo de nuevo</button></div>`);
    }
  }
  S.chats++; save();
  Tutor.mood('celebrate');
  $('#ans').innerHTML = `<div class="done-box"><h2>¡Buena plática!</h2>
    <p>${turns} respuestas · tiempo hablado en esta plática: <b>${fmtTime(S.secondsSpoken - t0)}</b></p>
    ${corrections.length ? `<p>${corrections.length} sugerencia(s) guardada(s) en tu repaso.</p>` : '<p>Sin correcciones que guardar. ¡Muy bien!</p>'}</div>
    <div class="actions"><button class="btn primary" id="again">Otro tema</button><button class="btn ghost" id="prog">Ver mi progreso</button></div>`;
  $('#again').addEventListener('click', () => App.go('free'));
  $('#prog').addEventListener('click', () => App.go('progress'));
  if (!end) await say(f, [en('Thanks for chatting! See you next time.')]);
});

/* ---------- 8. Repaso ---------- */
SCREENS.review = () => run(async () => {
  const f = App.flow; setScene('studio');
  const items = S.review.slice().sort((a, b) => a.reps - b.reps).slice(0, 8);
  if (!items.length) { view(`<div class="card"><h1>Repaso</h1><p>Aún no tienes frases guardadas. Se agregan solas cuando una frase te cuesta en las lecciones o conversaciones.</p><button class="btn primary" id="b">Ir a lecciones</button></div>`); $('#b').addEventListener('click', () => App.go('lessons')); return; }
  let mastered = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    view(`<div class="card"><p class="eyebrow">Repaso · ${i + 1} de ${items.length}</p><h1>Escucha y repite</h1>
      <div class="phrase"><p class="p-en">${esc(it.en)}</p>${it.es ? `<p class="p-es">${esc(it.es)}</p>` : ''}${it.note ? `<p class="p-tip">💡 ${esc(it.note)}</p>` : ''}
      <p class="fine">Dominio: ${'●'.repeat(it.reps)}${'○'.repeat(3 - Math.min(3, it.reps))}</p></div>
      <div id="ans"></div><div id="fb"></div></div>`);
    if (i === 0) await say(f, [es('Repasemos tus frases difíciles. Escucha y repite.')]);
    await say(f, [en(it.en)]);
    let r;
    for (; ;) { r = await askAnswer($('#ans'), { skip: true }); App.check(f); if (r.cmd === 'repeat') { await say(f, [en(it.en)], { slow: true }); continue; } break; }
    if (r.cmd !== 'skip') {
      if (r.viaMic) addSpoken(r.seconds);
      const cmp = compareText(it.en, r.text);
      const ref = S.review.find(x => x.en === it.en);
      if (cmp.ratio >= 0.85 && ref) { ref.reps++; if (ref.reps >= 3) { S.review = S.review.filter(x => x !== ref); mastered++; } }
      save();
      $('#fb').innerHTML = diffHTML(cmp, r.viaMic ? 'Coincidencia del texto reconocido' : 'Coincidencia del texto escrito') + '<div class="actions"><button class="btn primary" id="next">Siguiente</button></div>';
      if (cmp.ratio >= 0.85) { Tutor.mood('celebrate'); run(() => say(f, [en(pick(['Great!', 'Nice!', 'Perfect!']))])); } else { Tutor.mood('correct'); run(() => say(f, [en(it.en)], { slow: true })); }
      await waitClick($('#next')); App.check(f);
    }
  }
  view(`<div class="card"><div class="done-box"><div class="big-emoji">🔁</div><h2>¡Repaso terminado!</h2><p>${mastered ? `Dominaste ${mastered} frase(s): ya salieron de tu lista.` : 'Cada frase se domina al decirla bien 3 veces.'}</p></div>
    <div class="actions"><button class="btn primary" id="f">💬 Conversación libre</button><button class="btn ghost" id="p">Ver progreso</button></div></div>`);
  $('#f').addEventListener('click', () => App.go('free'));
  $('#p').addEventListener('click', () => App.go('progress'));
  Tutor.mood('celebrate');
  await say(f, [en('Review done. Great work!')]);
});

/* ---------- 9. Panel de progreso ---------- */
SCREENS.progress = () => {
  setScene('studio');
  const nDone = Object.keys(S.completed).length;
  const R = S.test;
  view(`<div class="card"><p class="eyebrow">Panel de progreso</p><h1>Tu progreso</h1>
    <div class="stats">
      <div class="stat"><span class="s-num">${S.levelIdx !== null ? LEVELS[S.levelIdx] : '—'}</span><span>Nivel ${R && !R.skipped ? 'estimado' : 'inicial'}</span></div>
      <div class="stat"><span class="s-num">${nDone}/${LESSONS.length}</span><span>Lecciones completadas</span></div>
      <div class="stat"><span class="s-num">${Math.round(S.secondsSpoken / 60)}<small> min</small></span><span>Tiempo hablado (aprox.)</span></div>
      <div class="stat"><span class="s-num">${sessionsThisWeek()}/3</span><span>Sesiones esta semana</span></div>
    </div>
    ${R && !R.skipped ? `<h2>Habilidades (examen inicial)</h2><div class="skills">${skillBars(R)}</div><p class="fine">Estimación del ${new Date(R.date).toLocaleDateString('es-MX')}. No es una certificación.</p>` : ''}
    ${S.pron && S.pron.attempts ? `<h2>Pronunciación</h2><div class="stats three"><div class="stat"><span class="s-num">${Math.round(S.pron.sum / S.pron.attempts)}</span><span>Promedio (Azure)</span></div><div class="stat"><span class="s-num">${S.pron.attempts}</span><span>Intentos evaluados</span></div><div class="stat"><span class="s-num">${Object.keys(S.pron.weak).length}</span><span>Palabras por mejorar</span></div></div><button class="btn soft" id="toPron">🎙️ Practicar pronunciación</button>` : ''}
    <h2>Vocabulario por repasar <small class="muted">(${S.review.length})</small></h2>
    ${S.review.length ? `<div class="review-list">${S.review.map((r, i) => `<div class="review-item"><div><b>${esc(r.en)}</b>${r.es ? `<span>${esc(r.es)}</span>` : ''}${r.said ? `<small>Dijiste: «${esc(r.said)}»</small>` : ''}</div><span class="reps">${'●'.repeat(r.reps)}${'○'.repeat(3 - Math.min(3, r.reps))}</span><button class="icon-btn" data-del="${i}" aria-label="Quitar">✕</button></div>`).join('')}</div>
      <button class="btn primary" id="practice">🔁 Practicar ahora</button>` : '<p class="muted">Vacío por ahora. Se llena con las frases que te cuestan.</p>'}
    <h2>Lecciones</h2><div class="lesson-list">${LESSONS.map(l => lessonRow(l, false)).join('')}</div>
    <div class="actions"><button class="btn ghost" id="retest">Repetir examen inicial</button></div></div>`);
  $$('[data-del]').forEach(b => b.addEventListener('click', () => { S.review.splice(+b.dataset.del, 1); save(); SCREENS.progress(); }));
  $('#practice')?.addEventListener('click', () => App.go('review'));
  $('#toPron')?.addEventListener('click', () => App.go('practice'));
  $('#retest').addEventListener('click', () => App.go('test'));
  bindLessonRows();
};

/* ---------- Ajustes ---------- */
function openSettings() {
  const m = $('#modal');
  const tg = (k, label, desc) => `<label class="toggle"><input type="checkbox" data-k="${k}" ${S.settings[k] ? 'checked' : ''}><span class="sw"></span><div><b>${label}</b><small>${desc}</small></div></label>`;
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="Ajustes">
    <div class="row-between"><h2>Ajustes</h2><button class="icon-btn" id="closeM" aria-label="Cerrar">✕</button></div>
    <div id="settingsStatus">${statusList()}</div>
    ${tg('cc', 'Subtítulos', 'Muestra en el globo lo que dice el tutor.')}
    ${tg('slow', 'Voz lenta', 'Reduce la velocidad de la voz.')}
    ${tg('mute', 'Silenciar al tutor', 'Solo subtítulos; la boca no se mueve.')}
    ${tg('audioFirst', 'Primero escuchar', 'En las conversaciones, el texto del tutor aparece borroso hasta que lo tocas.')}
    ${tg('useAI', 'Usar IA cuando esté disponible', 'Respuestas más naturales. Si no hay IA, se usan reglas locales.')}
    <h3>Tutor</h3><div class="row-btns">${Object.values(CHARACTERS).map(c => `<button class="btn ${S.character === c.id ? 'primary' : 'soft'} sm" data-ch="${c.id}">${c.name}</button>`).join('')}</div>
    <h3>Datos</h3><p class="fine">Tu progreso se guarda solo en este navegador.</p>
    <div class="row-btns"><button class="btn soft sm" id="mRetest">Repetir examen</button><button class="btn danger sm" id="mReset">Borrar progreso</button></div>
    <p class="fine">Privacidad: en Chrome, el reconocimiento de voz del navegador envía el audio al servicio de Google para convertirlo en texto. La app no graba ni guarda audio; solo guarda el texto de tus respuestas en este navegador.</p></div>`;
  m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  $('#closeM').addEventListener('click', close);
  m.addEventListener('click', e => { if (e.target === m) close(); }, { once: true });
  $$('.toggle input', m).forEach(cb => cb.addEventListener('change', () => { S.settings[cb.dataset.k] = cb.checked; save(); syncControls(); if (cb.dataset.k === 'mute' && cb.checked) Voice.stop(); App.updateStatus(); }));
  $$('[data-ch]', m).forEach(b => b.addEventListener('click', () => { S.character = b.dataset.ch; save(); Tutor.set(S.character); close(); toast(`Tu tutor ahora es ${Tutor.char.name}`); Tutor.mood('greet'); Voice.speak([en(Tutor.char.hello_en)]); }));
  $('#mRetest').addEventListener('click', () => { close(); App.go('test'); });
  $('#mReset').addEventListener('click', e => {
    if (e.target.dataset.confirm) { S = defaultState(); save(); close(); Tutor.set('fox'); App.go('welcome'); toast('Progreso borrado'); }
    else { e.target.dataset.confirm = '1'; e.target.textContent = '¿Seguro? Toca otra vez para borrar'; }
  });
}

/* ---------- Controles de voz del escenario ---------- */
function syncControls() {
  const set = (id, on, labelOn, labelOff) => { const b = $(id); b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); if (labelOn) b.querySelector('.vl').textContent = on ? labelOn : labelOff; };
  set('#vSlow', S.settings.slow);
  set('#vCC', S.settings.cc);
  set('#vMute', S.settings.mute, 'Silenciado', 'Sonido');
  $('#vMute .vi').textContent = S.settings.mute ? '🔇' : '🔊';
}

function init() {
  Subs.init($('#bubble')); NPC.el = $('#npc'); Tutor.mount($('#charWrap'));
  Tutor.set(S.character || 'fox');
  Voice.init(); Ears.configure(); AI.configure();
  detectCaps(() => App.updateStatus());
  document.addEventListener('pointerdown', () => Voice.unlock());
  $('#vRepeat').addEventListener('click', () => Voice.repeat());
  $('#vSlow').addEventListener('click', () => { S.settings.slow = !S.settings.slow; save(); syncControls(); });
  $('#vCC').addEventListener('click', () => { S.settings.cc = !S.settings.cc; save(); syncControls(); });
  $('#vMute').addEventListener('click', () => { S.settings.mute = !S.settings.mute; save(); syncControls(); if (S.settings.mute) Voice.stop(); });
  $('#btnSettings').addEventListener('click', openSettings);
  $$('#nav button').forEach(b => b.addEventListener('click', () => App.go(b.dataset.go)));
  $('#brand').addEventListener('click', () => App.go(S.levelIdx === null ? 'welcome' : 'plan'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) { $('#modal').hidden = true; } });
  syncControls(); App.updateStatus();
  if (S.levelIdx === null || !S.character) App.go('welcome');
  else if (!S.goal) App.go('goal');
  else App.go('plan');
}
document.addEventListener('DOMContentLoaded', init);
