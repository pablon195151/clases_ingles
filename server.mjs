// Servidor opcional (Node 18+, sin dependencias).
// - Sirve la app (public/index.html).
// - /api/config : le dice a la app qué APIs externas están activas.
// - /api/chat   : conversación con IA (Anthropic Claude). Requiere ANTHROPIC_API_KEY.
// - /api/tts    : voz neuronal (OpenAI Text-to-Speech). Requiere OPENAI_API_KEY.
// Las llaves viven solo aquí, nunca en el navegador.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

// Carga .env sencillo (CLAVE=valor)
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const PORT = +process.env.PORT || 8080;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const VOICES = {
  fox: process.env.VOICE_FOX || 'ash',
  owl: process.env.VOICE_OWL || 'sage',
  musician: process.env.VOICE_MUSICIAN || 'coral',
  npc: process.env.VOICE_NPC || 'alloy'
};
const PUBLIC = join(process.cwd(), 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

const readBody = req => new Promise((res, rej) => {
  let d = ''; req.on('data', c => { d += c; if (d.length > 100_000) { rej(new Error('too large')); req.destroy(); } });
  req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { rej(e); } });
});
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

async function chat({ prompt }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 400, messages: [{ role: 'user', content: String(prompt).slice(0, 12000) }] })
  });
  if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + (await r.text()).slice(0, 300));
  const j = await r.json();
  return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

async function tts({ text, voice, lang, speed }) {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + OPENAI_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL, voice: VOICES[voice] || VOICES.npc, input: String(text).slice(0, 1000), format: 'mp3',
      speed: Math.max(0.5, Math.min(1.5, +speed || 1)),
      instructions: lang === 'es' ? 'Habla en español de México, cálido y claro.' : 'Speak clear, friendly American English for a language learner.'
    })
  });
  if (!r.ok) throw new Error('OpenAI TTS ' + r.status + ': ' + (await r.text()).slice(0, 300));
  return Buffer.from(await r.arrayBuffer());
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/config') return json(res, 200, { chat: !!ANTHROPIC_KEY, tts: !!OPENAI_KEY });
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      if (!ANTHROPIC_KEY) return json(res, 503, { error: 'ANTHROPIC_API_KEY no configurada' });
      return json(res, 200, { text: await chat(await readBody(req)) });
    }
    if (url.pathname === '/api/tts' && req.method === 'POST') {
      if (!OPENAI_KEY) return json(res, 503, { error: 'OPENAI_API_KEY no configurada' });
      const audio = await tts(await readBody(req));
      res.writeHead(200, { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' }); return res.end(audio);
    }
    // Archivos estáticos
    let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[\/\\])+/, '');
    if (p === '/' || p === '\\') p = '/index.html';
    const file = join(PUBLIC, p);
    if (!file.startsWith(PUBLIC) || !existsSync(file)) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch (e) {
    console.error(e.message);
    json(res, 500, { error: e.message });
  }
}).listen(PORT, () => {
  console.log(`\n  Charla lista en  http://localhost:${PORT}\n`);
  console.log(`  IA conversacional (Anthropic): ${ANTHROPIC_KEY ? 'activa · ' + ANTHROPIC_MODEL : 'no configurada → reglas locales'}`);
  console.log(`  Voz neuronal (OpenAI TTS):     ${OPENAI_KEY ? 'activa · ' + OPENAI_TTS_MODEL : 'no configurada → voz del navegador'}\n`);
});
