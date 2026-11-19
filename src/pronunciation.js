/* ============================================================
   PRÁCTICA DE PRONUNCIACIÓN
   - Con Azure Speech (servidor /api/pronunciation): califica el AUDIO
     por palabra y por sonido (fonema): precisión, fluidez, completitud.
   - Sin Azure: graba tu voz para que te compares con el modelo y compara
     el texto reconocido. En ese modo NO se evalúa pronunciación y la app
     lo dice en pantalla.
   ============================================================ */

/* ---------- Sonidos difíciles para hispanohablantes ---------- */
const PRACTICE_SETS = [
  { id: 'th', icon: '👅', title: 'La «th»', sub: 'think · this · three',
    tip: 'Saca un poquito la punta de la lengua entre los dientes. En «think» solo sale aire; en «this» la garganta vibra.',
    items: ['think', 'three', 'thank you', 'this', 'mother', 'I think three things are free.', 'This is the thing I thought about.'] },
  { id: 'vb', icon: '🦷', title: 'V contra B', sub: 'very · berry · vote · boat',
    tip: 'Para la V, apoya los dientes de arriba en el labio de abajo y deja vibrar. Para la B, junta los dos labios.',
    items: ['very', 'berry', 'vote', 'boat', 'video', 'I have a very valuable van.', 'Victor visited a big village.'] },
  { id: 'iee', icon: '😁', title: 'I corta e «ee» larga', sub: 'ship · sheep · live · leave',
    tip: 'La «ee» larga se dice sonriendo y tensa (sheep). La «i» corta es relajada y breve, casi entre i y e (ship).',
    items: ['ship', 'sheep', 'live', 'leave', 'sit', 'seat', 'Please sit in this seat.', 'Will you leave or live here?'] },
  { id: 'shch', icon: '🤫', title: 'SH contra CH', sub: 'shoes · choose · wash · watch',
    tip: 'SH es un sonido continuo, como pedir silencio: «shhh». CH empieza con un pequeño golpe de lengua: «t+sh».',
    items: ['shoes', 'choose', 'wash', 'watch', 'share', 'chair', 'She chose cheap shoes.', 'Wash the dishes, then watch TV.'] },
  { id: 'z', icon: '🐝', title: 'La Z que zumba', sub: 'zoo · is · easy · eyes',
    tip: 'La Z inglesa vibra como una abeja: «zzz». También la «s» de «is», «eyes» y «easy» suena así.',
    items: ['zoo', 'easy', 'busy', 'eyes', 'music', 'His zebra is busy.', 'It is easy to choose music.'] },
  { id: 'h', icon: '💨', title: 'La H suave', sub: 'hot · house · happy',
    tip: 'La H inglesa es solo aire suave, como empañar un vidrio. No raspes la garganta como en la «j» de «jamón».',
    items: ['hot', 'house', 'happy', 'hello', 'behind', 'Harry has a happy horse.', 'How hot is your house?'] },
  { id: 'sc', icon: '🏫', title: 'S + consonante', sub: 'school · Spain · student',
    tip: 'No agregues una «e» al principio: es «school», no «eschool». Empieza directo con «sss».',
    items: ['school', 'Spain', 'student', 'street', 'speak', 'Students speak in a small school.', 'Stay on this street.'] },
  { id: 'ed', icon: '⏮️', title: 'Pasado con -ed', sub: 'worked · played · wanted',
    tip: 'La terminación -ed suena «t» (worked), «d» (played) o «id» solo después de t o d (wanted). No digas «work-ed».',
    items: ['worked', 'played', 'wanted', 'watched', 'needed', 'I walked home and watched a movie.', 'She wanted to visit and played music.'] },
  { id: 'r', icon: '🌀', title: 'La R inglesa', sub: 'red · right · car · very',
    tip: 'No vibres la lengua. Llévala un poco hacia atrás sin tocar el paladar y redondea un poco los labios.',
    items: ['red', 'right', 'car', 'world', 'really', 'Rachel runs really fast.', 'The red car is right there.'] },
  { id: 'schwa', icon: '🎵', title: 'Sílabas débiles', sub: 'banana · comfortable · chocolate',
    tip: 'En inglés las sílabas sin acento se relajan y suenan como «uh». «Comfortable» tiene 3 sílabas: CUMF-ter-bul.',
    items: ['banana', 'comfortable', 'chocolate', 'vegetable', 'problem', 'It is a comfortable chocolate cake.', 'Bananas are my favorite vegetable? No, a fruit!'] }
];

