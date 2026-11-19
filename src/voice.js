/* ============================================================
   VOZ, MICRÓFONO, SINCRONÍA DE BOCA E IA
   Backends (se elige el mejor disponible, en este orden):
   - Voz:  servidor /api/tts (audio real + análisis de amplitud)
           → voz de Claude (artefacto publicado, capacidad "tts")
           → speechSynthesis del navegador (eventos por palabra)
   - Oído: dictado de Claude (artefacto) → Web Speech API → escribir
   - IA:   servidor /api/chat → Claude (capacidad "sample") → reglas locales
   ============================================================ */

const Caps = { server: { chat: false, tts: false }, claudeTTS: null, claudeDictation: null, claudeSample: null, ready: false };

async function detectCaps(onUpdate) {
  // 1) Servidor propio (cuando corres `npm start`)
  try {
    if (/^https?:$/.test(location.protocol)) {
      const r = await fetch('api/config', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) Caps.server = await r.json();
    }
  } catch (e) { /* sin servidor: está bien */ }
  onUpdate && onUpdate();
  // 2) Capacidades de Claude (solo cuando la app está publicada como artefacto)
  const c = (typeof window.claude === 'object' && window.claude && typeof window.claude.use === 'function') ? window.claude : null;
  if (c) {
    const safe = p => Promise.resolve(p).catch(() => null);
    const [tts, dict, sample] = await Promise.all([safe(c.use('tts')), safe(c.use('dictation')), safe(c.use('sample'))]);
    Caps.claudeTTS = tts; Caps.claudeDictation = dict; Caps.claudeSample = sample;
  }
  Caps.ready = true;
  Voice.configure(); Ears.configure(); AI.configure();
  onUpdate && onUpdate();
}

/* ---------------- Subtítulos (globo del personaje) ---------------- */
const Subs = {
  el: null, who: null, text: null, words: [], cur: -1,
  init(el) { this.el = el; this.who = el.querySelector('.bubble-who'); this.text = el.querySelector('.bubble-text'); },
  show(line, wordStarts, audioOnly) {
    if (!this.el) return;
    const npc = line.who === 'npc';
    this.el.hidden = false;
    this.el.classList.toggle('is-npc', npc);
    this.el.classList.toggle('es', line.lang === 'es');
    this.who.textContent = npc ? `${line.npc?.icon || '🗣️'} ${line.npc?.name || ''}` : `${Tutor.char.name}${line.lang === 'es' ? ' · español' : ''}`;
    const forced = S.settings.mute || Voice.backend === 'none';
    const cc = (S.settings.cc && !audioOnly) || forced;
    this.el.classList.toggle('cc-off', !cc);
    this.words = [];
    if (cc) {
      const parts = line.text.split(/(\s+)/);
      this.text.innerHTML = parts.map(p => /\s+/.test(p) || !p ? p : `<span class="w">${esc(p)}</span>`).join('');
      this.words = [...this.text.querySelectorAll('.w')];
    } else {
      this.text.innerHTML = audioOnly && S.settings.cc ? `<span class="cc-off-msg">🎧 Escucha con atención… <small>(el texto aparece después)</small></span>` : `<span class="cc-off-msg">🔊 Escuchando… <small>(subtítulos apagados)</small></span>`;
    }
    this.cur = -1;
  },
  highlight(i) {
    if (i === this.cur || !this.words.length) return;
    this.words.forEach((w, k) => w.classList.toggle('on', k === i));
    this.cur = i;
  },
  hide() { if (this.el) this.el.hidden = true; }
};

/* ---------------- Sincronía de boca ----------------
   - Audio de servidor: amplitud real de la señal (AnalyserNode).
   - Navegador: cada evento de palabra (onboundary) reancla una línea de
     tiempo de sílabas estimadas.
   - Voz de Claude: la posición en milisegundos (onPosition) reancla la
     misma línea de tiempo.                                              */
