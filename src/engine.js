/* ============================================================
   MOTOR LOCAL: utilidades, correcciones, comparación de frases,
   diálogos de lección y conversación libre, calificación.
   Funciona sin internet ni API. Si hay IA disponible, app.js la usa
   primero y este motor queda como respaldo.
   ============================================================ */

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
const titleCase = s => String(s).trim().split(/\s+/).map(cap).join(' ');
const shorten = (s, n) => { const w = String(s).trim().replace(/[.!?]+$/, '').split(/\s+/); return w.slice(0, n).join(' ').toLowerCase() + (w.length > n ? '…' : ''); };
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wordCount = s => (String(s).trim().match(/[a-záéíóúñü']+/gi) || []).length;

/* ---------- Normalización y comparación de frases ----------
   IMPORTANTE: esto compara el TEXTO que reconoció el micrófono con
   la frase objetivo. No evalúa pronunciación.                   */
const CONTRACTIONS = [
  [/\bi'm\b/g, 'i am'], [/\bcan't\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/\blet's\b/g, 'let us'],
  [/n't\b/g, ' not'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'], [/'s\b/g, ' is']
];
const NUMBERS = { '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten', '12': 'twelve', '50': 'fifty' };

function normalize(s) {
  let t = String(s || '').toLowerCase().replace(/[’`´]/g, "'");
  CONTRACTIONS.forEach(([re, r]) => { t = t.replace(re, r); });
  t = t.replace(/[^a-z0-9áéíóúñü' ]+/g, ' ').replace(/'/g, '');
  return t.split(/\s+/).filter(Boolean).map(w => NUMBERS[w] || w);
}

function compareText(target, said) {
  const a = normalize(target), b = normalize(said);
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ok = new Array(n).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ok[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  const lcs = dp[0][0];
  const ratio = n + m ? (2 * lcs) / (n + m) : 0;
  return { ratio, words: a.map((w, k) => ({ w, ok: ok[k] })), missing: a.filter((w, k) => !ok[k]) };
}

/* ---------- Detección de español / comandos ---------- */
const SP_WORDS = new Set('que de el la los las y es yo mi mis por para pero muy con un una unos unas tengo quiero como cómo donde dónde cuando cuándo porque gracias hola bueno también ella él nosotros estoy está están soy eres fue era lo le les te nos del al este esta eso esto ahí aquí ya más menos sé entiendo puedo hablar inglés español qué decir hacer hay bien sí tiene tienes cuál nada algo'.split(' '));
function spanishRatio(s) {
  const w = String(s).toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  if (!w.length) return 0;
  return w.filter(x => SP_WORDS.has(x)).length / w.length;
}
const isSpanish = s => wordCount(s) >= 2 && spanishRatio(s) >= 0.34;
const isHelpRequest = s => /\b(no entiendo|no entendí|no le entiendo|repite|repítelo|otra vez|what\?|sorry\?|pardon|repeat|i don't understand|i didn't understand|can you repeat|again please|more slowly|slower)\b/i.test(s);

/* ---------- Correcciones (errores típicos de hispanohablantes) ---------- */
const GLOBAL_CORRECTIONS = [
  { re: /\bi have (\w+) years (working|living|studying)\b([^.,!?]*)/i, rep: (m0, n, v, rest) => `I've been ${v}${rest.replace(/\s+$/, '')} for ${n} years`, tip: 'Para algo que sigue pasando: "I\'ve been working here for…".', tag: 'Duración (for / have been)' },
  { re: /\bi (?:have|has) (\d+|[a-z]+(?:-[a-z]+)?) years(?! (?:of|working|living|studying|ago))(?: old)?\b/i, rep: (m0, n) => `I'm ${n} years old`, tip: 'La edad se dice con "to be": "I\'m 30 years old", no con "have".', tag: 'Decir la edad' },
  { re: /\bi have (hungry|thirsty|sleepy|cold|hot)\b/i, rep: (m0, a) => `I'm ${a}`, tip: 'Hambre, sed, frío o sueño van con "to be": "I\'m hungry".', tag: 'Estados con "to be"' },
  { re: /\bi(?:'m| am) agree\b/i, rep: 'I agree', tip: '"Agree" es verbo: se dice "I agree", sin "am".', tag: '"I agree"' },
  { re: /\bpeople is\b/i, rep: 'people are', tip: '"People" es plural: "people are".', tag: 'Concordancia' },
  { re: /\b(he|she|it) don't\b/i, rep: (m0, a) => `${a} doesn't`, tip: 'Con he/she/it se usa "doesn\'t".', tag: 'Tercera persona' },
  { re: /\b(he|she) have\b/i, rep: (m0, a) => `${a} has`, tip: 'Con he/she se usa "has".', tag: 'Tercera persona' },
  { re: /\bexplain me\b/i, rep: 'explain to me', tip: 'Se dice "explain to me" o "explain it to me".', tag: 'Verbos con preposición' },
  { re: /\bthe life is\b/i, rep: 'life is', tip: 'En general no se usa "the": "Life is…".', tag: 'Uso de "the"' },
  { re: /\bi like very much ([a-z ]+)/i, rep: (m0, a) => `I really like ${a}`, tip: 'Más natural: "I really like…" o "I like … a lot".', tag: 'Orden de palabras' },
  { re: /\bmake (a|some) questions?\b/i, rep: (m0, a) => `ask ${a} question${a === 'some' ? 's' : ''}`, tip: 'Preguntas se "hacen" con "ask": "ask a question".', tag: 'Make vs. ask' },
  { re: /\bin the night\b/i, rep: 'at night', tip: 'Se dice "at night".', tag: 'Preposiciones de tiempo' },
  { re: /\bdepends? of\b/i, rep: m0 => m0.replace(/of$/i, 'on'), tip: '"Depend" va con "on": "It depends on…".', tag: 'Verbos con preposición' },
  { re: /\bsince (\w+) (years|months|weeks|days)\b/i, rep: (m0, a, b) => `for ${a} ${b}`, tip: 'Con duración se usa "for": "for three years". "Since" va con un punto de inicio: "since 2020".', tag: 'For vs. since' },
  { re: /\bdidn't (went|saw|did|had|ate|came|bought|took|made|got)\b/i, rep: (m0, v) => `didn't ${({ went: 'go', saw: 'see', did: 'do', had: 'have', ate: 'eat', came: 'come', bought: 'buy', took: 'take', made: 'make', got: 'get' })[v.toLowerCase()]}`, tip: 'Después de "didn\'t" el verbo va en forma base: "I didn\'t go".', tag: 'Pasado negativo' },
  { re: /\b(could|can|should|would|will|must|might) to (\w+)/i, rep: (m0, a, b) => `${a} ${b}`, tip: `Después de can/could/should no va "to".`, tag: 'Verbos modales' },
  { re: /\bsuggest you to (\w+)/i, rep: (m0, a) => `suggest that you ${a}`, tip: 'Se dice "I suggest that you…" o "I suggest + -ing".', tag: 'Suggest / recommend' },
  { re: /\brecommend you to (\w+)/i, rep: (m0, a) => `recommend that you ${a}`, tip: 'Se dice "I recommend that you…" o "I recommend + -ing".', tag: 'Suggest / recommend' },
  { re: /\bmore (better|worse|bigger|easier|cheaper|faster)\b/i, rep: (m0, a) => a, tip: '"Better", "bigger"… ya son comparativos: no lleva "more".', tag: 'Comparativos' },
  { re: /\bhow (it|this|that) is called\b/i, rep: (m0, a) => `what ${a} is called`, tip: 'Se pregunta "What is it called?"', tag: 'Preguntas' },
  { re: /\bi(?:'m| am) boring\b/i, rep: "I'm bored", tip: '"I\'m bored" = estoy aburrido. "I\'m boring" = soy aburrido.', tag: 'Bored vs. boring' },
  { re: /\b(go|went|going|come|came|get|got|arrive|arrived) to home\b/i, rep: (m0, a) => `${a} home`, tip: 'Con "home" no se usa "to": "go home".', tag: 'Go home' },
  { re: /\bassist(?:ed)? to\b/i, rep: m0 => /ed/i.test(m0) ? 'attended' : 'attend', tip: 'Asistir a un evento = "attend". "Assist" significa ayudar.', tag: 'Falsos amigos' },
  { re: /^(is|was) (very|so|really|too|a|an|good|nice|great|bad|delicious|fun|interesting|expensive|cheap|far|close|easy|hard)\b/i, rep: (m0, a, b) => `It ${a.toLowerCase()} ${b}`, tip: 'En inglés siempre va el sujeto: "It\'s very good".', tag: 'Sujeto obligatorio' }
];

function tidy(s) {
  let t = String(s).trim().replace(/\s+/g, ' ');
  t = t.replace(/\bi\b/g, 'I').replace(/\bi'(m|d|ve|ll)\b/g, "I'$1");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?…]$/.test(t)) t += /^(can|could|would|do|does|is|are|what|where|how|when|why|who|may|should)\b/i.test(t) ? '?' : '.';
  return t;
}

function applyCorrections(text, extra = []) {
  let t = String(text || '').trim();
  if (!t) return null;
  const tips = [], tags = [];
  for (const rule of [...extra, ...GLOBAL_CORRECTIONS]) {
    const re = new RegExp(rule.re.source, rule.re.flags.replace('g', ''));
    if (re.test(t)) {
      const before = t;
      t = t.replace(re, typeof rule.rep === 'function' ? rule.rep : () => rule.rep);
      if (t !== before) { tips.push(rule.tip); tags.push(rule.tag); }
    }
  }
  if (!tips.length) return null;
  return { said: text.trim(), natural: tidy(t), tip_es: tips.join(' '), tags };
}

/* ---------- Relleno de plantillas: {slot}, {Slot}, {slot|predeterminado} ---------- */
function fill(tpl, vars) {
  return String(tpl).replace(/\{(\w+)(?:\|([^}]*))?\}/g, (m0, k, def) => {
    const low = k.charAt(0).toLowerCase() + k.slice(1);
    let v = vars[k] ?? vars[low];
    if (v === undefined || v === null || v === '') v = def ?? '';
    if (/^[A-Z]/.test(k) && v) v = String(v).charAt(0).toUpperCase() + String(v).slice(1);
    return v;
  }).replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1');
}

/* ---------- Diálogo de lección (motor local) ---------- */
class LessonDialog {
  constructor(lesson, ctx) {
    this.lesson = lesson; this.ctx = ctx;
    this.turns = lesson.conversation.turns.filter(t => !t.minLevel || ctx.levelIdx + 1 >= t.minLevel);
    this.i = 0; this.retries = 0;
    this.slots = { tutor: ctx.tutorName, user: ctx.userName || '' };
  }
  get current() { return this.turns[this.i]; }
  question(simple = false) {
    const t = this.current; if (!t) return '';
    return fill((simple || this.ctx.levelIdx === 0) && t.simple ? t.simple : t.ask, this.slots);
  }
  opening() { return fill(this.lesson.conversation.opening, this.slots) + ' ' + this.question(); }
  respond(text) {
    const t = this.current;
    const correction = applyCorrections(text, this.lesson.corrections || []);
    if (!t) return { reply: fill(this.lesson.conversation.closing, this.slots), end: true, correction };
    if (isHelpRequest(text)) return { reply: 'No problem. ' + this.question(true), hint_es: t.hint, model: t.model, correction: null, help: true };
    if (isSpanish(text)) return { reply: `Try it in English. You can say: ${t.model}`, hint_es: 'Intenta decirlo en inglés. ' + (t.hint || ''), model: t.model, correction: null, help: true };
    let exp = null, m = null;
    for (const e of t.expect || []) { m = text.match(e.re); if (m) { exp = e; break; } }
    if (!exp) {
      if ((t.expect || []).length && this.retries < 1) {
        this.retries++;
        return { reply: "Sorry, I didn't quite get that. " + this.question(true), hint_es: t.hint, model: t.model, correction, retry: true };
      }
      if (t.anySlots) Object.entries(t.anySlots).forEach(([k, v]) => { if (!this.slots[k]) this.slots[k] = v; });
      exp = { reply: t.any || 'Okay.' };
    }
    if (exp.slot) this.slots[exp.slot] = exp.val ? exp.val(m, text) : (m[1] || m[0]).trim();
    if (exp.slot === 'name' && this.slots.name) this.ctx.learnedName = this.slots.name;
    this.retries = 0; this.i++;
    const ack = fill(exp.reply, this.slots);
    if (this.i >= this.turns.length) return { reply: ack + ' ' + fill(this.lesson.conversation.closing, this.slots), end: true, correction };
    return { reply: ack + ' ' + this.question(), correction };
  }
}

/* ---------- Conversación libre (motor local) ---------- */
function detectCategories(text) {
  const t = ' ' + String(text).toLowerCase().replace(/[^a-záéíóúñü' -]+/g, ' ') + ' ';
  const hits = [];
  for (const [cat, words] of Object.entries(LEXICON)) {
    for (const w of words) if (t.includes(' ' + w + ' ')) { hits.push({ cat, w }); break; }
  }
  return hits;
}
function feeling(text) {
  const w = String(text).toLowerCase().match(/[a-z]+/g) || [];
  const neg = /\b(not|don't|isn't|wasn't)\s+(good|great|fine|happy|fun)\b/i.test(text);
  if (neg || w.some(x => FEELINGS.negative.includes(x))) return 'negative';
  if (w.some(x => FEELINGS.positive.includes(x))) return 'positive';
  return null;
}

class FreeDialog {
  constructor(topicId, ctx, maxTurns) {
    this.topic = FREE_TOPICS.find(t => t.id === topicId) || FREE_TOPICS[1];
    this.ctx = ctx; this.qi = 0; this.turn = 0; this.used = new Set(); this.facts = []; this.referenced = false;
    this.maxTurns = maxTurns || [5, 6, 7, 8, 9][ctx.levelIdx] || 6;
    this.bank = ctx.levelIdx <= 1 ? this.topic.qA : this.topic.qB;
    this.lastQuestion = '';
  }
  nextTopicQuestion() {
    const q = this.bank[this.qi % this.bank.length]; this.qi++; return q;
  }
  opening() {
    const hi = this.ctx.userName ? `Hi, ${this.ctx.userName}!` : 'Hi!';
    this.lastQuestion = this.nextTopicQuestion();
    return `${hi} ${this.lastQuestion}`;
  }
  respond(text) {
    const correction = applyCorrections(text);
    if (isHelpRequest(text)) return { reply: 'Sure, let me say it again. ' + this.lastQuestion, help: true, slow: true, correction: null };
    if (isSpanish(text)) return { reply: `Let's try in English. ${this.lastQuestion}`, hint_es: 'Intenta responder en inglés, aunque sea con pocas palabras.', help: true, correction: null };
    this.turn++;
    const cats = detectCategories(text);
    const fresh = cats.find(c => !this.used.has(c.w));
    const feel = feeling(text);
    let ack;
    if (feel && (!fresh || Math.random() < 0.5)) ack = pick(ACKS[feel]);
    else if (fresh) ack = pick(ACKS[fresh.cat]);
    else if (wordCount(text) <= 2 && /^(yes|yeah|yep|sure|no|nope|not really|maybe)\b/i.test(text.trim())) ack = /^n/i.test(text.trim()) ? 'Okay, fair enough.' : 'Cool.';
    else ack = pick(ACKS.generic);
    if (this.turn >= this.maxTurns) {
      const ref = this.facts.length ? ` I really enjoyed hearing about ${this.facts[0].w}.` : '';
      return { reply: fill(ack, { w: fresh?.w, W: fresh ? titleCase(fresh.w) : '' }) + ref + ' Great conversation! You did really well today.', end: true, correction };
    }
    let q;
    if (fresh && Math.random() < 0.75) {
      this.used.add(fresh.w); this.facts.push(fresh);
      q = pick(FOLLOWUPS[fresh.cat]);
    } else if (!this.referenced && this.facts.length && this.turn >= 3) {
      this.referenced = true;
      const f = this.facts[0];
      q = `Earlier you mentioned ${f.cat === 'place' ? titleCase(f.w) : f.w}. ` + this.nextTopicQuestion();
    } else q = this.nextTopicQuestion();
    if (fresh) this.used.add(fresh.w);
    const vars = { w: fresh?.w || '', W: fresh ? titleCase(fresh.w) : '' };
    this.lastQuestion = fill(q, vars);
    return { reply: fill(ack, vars).replace(/\?/g, '.') + ' ' + this.lastQuestion, correction };
  }
}

/* ---------- Calificación de respuestas abiertas (heurística) ----------
   Califica contenido y gramática del TEXTO, no la pronunciación. */
function scoreOpen(text, { minWords = 6, expect = null } = {}) {
  const wc = wordCount(text);
  if (!wc) return { score: 0, note: 'sin respuesta' };
  if (spanishRatio(text) >= 0.3) return { score: 0.1, note: 'respondió en español' };
  const len = Math.min(1, wc / minWords);
  const kw = expect ? (expect.test(text) ? 1 : 0.45) : 0.8;
  const corr = applyCorrections(text);
  const penalty = corr ? Math.min(0.3, corr.tags.length * 0.12) : 0;
  const score = clamp(0.55 * len + 0.45 * kw - penalty, 0, 1);
  return { score, corrections: corr };
}

/* ---------- Prompts para IA (si está configurada) ---------- */
function promptConversation({ tutorName, level, scenario, role, goals, history, said, turn, maxTurns }) {
  return `You are ${tutorName}, a warm, encouraging English conversation tutor inside a language-learning app for Mexican Spanish speakers.
Student CEFR level (estimated): ${level}. Adapt vocabulary and sentence length to that level (A1/A2: very short, simple words).
Scenario: ${scenario}
Your role in the scene: ${role}
${goals ? 'Things to cover, in order (one per turn): ' + goals.join(' | ') : ''}

Rules:
- Reply ONLY in English, max 2 short sentences, reacting specifically to what the student just said and remembering earlier details.
- End with exactly ONE question (never two), unless you are closing the conversation.
- If the student's sentence has a clear grammar error or sounds unnatural, include a correction. Ignore capitalization and punctuation (the text comes from speech recognition). Do not invent errors. If nothing meaningful to correct, correction = null.
- "tip_es": brief explanation in Mexican Spanish, max 20 words.
- Never claim to evaluate pronunciation.
- This is turn ${turn} of about ${maxTurns}. When the goals are covered or the turn limit is reached, set "end": true and close kindly with no question.

Conversation so far:
${history.map(h => (h.role === 'tutor' ? 'Tutor: ' : 'Student: ') + h.text).join('\n')}
Student just said: "${said.replace(/"/g, "'")}"

Respond ONLY with JSON, no other text:
{"reply":"...","correction":null or {"natural":"...","tip_es":"..."},"end":false}`;
}

function promptScore({ question, answer, level }) {
  return `You are rating a short spoken answer (transcribed by speech recognition) in an English placement test for Spanish speakers.
Question: "${question}"
Answer: "${answer.replace(/"/g, "'")}"
Current estimated level: ${level}.
Rate how well the answer communicates a relevant response, considering grammar, vocabulary range and length. Ignore capitalization/punctuation. Do NOT judge pronunciation.
Respond ONLY with JSON: {"score": number between 0 and 1, "cefr": "A1"|"A2"|"B1"|"B2"|"C1", "tag_es": "short Spanish phrase naming the main thing to improve, or empty"}`;
}