/* ---------- Consejos por sonido (alfabeto de Azure SAPI e IPA) ---------- */
const PHONEME_TIPS = {
  th: ['«th» sin voz', 'Lengua entre los dientes y sopla, como en «think».'],
  dh: ['«th» con voz', 'Lengua entre los dientes y deja vibrar la garganta, como en «this».'],
  v: ['V', 'Dientes de arriba sobre el labio de abajo, con vibración.'],
  b: ['B', 'Junta los dos labios y suelta.'],
  ih: ['i corta', 'Relajada y breve, casi entre «i» y «e» (ship, sit).'],
  iy: ['ee larga', 'Sonríe y alárgala: «ee» (sheep, seat).'],
  sh: ['SH', 'Continuo, como pedir silencio: «shhh».'],
  ch: ['CH', 'Golpe corto: «t» + «sh».'],
  jh: ['J inglesa', 'Como «ch» pero con vibración (job, just).'],
  z: ['Z', 'Vibra como abeja: «zzz».'],
  s: ['S', 'Siseo limpio, sin agregar «e» antes.'],
  h: ['H', 'Solo aire suave, sin raspar la garganta.'],
  r: ['R inglesa', 'No la vibres; lengua atrás sin tocar el paladar.'],
  er: ['«er»', 'R suave con la boca casi cerrada (bird, world).'],
  ax: ['vocal débil «uh»', 'Relájala: suena «uh», muy corta.'],
  ah: ['«uh» corta', 'Boca medio abierta y relajada (cup, love).'],
  ae: ['«a» abierta', 'Abre la boca entre «a» y «e» (cat, happy).'],
  aa: ['«a» larga', 'Boca bien abierta (hot, car).'],
  ng: ['NG', 'Termina en la garganta, sin pronunciar la «g» (sing).'],
  t: ['T', 'Golpe con la punta de la lengua; no la omitas al final.'],
  d: ['D', 'Toca detrás de los dientes de arriba; no la omitas al final.'],
  w: ['W', 'Labios redondos como para «u» y abre rápido.'],
  y: ['Y', 'Como «i» rápida al inicio (yes, you).'],
  uh: ['«u» corta', 'Relajada (book, good).'],
  uw: ['«uu» larga', 'Labios redondos y alarga (food, you).'],
  ow: ['«ou»', 'Desliza de «o» a «u» (go, home).'],
  ey: ['«ei»', 'Desliza de «e» a «i» (day, name).'],
  ay: ['«ai»', 'Desliza de «a» a «i» (my, time).'],
  eh: ['«e»', 'Como la «e» española, corta (bed).'],
  l: ['L', 'Al final de palabra, la lengua sube y la L suena oscura (feel).'],
  k: ['K', 'Golpe con aire al inicio (cat).'], p: ['P', 'Suelta aire al inicio (park).'], g: ['G', 'Suave, desde atrás (go).'],
  f: ['F', 'Dientes sobre el labio, solo aire.'], m: ['M', 'Labios juntos.'], n: ['N', 'Punta de la lengua arriba.'],
  zh: ['«zh»', 'Como SH con vibración (vision).'], oy: ['«oi»', 'Desliza de «o» a «i» (boy).'], aw: ['«au»', 'Desliza de «a» a «u» (now).'], ao: ['«o» abierta', 'Boca redonda y abierta (law).']
};
const IPA_TO_SAPI = { 'θ': 'th', 'ð': 'dh', 'ɪ': 'ih', 'i': 'iy', 'iː': 'iy', 'ʃ': 'sh', 'tʃ': 'ch', 'dʒ': 'jh', 'ɹ': 'r', 'ɝ': 'er', 'ɚ': 'er', 'ə': 'ax', 'ʌ': 'ah', 'æ': 'ae', 'ɑ': 'aa', 'ŋ': 'ng', 'j': 'y', 'ʊ': 'uh', 'u': 'uw', 'oʊ': 'ow', 'eɪ': 'ey', 'aɪ': 'ay', 'ɛ': 'eh', 'ʒ': 'zh', 'ɔɪ': 'oy', 'aʊ': 'aw', 'ɔ': 'ao' };
const phKey = p => { const k = String(p || '').toLowerCase(); return PHONEME_TIPS[k] ? k : (IPA_TO_SAPI[p] || k); };
const phTip = p => PHONEME_TIPS[phKey(p)] || [p, ''];