const Lip = {
  tl: null, anchorT: 0, anchorPerf: 0, running: false, pending: false, analyser: null, buf: null, raf: 0, smooth: 0,
  build(text, lang, rate) {
    const segs = [], wordStarts = [];
    const syl = lang === 'es' ? 0.15 : 0.19;
    let t = 0.05, ci = 0;
    const re = /\S+/g; let m;
    while ((m = re.exec(text))) {
      const raw = m[0], word = raw.toLowerCase().replace(/[^a-záéíóúñü']/g, '');
      wordStarts.push({ char: m.index, t });
      const groups = word.match(/[aeiouyáéíóú]+/g) || (word ? ['e'] : []);
      let n = groups.length;
      if (lang !== 'es' && n > 1 && /[^aeiou]e$/.test(word)) n--;
      for (let k = 0; k < n; k++) {
        const v = groups[k] || 'e', d = syl / rate;
        const amp = /a|á/.test(v) ? 1 : /o|ó/.test(v) ? 0.8 : /u|ú/.test(v) ? 0.6 : /e|é/.test(v) ? 0.7 : 0.55;
        segs.push({ t0: t, t1: t + d * 0.9, amp, round: /[ouóú]/.test(v) }); t += d;
      }
      t += 0.05 / rate;
      if (/[,;:]$/.test(raw)) t += 0.22 / rate;
      if (/[.!?]$/.test(raw)) t += 0.4 / rate;
      ci = m.index;
    }
    return { segs, wordStarts, total: t };
  },
  start(tl, { pending = false } = {}) { this.analyser = null; this.tl = tl; this.pending = pending; this.anchorT = 0; this.anchorPerf = performance.now(); this.running = true; this.loop(); },
  begin() { if (this.pending) { this.pending = false; this.anchorT = 0; this.anchorPerf = performance.now(); } },
  anchorMs(ms) { this.pending = false; this.anchorT = ms / 1000; this.anchorPerf = performance.now(); },
  anchorChar(ci) {
    if (!this.tl) return; this.pending = false;
    let idx = 0; this.tl.wordStarts.forEach((w, k) => { if (w.char <= ci) idx = k; });
    this.anchorT = this.tl.wordStarts[idx].t; this.anchorPerf = performance.now();
  },
  startAnalyser(an) { this.tl = null; this.analyser = an; this.buf = new Uint8Array(an.fftSize); this.running = true; this.pending = false; this.loop(); },
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.set(0); this.analyser = null; },
  set(v, round) { if (Tutor.root) { Tutor.root.style.setProperty('--m', v.toFixed(3)); Tutor.mouth(v, round); } },
  loop() {
    cancelAnimationFrame(this.raf);
    const step = () => {
      if (!this.running) return;
      let m = 0, round = false;
      if (this.analyser) {
        this.analyser.getByteTimeDomainData(this.buf);
        let sum = 0; for (let i = 0; i < this.buf.length; i++) { const x = (this.buf[i] - 128) / 128; sum += x * x; }
        const rms = Math.sqrt(sum / this.buf.length);
        m = clamp((rms - 0.015) * 7, 0, 1);
      } else if (this.tl && !this.pending) {
        const t = this.anchorT + (performance.now() - this.anchorPerf) / 1000;
        const s = this.tl.segs.find(sg => t >= sg.t0 && t <= sg.t1);
        if (s) { m = s.amp * Math.pow(Math.sin(Math.PI * (t - s.t0) / (s.t1 - s.t0)), 0.8); round = s.round; }
        let wi = -1; this.tl.wordStarts.forEach((w, k) => { if (w.t <= t) wi = k; });
        if (wi >= 0) Subs.highlight(wi);
      }
      this.smooth = this.smooth * 0.45 + m * 0.55;
      this.set(this.smooth, round);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
};

/* ---------------- Voz (texto a voz) ---------------- */
const Voice = {
  backend: 'none', enVoice: null, enVoice2: null, esVoice: null, token: 0, last: null, ctx: null, audio: null, _resolveLine: null, browserReady: false,
  init() {
    if ('speechSynthesis' in window) {
      const load = () => {
        const vs = speechSynthesis.getVoices();
        if (!vs.length) return;
        const score = (v, prefs) => { let s = 0; prefs.forEach((p, i) => { if (p.test(v.name)) s = Math.max(s, 100 - i); }); return s; };
        const en = vs.filter(v => /^en[-_]/i.test(v.lang));
        const enSorted = en.slice().sort((a, b) => score(b, [/natural/i, /google us english/i, /samantha/i, /aria|jenny|guy/i, /en-us/i]) - score(a, [/natural/i, /google us english/i, /samantha/i, /aria|jenny|guy/i, /en-us/i]) || (/en[-_]us/i.test(b.lang) - /en[-_]us/i.test(a.lang)));
        this.enVoice = enSorted[0] || null;
        this.enVoice2 = enSorted.find(v => v !== this.enVoice && /en[-_](us|gb)/i.test(v.lang)) || null;
        const es = vs.filter(v => /^es[-_]/i.test(v.lang));
        this.esVoice = es.find(v => /es[-_]mx/i.test(v.lang)) || es.find(v => /es[-_](us|419)/i.test(v.lang)) || es[0] || null;
        this.browserReady = !!this.enVoice;
        this.configure(); App.updateStatus && App.updateStatus();
      };
      load(); speechSynthesis.onvoiceschanged = load;
    }
  },
  configure() {
    if (Caps.server.tts) this.backend = 'server';
    else if (Caps.claudeTTS && !this.claudeOff) this.backend = 'claude';
    else if (this.browserReady) this.backend = 'browser';
    else this.backend = 'none';
    if (this.backend === 'claude' && !this._claudeHooked) {
      this._claudeHooked = true;
      const t = Caps.claudeTTS;
      try { t.onState(({ state }) => { if (state === 'speaking') Lip.begin(); }); } catch (e) { }
      try { t.onPosition(({ ms }) => Lip.anchorMs(ms)); } catch (e) { }
    }
  },
  short() { return { server: 'Voz API', claude: 'Voz Claude', browser: 'Voz navegador', none: 'Sin voz' }[this.backend]; },
  label() {
    return { server: 'Voz del servidor (API externa)', claude: 'Voz de Claude', browser: `Voz del navegador${this.enVoice ? ' · ' + this.enVoice.name : ''}`, none: 'Sin voz disponible' }[this.backend];
  },
  unlock() {
    try { if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) { }
  },
  baseRate() { const lvl = S.levelIdx ?? 0; return [0.85, 0.92, 1, 1.02, 1.05][lvl] || 0.95; },
  stop() {
    this.token++;
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { }
    try { if (Caps.claudeTTS) Caps.claudeTTS.stop(); } catch (e) { }
    try { if (this.audio) { this.audio.pause(); } } catch (e) { }
    if (this._resolveLine) { const r = this._resolveLine; this._resolveLine = null; r(); }
    Lip.stop(); Tutor.talking(false); NPC.hide();
  },
  async repeat(slow) {
    if (!this.last) return;
    await this.speak(this.last, { slow });
  },
  /* lines: [{text, lang:'en'|'es', who:'tutor'|'npc', npc:{name,icon}}] */
  async speak(lines, opts = {}) {
    if (typeof lines === 'string') lines = [{ text: lines, lang: 'en', who: 'tutor' }];
    lines = lines.filter(l => l && l.text);
    if (!lines.length) return;
    Ears.abort();
    this.stop();
    const my = this.token;
    this.last = lines;
    const slow = opts.slow ?? S.settings.slow;
    for (const line of lines) {
      if (my !== this.token) return;
      const rate = (opts.rate || this.baseRate()) * (slow ? 0.75 : 1) * (line.lang === 'es' ? 1.05 : 1);
      const tl = Lip.build(line.text, line.lang, rate);
      Subs.show(line, tl.wordStarts, opts.audioOnly && line.lang === 'en');
      const isTutor = line.who !== 'npc';
      if (isTutor) { Tutor.talking(true); NPC.hide(); } else { Tutor.talking(false); NPC.show(line.npc); }
      try {
        if (S.settings.mute || this.backend === 'none') await this.silentLine(line, tl, my);
        else if (this.backend === 'server') await this.serverLine(line, rate, isTutor);
        else if (this.backend === 'claude') await this.claudeLine(line, rate, isTutor, tl);
        else await this.browserLine(line, rate, isTutor, tl);
      } catch (e) { console.warn('voz', e); }
      if (!isTutor) Lip.stop();
      Lip.stop(); Tutor.talking(false); NPC.hide();
      if (my !== this.token) return;
      await sleep(180);
    }
  },
  async silentLine(line, tl, my) {
    // Silenciado: solo subtítulos; la boca NO se mueve (no simulamos voz).
    const ms = clamp(line.text.length * 55, 1200, 6000);
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { if (my !== this.token) return; await sleep(100); }
  },
  browserLine(line, rate, isTutor, tl) {
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(line.text);
      const v = line.lang === 'es' ? this.esVoice : (isTutor ? this.enVoice : (this.enVoice2 || this.enVoice));
      if (v) u.voice = v;
      u.lang = line.lang === 'es' ? (this.esVoice?.lang || 'es-MX') : (v?.lang || 'en-US');
      u.rate = rate; u.pitch = isTutor ? Tutor.char.pitch : 0.9;
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(safety); this._resolveLine = null; res(); };
      this._resolveLine = finish;
      if (isTutor) Lip.start(tl, { pending: true });
      u.onstart = () => Lip.begin();
      u.onboundary = e => { if (e.name === 'word' || !e.name) Lip.anchorChar(e.charIndex); };
      u.onend = finish; u.onerror = finish;
      const safety = setTimeout(finish, (tl.total * 1000) * 2.2 + 4000);
      try { speechSynthesis.resume(); } catch (e) { }
      speechSynthesis.speak(u);
    });
  },
  async claudeLine(line, rate, isTutor, tl) {
    const t = Caps.claudeTTS;
    if (isTutor) { Lip.start(tl, { pending: true }); setTimeout(() => Lip.begin(), 1600); }
    const voice = isTutor ? Tutor.char.claudeVoice : 'buttery';
    try {
      await t.speak(line.text, { voice, rate: clamp(rate, 0.7, 1.5), language: line.lang === 'es' ? 'es' : 'en' });
    } catch (e) {
      const code = e && e.code;
      if (code === 'not_granted' || code === 'unavailable') { this.claudeOff = true; this.configure(); App.updateStatus(); if (this.backend === 'browser') return this.browserLine(line, rate, isTutor, tl); }
      if (code === 'busy') { Ears.abort(); }
    }
  },
  async serverLine(line, rate, isTutor) {
    const r = await fetch('api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: line.text, lang: line.lang, voice: isTutor ? Tutor.char.id : 'npc', speed: rate }) });
    if (!r.ok) throw new Error('tts ' + r.status);
    const url = URL.createObjectURL(await r.blob());
    await new Promise(res => {
      const a = new Audio(url); this.audio = a;
      let done = false; const finish = () => { if (done) return; done = true; this._resolveLine = null; URL.revokeObjectURL(url); res(); };
      this._resolveLine = finish;
      a.onended = finish; a.onerror = finish;
      try {
        this.unlock();
        if (this.ctx && isTutor) {
          const src = this.ctx.createMediaElementSource(a); const an = this.ctx.createAnalyser(); an.fftSize = 1024;
          src.connect(an); an.connect(this.ctx.destination); Lip.startAnalyser(an);
        }
      } catch (e) { }
      a.play().catch(finish);
    });
  }
};

/* ---------------- Personaje no jugador (voz secundaria) ---------------- */
const NPC = {
  el: null,
  show(npc) { if (!this.el || !npc) return; this.el.hidden = false; this.el.querySelector('.npc-ava').textContent = npc.icon || '🗣️'; this.el.querySelector('.npc-name').textContent = npc.name || ''; this.el.classList.add('talking'); },
  hide() { if (this.el) { this.el.classList.remove('talking'); this.el.hidden = true; } }
};

/* ---------------- Oído (voz a texto) ---------------- */
const Ears = {
  backend: 'none', denied: false, rec: null, h: null, listening: false,
  configure() {
    const prev = this.backend;
    this._configure();
    if (prev !== this.backend) this.denied = false;
  },
  _configure() {
    if (Caps.claudeDictation && !this.claudeOff) {
      this.backend = 'claude';
      if (!this._hooked) {
        this._hooked = true; const d = Caps.claudeDictation;
        d.onPartial(({ text }) => this.h && this.h.partial(text));
        d.onFinal(({ text }) => this.h && this.h.final(text));
        d.onState(({ state, reason }) => { this.listening = state === 'listening'; this.h && this.h.state(state, reason); });
      }
    } else if ((window.SpeechRecognition || window.webkitSpeechRecognition) && window.isSecureContext !== false) this.backend = 'browser';
    else this.backend = 'none';
  },
  available() { return this.backend !== 'none' && !this.denied; },
  short() { return this.denied ? 'Mic sin permiso' : { claude: 'Dictado Claude', browser: 'Mic navegador', none: 'Sin mic' }[this.backend]; },
  label() {
    if (this.denied) return 'Micrófono sin permiso (respuestas escritas)';
    return { claude: 'Dictado de Claude', browser: 'Reconocimiento de voz del navegador', none: 'No disponible en este navegador (respuestas escritas)' }[this.backend];
  },
  // Debe llamarse directo desde el clic del usuario (sin await antes).
  start(h) {
    this.h = h;
    if (this.backend === 'claude') {
      this.listening = true;
      Caps.claudeDictation.start().catch(e => {
        const code = (e && (e.code || e.message)) || String(e);
        this.listening = false;
        if (code === 'not_granted') this.denied = true;
        h.error(code);
      });
      return;
    }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new R(); this.rec = rec;
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = e => {
      let fin = '', part = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else part += r[0].transcript; }
      if (part) h.partial(part);
      if (fin) h.final(fin);
    };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.denied = true; h.error(e.error); };
    rec.onend = () => { this.listening = false; this.h && this.h.state('idle', 'ended'); };
    this.listening = true;
    try { rec.start(); } catch (e) { this.listening = false; h.error(String(e)); }
  },
  stop() {
    try { if (this.backend === 'claude') Caps.claudeDictation.stop(); else if (this.rec) this.rec.stop(); } catch (e) { }
  },
  abort() {
    this.h = null;
    if (this.listening) { try { if (this.backend === 'claude') Caps.claudeDictation.stop(); else if (this.rec) this.rec.abort(); } catch (e) { } }
    this.listening = false;
  }
};

