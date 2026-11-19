// Une src/ en un solo archivo autocontenido: public/index.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const r = f => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const js = ['content.js', 'characters.js', 'engine.js', 'voice.js', 'app.js', 'pronunciation.js'].map(f => `/* ===== ${f} ===== */\n` + r(f)).join('\n');
const html = r('index.html').replace('/*__CSS__*/', () => r('styles.css')).replace('/*__JS__*/', () => js.replace(/<\/script/gi, '<\\/script'));
mkdirSync(new URL('./public/', import.meta.url), { recursive: true });
writeFileSync(new URL('./public/index.html', import.meta.url), html);
console.log('OK → public/index.html (' + Math.round(html.length / 1024) + ' KB)');