/* ---------- Grabadora: WAV PCM 16 kHz mono ---------- */
const Rec = {
  stream: null, ctx: null, node: null, src: null, chunks: [], rate: 48000, active: false,
  supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext !== false; },
  async start({ onLevel, maxMs = 15000, silenceMs = 1300 } = {}) {
    if (!this.stream) this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC(); this.rate = this.ctx.sampleRate;
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = []; this.active = true;
    let spoke = false, lastVoice = performance.now(); const t0 = performance.now();
    return new Promise(resolve => {
      this._resolve = resolve;
      this.node.onaudioprocess = e => {
        if (!this.active) return;
        const d = new Float32Array(e.inputBuffer.getChannelData(0)); this.chunks.push(d);
        let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
        const rms = Math.sqrt(s / d.length); onLevel && onLevel(rms);
        const now = performance.now();
        if (rms > 0.02) { spoke = true; lastVoice = now; }
        if ((spoke && now - lastVoice > silenceMs) || now - t0 > maxMs) this.stop();
      };
      this.src.connect(this.node); this.node.connect(this.ctx.destination);
    });
  },
  stop() {
    if (!this.active) return; this.active = false;
    try { this.src.disconnect(); this.node.disconnect(); this.ctx.close(); } catch (e) { }
    const len = this.chunks.reduce((a, c) => a + c.length, 0);
    const all = new Float32Array(len); let o = 0; this.chunks.forEach(c => { all.set(c, o); o += c.length; });
    const wav = encodeWav(downsample(trimSilence(all, this.rate), this.rate, 16000), 16000);
    const r = this._resolve; this._resolve = null;
    r && r({ wav, url: URL.createObjectURL(wav), seconds: len / this.rate });
  },
  release() { if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; } }
};
function trimSilence(buf, rate) {
  const win = Math.floor(rate * 0.02), th = 0.012; let a = 0, b = buf.length;
  const rms = (i) => { let s = 0; for (let k = i; k < Math.min(buf.length, i + win); k++) s += buf[k] * buf[k]; return Math.sqrt(s / win); };
  while (a < buf.length && rms(a) < th) a += win;
  while (b > a && rms(Math.max(0, b - win)) < th) b -= win;
  const pad = Math.floor(rate * 0.25);
  return buf.subarray(Math.max(0, a - pad), Math.min(buf.length, b + pad));
}
function downsample(buf, from, to) {
  if (from === to) return buf;
  const ratio = from / to, out = new Float32Array(Math.floor(buf.length / ratio));
  for (let i = 0; i < out.length; i++) { const s = Math.floor(i * ratio), e = Math.min(buf.length, Math.floor((i + 1) * ratio)); let sum = 0; for (let k = s; k < e; k++) sum += buf[k]; out[i] = sum / Math.max(1, e - s); }
  return out;
}
function encodeWav(samples, rate) {
  const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const s = clamp(samples[i], -1, 1); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([b], { type: 'audio/wav' });
}