/* ---------------- IA conversacional (opcional) ---------------- */
const AI = {
  mode: 'local', fails: 0, disabled: false,
  configure() { this.mode = Caps.server.chat ? 'server' : (Caps.claudeSample ? 'claude' : 'local'); },
  short() { return this.mode === 'local' || this.disabled ? 'Reglas locales' : (this.mode === 'server' ? 'IA API' : 'IA Claude'); },
  active() { return this.mode !== 'local' && !this.disabled && S.settings.useAI; },
  label() {
    if (this.mode === 'local') return 'Reglas locales (sin IA externa)';
    if (this.disabled) return 'IA no disponible ahora · usando reglas locales';
    return this.mode === 'server' ? 'IA vía servidor (API externa)' : 'IA de Claude';
  },
  async complete(prompt) {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000));
    const run = (async () => {
      if (this.mode === 'server') {
        const r = await fetch('api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt }) });
        if (!r.ok) throw new Error('chat ' + r.status);
        return (await r.json()).text;
      }
      const res = await Caps.claudeSample(prompt, { modelTier: 'quick', cache: false });
      return res.text;
    })();
    return Promise.race([run, timeout]);
  },
  async json(prompt) {
    try {
      const t = await this.complete(prompt);
      const m = String(t).match(/\{[\s\S]*\}/);
      const j = JSON.parse(m[0]);
      this.fails = 0;
      return j;
    } catch (e) {
      console.warn('IA', e);
      if (e && (e.code === 'not_granted')) this.disabled = true;
      if (++this.fails >= 2) this.disabled = true;
      App.updateStatus();
      return null;
    }
  }
};