/* ---------- Evaluación (Azure vía servidor) ---------- */
const Pron = {
  available() { return !!Caps.server.pronunciation && Rec.supported(); },
  label() { return this.available() ? 'Azure Speech: evalúa tu pronunciación' : 'Sin evaluación de pronunciación (falta configurar Azure)'; },
  async assess(wav, referenceText) {
    const r = await fetch('api/pronunciation?text=' + encodeURIComponent(referenceText), { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    return Pron.normalize(j, referenceText);
  },
  normalize(j, ref) {
    if (j.RecognitionStatus && j.RecognitionStatus !== 'Success') return { ok: false, status: j.RecognitionStatus, words: [] };
    const nb = (j.NBest || [])[0] || {};
    const pa = o => (o && (o.PronunciationAssessment || o)) || {};
    const words = (nb.Words || []).map(w => ({
      word: w.Word, score: Math.round(pa(w).AccuracyScore ?? 0), error: pa(w).ErrorType || 'None',
      phonemes: (w.Phonemes || []).map(p => ({ p: p.Phoneme, score: Math.round(pa(p).AccuracyScore ?? 0) }))
    }));
    const s = pa(nb);
    return {
      ok: true, text: nb.Display || j.DisplayText || '', words,
      pron: Math.round(s.PronScore ?? s.AccuracyScore ?? 0), accuracy: Math.round(s.AccuracyScore ?? 0),
      fluency: Math.round(s.FluencyScore ?? 0), completeness: Math.round(s.CompletenessScore ?? 0),
      prosody: s.ProsodyScore != null ? Math.round(s.ProsodyScore) : null
    };
  },
  worst(res) {
    const bad = [];
    res.words.forEach(w => w.phonemes.forEach(p => { if (p.score < 70) bad.push({ ...p, word: w.word }); }));
    bad.sort((a, b) => a.score - b.score);
    return bad[0] || null;
  },
  record(res) {
    // Guarda estadísticas por sonido y palabras débiles para repasar.
    S.pron = S.pron || { attempts: 0, sum: 0, phon: {}, weak: {} };
    S.pron.attempts++; S.pron.sum += res.pron;
    res.words.forEach(w => {
      w.phonemes.forEach(p => { const k = phKey(p.p); const e = S.pron.phon[k] = S.pron.phon[k] || { sum: 0, n: 0 }; e.sum += p.score; e.n++; });
      const k = w.word.toLowerCase();
      if (w.error !== 'Insertion') {
        if (w.score < 70) S.pron.weak[k] = { best: Math.max(S.pron.weak[k]?.best || 0, w.score), last: w.score };
        else if (S.pron.weak[k] && w.score >= 85) delete S.pron.weak[k];
      }
    });
    save();
  }
};
const scoreClass = s => s >= 85 ? 'good' : s >= 65 ? 'mid' : 'bad';

/* ---------- Componente: un intento de pronunciación ----------
   Devuelve { mode:'azure'|'text', score (0..100), res, text, url } */
function pronounceAttempt(container, refText, opts = {}) {
  return new Promise(resolve => {
    const azure = Pron.available();
    const canRec = Rec.supported();
    container.innerHTML = `<div class="answer pron-ans">
      ${opts.label ? `<p class="ans-label">${opts.label}</p>` : ''}
      <div class="ans-live" aria-live="polite">${azure ? 'Toca el micrófono y di la frase. Se detiene solo cuando terminas.' : 'Toca el micrófono y di la frase.'}</div>
      <div class="level"><span></span></div>
      <button class="mic" type="button"><span class="mic-ico" aria-hidden="true"></span><span class="mic-lbl">Toca y habla</span></button>
      <div class="ans-tools"><button type="button" class="link" data-a="repeat">🐢 Escuchar modelo lento</button>${opts.skip ? '<button type="button" class="link" data-a="skip">Saltar</button>' : ''}</div></div>`;
    const live = $('.ans-live', container), mic = $('.mic', container), lvl = $('.level span', container);
    let busy = false, done = false;
    const finish = r => { if (done) return; done = true; $('.answer', container).classList.add('done'); Tutor.mood('idle'); resolve(r); };
    $$('.ans-tools .link', container).forEach(b => b.addEventListener('click', () => { if (b.dataset.a === 'repeat') Voice.speak([en(refText)], { slow: true }); if (b.dataset.a === 'skip') { if (Rec.active) Rec.stop(); finish({ cmd: 'skip' }); } }));
    mic.addEventListener('click', async () => {
      if (busy) { if (Rec.active) Rec.stop(); else if (Ears.listening) Ears.stop(); return; }
      busy = true; Voice.stop(); Voice.unlock(); Tutor.mood('listen');
      mic.classList.add('on'); $('.mic-lbl', mic).textContent = 'Te escucho… toca para terminar'; live.textContent = 'Te escucho…';
      // Sin Azure: además del audio, pedimos el texto reconocido al navegador.
      let heard = '', earsDone = Promise.resolve();
      if (!azure && Ears.available()) {
        earsDone = new Promise(res => {
          Ears.start({ partial: t => { live.innerHTML = `<span class="you">Tú:</span> ${esc(t)}…`; }, final: t => { heard = (heard + ' ' + t).trim(); },
            state: st => { if (st === 'idle') { res(); if (Rec.active) Rec.stop(); } }, error: () => res() });
        });
      }
      let clip = null;
      if (canRec) {
        try { clip = await Rec.start({ onLevel: r => { lvl.style.width = Math.min(100, r * 600) + '%'; } }); }
        catch (e) { live.textContent = 'No se pudo usar el micrófono para grabar (' + (e.name || e.message) + ').'; }
      }
      if (!azure) { if (Ears.listening) Ears.stop(); await Promise.race([earsDone, sleep(2500)]); }
      mic.classList.remove('on'); $('.mic-lbl', mic).textContent = 'Toca y habla'; lvl.style.width = '0%';
      if (azure && clip) {
        if (clip.seconds < 0.4) { live.textContent = 'No te escuché. Intenta otra vez.'; busy = false; Tutor.mood('idle'); return; }
        live.textContent = 'Analizando tu pronunciación…'; Tutor.mood('think');
        try {
          const res = await Pron.assess(clip.wav, refText);
          if (!res.ok) { live.textContent = res.status === 'NoMatch' ? 'No logré reconocer la frase. Habla un poco más fuerte y claro.' : 'No te escuché bien (' + res.status + '). Intenta otra vez.'; busy = false; Tutor.mood('idle'); return; }
          addSpoken(clip.seconds); Pron.record(res);
          live.innerHTML = `<span class="you">Reconocí:</span> ${esc(res.text)}`;
          return finish({ mode: 'azure', score: res.pron, res, text: res.text, url: clip.url });
        } catch (e) { live.textContent = 'No se pudo evaluar (' + e.message + '). Revisa la configuración de Azure.'; busy = false; Tutor.mood('idle'); return; }
      }
      // Modo texto
      const text = heard.trim();
      if (!text && !clip) { live.textContent = 'No te escuché. Intenta otra vez.'; busy = false; Tutor.mood('idle'); return; }
      if (clip) addSpoken(clip.seconds);
      const cmp = text ? compareText(refText, text) : null;
      live.innerHTML = text ? `<span class="you">Tú:</span> ${esc(text)}` : 'Grabé tu voz. Escúchala y compárala con el modelo.';
      finish({ mode: 'text', score: cmp ? Math.round(cmp.ratio * 100) : null, cmp, text, url: clip?.url });
    });
  });
}

function pronResultHTML(r, refText) {
  if (r.mode === 'azure') {
    const res = r.res;
    const ring = (v, label, big) => `<div class="ring ${big ? 'big' : ''} ${scoreClass(v)}" style="--v:${v}"><b>${v}</b><span>${label}</span></div>`;
    return `<div class="pron-res">
      <div class="rings">${ring(res.pron, 'Pronunciación', true)}${ring(res.accuracy, 'Precisión')}${ring(res.fluency, 'Fluidez')}${ring(res.completeness, 'Completitud')}${res.prosody != null ? ring(res.prosody, 'Entonación') : ''}</div>
      <p class="fine">Toca una palabra para ver cada sonido.</p>
      <div class="pron-words">${res.words.map((w, i) => `<button class="pw ${w.error === 'Omission' ? 'omit' : w.error === 'Insertion' ? 'ins' : scoreClass(w.score)}" data-i="${i}">${esc(w.word)}<small>${w.error === 'Omission' ? 'omitida' : w.error === 'Insertion' ? 'de más' : w.score}</small></button>`).join('')}</div>
      <div class="pron-detail" hidden></div>
      <div class="row-btns">${r.url ? `<button class="btn soft sm" data-play="${r.url}">▶ Escucharme</button>` : ''}<button class="btn soft sm" data-model="1">🔊 Modelo</button></div>
      <p class="fine">Evaluado por Azure Speech a partir de tu audio.</p></div>`;
  }
  return `<div class="pron-res">
    ${r.cmp ? diffHTML(r.cmp, 'Coincidencia del texto reconocido') : ''}
    <div class="row-btns">${r.url ? `<button class="btn soft sm" data-play="${r.url}">▶ Escucharme</button>` : ''}<button class="btn soft sm" data-model="1">🔊 Modelo</button></div>
    <p class="notice soft">🔎 Escúchate y compárate con el modelo. <b>En este modo la app no evalúa tu pronunciación</b>: solo compara el texto reconocido. Para evaluar cada sonido, configura Azure Speech (ver README).</p></div>`;
}

function bindPronResult(root, r, refText) {
  $$('[data-play]', root).forEach(b => b.addEventListener('click', () => { Voice.stop(); new Audio(b.dataset.play).play().catch(() => { }); }));
  $$('[data-model]', root).forEach(b => b.addEventListener('click', () => Voice.speak([en(refText)])));
  if (r.mode !== 'azure') return;
  $$('.pw', root).forEach(b => b.addEventListener('click', () => {
    const w = r.res.words[+b.dataset.i];
    $$('.pw', root).forEach(x => x.classList.toggle('sel', x === b));
    const det = $('.pron-detail', root); det.hidden = false;
    const worst = w.phonemes.slice().sort((a, b) => a.score - b.score)[0];
    det.innerHTML = `<div class="row-between"><b>${esc(w.word)}</b><button class="btn soft sm" data-word>🔊 Escuchar «${esc(w.word)}»</button></div>
      <div class="phons">${w.phonemes.map(p => `<span class="ph ${scoreClass(p.score)}" title="${esc(phTip(p.p)[0])}">${esc(phTip(p.p)[0])}<small>${p.score}</small></span>`).join('') || '<span class="muted">Sin detalle por sonido.</span>'}</div>
      ${worst && worst.score < 85 ? `<p class="corr-tip">💡 <b>${esc(phTip(worst.p)[0])}:</b> ${esc(phTip(worst.p)[1])}</p>` : '<p class="good-box">¡Bien dicha!</p>'}`;
    $('[data-word]', det).addEventListener('click', () => Voice.speak([en(w.word)], { slow: true }));
  }));
}

/* ---------- Pantallas ---------- */
SCREENS.practice = () => {
  setScene('studio');
  const P = S.pron || { attempts: 0, sum: 0, phon: {}, weak: {} };
  const best = S.pronBest || {};
  const weakSounds = Object.entries(P.phon).filter(([, v]) => v.n >= 2).map(([k, v]) => ({ k, avg: Math.round(v.sum / v.n) })).sort((a, b) => a.avg - b.avg).slice(0, 4);
  const weakWords = Object.keys(P.weak);
  view(`<div class="card"><p class="eyebrow">Práctica de pronunciación</p><h1>Pura práctica para hablar</h1>
    <p class="muted">Escucha al tutor, repite en voz alta y recibe corrección de cada palabra y cada sonido.</p>
    <div class="notice ${Pron.available() ? 'ok' : ''}">${Pron.available() ? '✅ <b>Evaluación activa (Azure Speech).</b> Califica tu audio: precisión, fluidez y cada sonido.' : '⚠️ <b>Sin evaluación de pronunciación.</b> Puedes practicar, grabarte y compararte con el modelo, pero la app no califica tu pronunciación hasta que configures Azure Speech en el servidor (ver README).'}</div>
    ${P.attempts ? `<div class="stats three"><div class="stat"><span class="s-num">${Math.round(P.sum / P.attempts)}</span><span>Promedio de pronunciación</span></div><div class="stat"><span class="s-num">${P.attempts}</span><span>Intentos evaluados</span></div><div class="stat"><span class="s-num">${weakWords.length}</span><span>Palabras por mejorar</span></div></div>` : ''}
    ${weakSounds.length ? `<h2>Tus sonidos por mejorar</h2><div class="phons">${weakSounds.map(s => `<span class="ph ${scoreClass(s.avg)}">${esc(phTip(s.k)[0])}<small>${s.avg}</small></span>`).join('')}</div>` : ''}
    <h2>Sonidos difíciles para hispanohablantes</h2>
    <div class="set-grid">${PRACTICE_SETS.map(s => `<button class="set-card" data-set="${s.id}"><span class="g-ico">${s.icon}</span><b>${s.title}</b><span class="muted">${s.sub}</span>${best[s.id] != null ? `<span class="pill ${scoreClass(best[s.id])}">Mejor: ${best[s.id]}</span>` : ''}</button>`).join('')}</div>
    <h2>Más práctica</h2>
    <div class="set-grid">
      <button class="set-card" data-set="lessons"><span class="g-ico">🎬</span><b>Frases de mis lecciones</b><span class="muted">Las frases útiles de cada lección</span></button>
      <button class="set-card" data-set="review" ${S.review.length ? '' : 'disabled'}><span class="g-ico">🔁</span><b>Mis frases difíciles</b><span class="muted">${S.review.length} guardadas</span></button>
      <button class="set-card" data-set="weak" ${weakWords.length ? '' : 'disabled'}><span class="g-ico">🎯</span><b>Mis palabras por mejorar</b><span class="muted">${weakWords.length ? weakWords.slice(0, 4).join(', ') : 'Aparecen al practicar'}</span></button>
    </div></div>`);
  $$('[data-set]').forEach(b => b.addEventListener('click', () => App.go('practiceRun', b.dataset.set)));
  const f = App.flow; Tutor.mood('greet');
  run(() => say(f, [es('Aquí practicamos solo pronunciación. Elige un sonido y repite después de mí.')]));
};

function practiceItems(setId) {
  if (setId === 'lessons') {
    const done = LESSONS.filter(l => S.completed[l.id]);
    const src = (done.length ? done : LESSONS.slice(0, 3));
    return { title: 'Frases de mis lecciones', icon: '🎬', tip: '', items: shuffle(src.flatMap(l => l.phrases.map(p => p.en))).slice(0, 8) };
  }
  if (setId === 'review') return { title: 'Mis frases difíciles', icon: '🔁', tip: '', items: S.review.slice(0, 8).map(r => r.en) };
  if (setId === 'weak') return { title: 'Mis palabras por mejorar', icon: '🎯', tip: '', items: Object.keys((S.pron || {}).weak || {}).slice(0, 10) };
  return PRACTICE_SETS.find(s => s.id === setId) || PRACTICE_SETS[0];
}

SCREENS.practiceRun = setId => run(async () => {
  const f = App.flow; setScene('studio');
  const set = practiceItems(setId);
  const items = set.items;
  const scores = [];
  for (let i = 0; i < items.length; i++) {
    const ref = items[i];
    view(`<div class="card"><div class="row-between"><div><p class="eyebrow">${set.icon} ${esc(set.title)} · ${i + 1} de ${items.length}</p></div><button class="btn ghost sm" id="exit">Salir</button></div>
      <div class="progress"><span style="width:${(i / items.length) * 100}%"></span></div>
      ${set.tip ? `<p class="hint-box">💡 ${esc(set.tip)}</p>` : ''}
      <div class="phrase"><p class="p-en">${esc(ref)}</p><div class="row-btns"><button class="btn soft sm" id="pl">🔊 Escuchar</button><button class="btn soft sm" id="ps">🐢 Lento</button></div></div>
      <div id="ans"></div><div id="fb"></div></div>`);
    $('#exit').addEventListener('click', () => App.go('practice'));
    $('#pl').addEventListener('click', () => Voice.speak([en(ref)]));
    $('#ps').addEventListener('click', () => Voice.speak([en(ref)], { slow: true }));
    if (i === 0 && set.tip) await say(f, [es(set.tip)]);
    await say(f, [en(ref)]);
    let best = null;
    for (; ;) {
      const r = await pronounceAttempt($('#ans'), ref, { skip: true }); App.check(f);
      if (r.cmd === 'skip') break;
      $('#fb').innerHTML = pronResultHTML(r, ref) + `<div class="actions"><button class="btn soft" id="again">🔁 Inténtalo de nuevo</button><button class="btn primary" id="next">${i < items.length - 1 ? 'Siguiente' : 'Terminar'}</button></div>`;
      bindPronResult($('#fb'), r, ref);
      if (r.score != null) best = Math.max(best ?? 0, r.score);
      // Retroalimentación hablada del tutor
      if (r.mode === 'azure') {
        const w = Pron.worst(r.res);
        const omitted = r.res.words.find(x => x.error === 'Omission');
        if (r.score >= 85 && !w) { Tutor.mood('celebrate'); run(() => say(f, [en(pick(['Excellent pronunciation!', 'That sounded great!', 'Very clear, well done!']))])); }
        else if (omitted) { Tutor.mood('correct'); run(() => say(f, [es(`Te faltó la palabra «${omitted.word}». Escúchala y dila completa.`), en(ref)], { slow: true })); }
        else if (w) { Tutor.mood('correct'); const t = phTip(w.p); run(() => say(f, [es(`Cuida el sonido ${t[0]} en «${w.word}». ${t[1]}`), en(w.word), en(w.word)], { slow: true })); $('.pw[data-i="' + r.res.words.findIndex(x => x.word === w.word) + '"]', $('#fb'))?.click(); }
        else { Tutor.mood('celebrate'); run(() => say(f, [en('Good! Try once more to make it even smoother.')])); }
      } else {
        Tutor.mood('listen', 1500);
        run(() => say(f, [es('Escúchate y compárate con mi modelo.'), en(ref)]));
      }
      const act = await new Promise(res => { $('#next').addEventListener('click', () => res('next')); $('#again').addEventListener('click', () => res('again')); });
      App.check(f); Voice.stop();
      if (act === 'next') break;
    }
    if (best != null) scores.push(best);
  }
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const azure = Pron.available();
  if (avg != null && azure && PRACTICE_SETS.some(s => s.id === setId)) { S.pronBest = S.pronBest || {}; S.pronBest[setId] = Math.max(S.pronBest[setId] || 0, avg); save(); }
  view(`<div class="card"><div class="done-box"><div class="big-emoji">🎙️</div><h2>¡Práctica terminada!</h2>
    ${avg != null ? `<p>${azure ? 'Pronunciación promedio' : 'Coincidencia de texto promedio'}: <b>${avg}</b></p>` : ''}
    <p class="muted">Tiempo hablado acumulado: ${fmtTime(S.secondsSpoken)}</p></div>
    <div class="actions"><button class="btn primary" id="again">Practicar otra vez</button><button class="btn ghost" id="back">Elegir otro sonido</button></div></div>`);
  $('#again').addEventListener('click', () => App.go('practiceRun', setId));
  $('#back').addEventListener('click', () => App.go('practice'));
  Tutor.mood('celebrate');
  await say(f, [en('Great practice session!')]);
});
