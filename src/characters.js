/* ============================================================
   PERSONAJES ORIGINALES (SVG animable) y ESCENARIOS
   Partes con clase:
   .ch-root  .ch-head  .ch-arm  .ch-eyes  .ch-pupils  .ch-brows
   .ch-mouth-open (se abre con la variable CSS --m, 0..1)
   .ch-fx-* (efectos: escuchar, pensar, celebrar, corregir)
   ============================================================ */

const FX_SVG = `
  <g class="ch-fx ch-fx-listen">
    <path d="M182 78 q10 14 0 28" /><path d="M192 70 q16 22 0 44" /><path d="M202 62 q22 30 0 60" />
  </g>
  <g class="ch-fx ch-fx-think">
    <circle cx="176" cy="44" r="5"/><circle cx="190" cy="28" r="7"/><circle cx="206" cy="10" r="9"/>
  </g>
  <g class="ch-fx ch-fx-celebrate">
    <rect x="20" y="40" width="8" height="8" fill="#FFC94D" transform="rotate(20 24 44)"/>
    <rect x="190" y="30" width="8" height="8" fill="#FF6B4A" transform="rotate(-25 194 34)"/>
    <rect x="40" y="10" width="7" height="7" fill="#14B8A6"/>
    <circle cx="172" cy="12" r="4" fill="#5B3E96"/>
    <circle cx="14" cy="100" r="4" fill="#FF6B4A"/>
    <rect x="200" y="96" width="7" height="7" fill="#FFC94D" transform="rotate(35 203 99)"/>
  </g>
  <g class="ch-fx ch-fx-correct">
    <circle cx="34" cy="40" r="17" fill="#FFF" stroke="#14B8A6" stroke-width="3"/>
    <path d="M26 41 l6 6 l11 -13" fill="none" stroke="#14B8A6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

function foxSVG() {
  return `<svg viewBox="0 0 220 260" class="ch-svg" role="img" aria-label="Fito, el zorro">
  <g class="ch-root">
    <ellipse cx="110" cy="252" rx="64" ry="7" fill="rgba(0,0,0,.16)"/>
    <g class="ch-tail">
      <path d="M146 214 C206 210 220 146 188 118 C184 160 166 178 138 186 Z" fill="#EE7A2E"/>
      <path d="M188 118 C204 134 203 152 196 164 C188 152 184 136 188 118Z" fill="#FFF4E8"/>
    </g>
    <g class="ch-body">
      <path d="M62 252 C56 204 76 166 110 166 C144 166 164 204 158 252 Z" fill="#EE7A2E"/>
      <path d="M88 252 C86 218 96 192 110 192 C124 192 134 218 132 252 Z" fill="#FFF4E8"/>
      <path d="M74 168 Q110 192 146 168 L150 184 Q110 210 70 184 Z" fill="#14A39A"/>
      <path d="M128 186 l10 30 l-14 -4 z" fill="#0F8079"/>
    </g>
    <path d="M72 196 Q56 214 64 238" stroke="#E06B22" stroke-width="15" stroke-linecap="round" fill="none"/>
    <g class="ch-arm">
      <path d="M148 194 Q174 178 182 148" stroke="#EE7A2E" stroke-width="15" stroke-linecap="round" fill="none"/>
      <circle cx="182" cy="145" r="10" fill="#3A2A22"/>
    </g>
    <g class="ch-head">
      <path d="M60 74 L50 16 L100 52 Z" fill="#EE7A2E"/><path d="M65 64 L59 32 L88 55Z" fill="#3A2A22"/>
      <path d="M160 74 L170 16 L120 52 Z" fill="#EE7A2E"/><path d="M155 64 L161 32 L132 55Z" fill="#3A2A22"/>
      <path d="M48 92 C48 56 78 40 110 40 C142 40 172 56 172 92 C172 128 142 158 110 166 C78 158 48 128 48 92Z" fill="#EE7A2E"/>
      <path d="M56 102 Q84 116 110 110 Q136 116 164 102 Q154 150 110 166 Q66 150 56 102Z" fill="#FFF4E8"/>
      <g class="ch-brows" stroke="#3A2A22" stroke-width="4" stroke-linecap="round" fill="none">
        <path class="ch-brow-l" d="M74 72 Q85 65 96 71"/><path class="ch-brow-r" d="M124 71 Q135 65 146 72"/>
      </g>
      <g class="ch-eyes">
        <ellipse cx="86" cy="90" rx="8" ry="10" fill="#2A1C15"/><ellipse cx="134" cy="90" rx="8" ry="10" fill="#2A1C15"/>
        <g class="ch-pupils" fill="#fff"><circle cx="89" cy="86" r="3"/><circle cx="137" cy="86" r="3"/></g>
      </g>
      <circle cx="70" cy="114" r="7" fill="#FF8FA3" opacity=".45"/><circle cx="150" cy="114" r="7" fill="#FF8FA3" opacity=".45"/>
      <ellipse cx="110" cy="116" rx="9" ry="6" fill="#2A1C15"/>
      <g class="ch-mouth">
        <path class="ch-mouth-closed" d="M98 131 Q110 139 122 131" stroke="#2A1C15" stroke-width="3" fill="none" stroke-linecap="round"/>
        <g class="ch-mouth-open"><ellipse cx="110" cy="131" rx="12" ry="10" fill="#7A1F2B"/><ellipse cx="110" cy="137" rx="7" ry="4" fill="#F07888"/></g>
      </g>
    </g>
    ${FX_SVG}
  </g></svg>`;
}

function owlSVG() {
  return `<svg viewBox="0 0 220 260" class="ch-svg" role="img" aria-label="Olivia, la búho">
  <g class="ch-root">
    <ellipse cx="110" cy="252" rx="62" ry="7" fill="rgba(0,0,0,.16)"/>
    <g class="ch-body">
      <ellipse cx="110" cy="186" rx="62" ry="66" fill="#6F52A1"/>
      <ellipse cx="110" cy="198" rx="40" ry="46" fill="#EDE3FA"/>
      <g fill="none" stroke="#C9B6EA" stroke-width="3" stroke-linecap="round">
        <path d="M92 178 q6 6 12 0 q6 6 12 0 q6 6 12 0"/><path d="M88 198 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0"/><path d="M92 218 q6 6 12 0 q6 6 12 0 q6 6 12 0"/>
      </g>
      <ellipse cx="92" cy="250" rx="12" ry="5" fill="#F5A623"/><ellipse cx="128" cy="250" rx="12" ry="5" fill="#F5A623"/>
      <path d="M94 154 L110 164 L126 154 L126 170 L110 162 L94 170 Z" fill="#14A39A"/>
    </g>
    <path d="M52 176 Q36 206 58 232 Q62 200 66 178 Z" fill="#5A4189"/>
    <g class="ch-arm"><path d="M168 176 Q196 150 192 120 Q176 146 156 166 Z" fill="#5A4189"/></g>
    <g class="ch-head">
      <path d="M58 54 L44 14 L88 40 Z" fill="#7E61B3"/><path d="M162 54 L176 14 L132 40 Z" fill="#7E61B3"/>
      <ellipse cx="110" cy="92" rx="72" ry="60" fill="#7E61B3"/>
      <circle cx="84" cy="92" r="28" fill="#F6F0FF"/><circle cx="136" cy="92" r="28" fill="#F6F0FF"/>
      <g class="ch-eyes">
        <circle cx="84" cy="92" r="14" fill="#2A1C3A"/><circle cx="136" cy="92" r="14" fill="#2A1C3A"/>
        <g class="ch-pupils" fill="#fff"><circle cx="89" cy="86" r="4.5"/><circle cx="141" cy="86" r="4.5"/></g>
      </g>
      <g fill="none" stroke="#33254F" stroke-width="4"><circle cx="84" cy="92" r="30"/><circle cx="136" cy="92" r="30"/><path d="M106 90 q4 -4 8 0"/></g>
      <g class="ch-brows" stroke="#33254F" stroke-width="5" stroke-linecap="round" fill="none">
        <path class="ch-brow-l" d="M66 54 Q82 46 98 52"/><path class="ch-brow-r" d="M122 52 Q138 46 154 54"/>
      </g>
      <g class="ch-mouth">
        <g class="ch-mouth-open"><ellipse cx="110" cy="128" rx="8" ry="8" fill="#5B1A2B"/></g>
        <path d="M99 112 L121 112 L110 128 Z" fill="#F5A623"/>
        <path class="ch-beak-low" d="M103 122 L117 122 L110 134 Z" fill="#D9870F"/>
      </g>
    </g>
    ${FX_SVG}
  </g></svg>`;
}

function musicianSVG() {
  return `<svg viewBox="0 0 220 260" class="ch-svg" role="img" aria-label="Lía Vox, artista musical">
  <g class="ch-root">
    <ellipse cx="110" cy="252" rx="64" ry="7" fill="rgba(0,0,0,.16)"/>
    <g class="ch-head-back"><path d="M40 104 C30 40 80 24 112 26 C150 24 192 46 182 110 C190 150 170 170 150 168 L70 168 C48 170 30 150 40 104Z" fill="#5E35A0"/></g>
    <g class="ch-body">
      <path d="M58 252 C56 206 74 172 110 172 C146 172 164 206 162 252 Z" fill="#14A39A"/>
      <path d="M96 172 L110 206 L124 172 Z" fill="#FFF8F0"/>
      <path d="M142 196 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 z" fill="#FFC94D"/>
      <path d="M80 168 Q110 186 140 168" stroke="#2B2B3A" stroke-width="8" fill="none" stroke-linecap="round"/>
      <rect x="66" y="156" width="18" height="24" rx="8" fill="#2B2B3A"/><rect x="136" y="156" width="18" height="24" rx="8" fill="#2B2B3A"/>
    </g>
    <path d="M70 196 Q54 216 62 240" stroke="#B9824F" stroke-width="14" stroke-linecap="round" fill="none"/>
    <g class="ch-arm">
      <path d="M150 198 Q176 182 180 152" stroke="#B9824F" stroke-width="14" stroke-linecap="round" fill="none"/>
      <rect x="174" y="124" width="10" height="30" rx="4" fill="#2B2B3A"/>
      <circle cx="179" cy="120" r="11" fill="#9AA3B5"/><path d="M170 116 h18 M170 122 h18" stroke="#6C7488" stroke-width="2"/>
    </g>
    <g class="ch-head">
      <rect x="98" y="138" width="24" height="24" rx="8" fill="#B9824F"/>
      <circle cx="110" cy="94" r="52" fill="#C68F5C"/>
      <path d="M58 92 C56 52 86 36 112 38 C142 36 168 56 162 84 C146 70 130 58 106 62 C90 72 74 74 58 92Z" fill="#6B3FB0"/>
      <circle cx="58" cy="106" r="4" fill="#FFC94D"/><circle cx="162" cy="106" r="4" fill="#FFC94D"/>
      <g class="ch-brows" stroke="#3B2440" stroke-width="4" stroke-linecap="round" fill="none">
        <path class="ch-brow-l" d="M78 80 Q88 74 98 79"/><path class="ch-brow-r" d="M122 79 Q132 74 142 80"/>
      </g>
      <g class="ch-eyes">
        <ellipse cx="88" cy="96" rx="7" ry="9" fill="#2A1C20"/><ellipse cx="132" cy="96" rx="7" ry="9" fill="#2A1C20"/>
        <g class="ch-pupils" fill="#fff"><circle cx="90" cy="92" r="2.6"/><circle cx="134" cy="92" r="2.6"/></g>
      </g>
      <path d="M80 89 l-5 -4 M140 89 l5 -4" stroke="#2A1C20" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="76" cy="116" r="7" fill="#E9707F" opacity=".35"/><circle cx="144" cy="116" r="7" fill="#E9707F" opacity=".35"/>
      <path d="M108 104 q3 8 -2 10" stroke="#9C6A3E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <g class="ch-mouth">
        <path class="ch-mouth-closed" d="M98 124 Q110 132 122 124" stroke="#8A2E3B" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <g class="ch-mouth-open"><ellipse cx="110" cy="125" rx="11" ry="9" fill="#6E1E2C"/><ellipse cx="110" cy="130" rx="6" ry="3.5" fill="#F07888"/></g>
      </g>
    </g>
    ${FX_SVG}
  </g></svg>`;
}

const CHARACTERS = {
  fox: { id: 'fox', name: 'Fito', species: 'Zorro', svg: foxSVG, claudeVoice: 'rounded', pitch: 0.95,
    tagline: 'Curioso y bromista. Te reta a hablar desde el primer minuto.',
    hello_es: '¡Hola! Soy Fito. Voy a ser tu tutor de inglés.', hello_en: "Hi! I'm Fito. Let's speak English together!" },
  owl: { id: 'owl', name: 'Olivia', species: 'Búho', svg: owlSVG, claudeVoice: 'airy', pitch: 1.15,
    tagline: 'Paciente y precisa. Te explica todo con calma.',
    hello_es: '¡Hola! Soy Olivia. Vamos a aprender inglés paso a paso.', hello_en: "Hello! I'm Olivia. I can't wait to hear you speak!" },
  musician: { id: 'musician', name: 'Lía Vox', species: 'Artista musical (ficticia)', svg: musicianSVG, claudeVoice: 'glassy', pitch: 1.08,
    tagline: 'Cantante inventada. Aprende con ritmo y buena vibra.',
    hello_es: '¡Hola! Soy Lía Vox. Vamos a practicar inglés con mucho ritmo.', hello_en: "Hey! I'm Lía. Let's make English sound like music!" }
};

/* ---------------- ESCENARIOS DE FONDO ---------------- */
function sceneSVG(id) {
  const wrap = (bg, inner) => `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><rect width="400" height="300" fill="${bg}"/>${inner}</svg>`;
  switch (id) {
    case 'cafe': return wrap('#F7E4CB', `
      <rect x="250" y="40" width="110" height="90" rx="8" fill="#BFE6F0" stroke="#8B5A3C" stroke-width="6"/>
      <path d="M305 40 v90 M250 85 h110" stroke="#8B5A3C" stroke-width="4"/>
      <rect x="30" y="60" width="150" height="6" fill="#8B5A3C"/><rect x="30" y="110" width="150" height="6" fill="#8B5A3C"/>
      <g fill="#FFF8F0" stroke="#8B5A3C" stroke-width="3"><rect x="44" y="38" width="20" height="22" rx="3"/><rect x="78" y="42" width="18" height="18" rx="3"/><rect x="112" y="36" width="22" height="24" rx="3"/><rect x="56" y="88" width="20" height="22" rx="3"/><rect x="104" y="90" width="26" height="20" rx="3"/></g>
      <rect x="0" y="210" width="400" height="90" fill="#8B5A3C"/><rect x="0" y="204" width="400" height="12" fill="#A86E4A"/>
      <text x="40" y="168" font-family="Baloo 2, sans-serif" font-size="22" fill="#8B5A3C" opacity=".8">Cloud Café</text>`);
    case 'airport': return wrap('#DDEBF5', `
      <rect x="0" y="30" width="400" height="150" fill="#A9D4F2"/>
      <path d="M0 30 h400 M100 30 v150 M200 30 v150 M300 30 v150" stroke="#6E8BA3" stroke-width="5"/>
      <path d="M210 90 l70 -6 l20 -18 l8 0 l-8 20 l40 -2 l8 -10 l6 0 l-4 14 l-74 10 l-22 24 l-8 0 l10 -22 z" fill="#FFFFFF" opacity=".9"/>
      <rect x="24" y="44" width="120" height="70" rx="6" fill="#1D2B36"/>
      <g fill="#FFC94D"><rect x="34" y="56" width="60" height="5"/><rect x="34" y="70" width="80" height="5"/><rect x="34" y="84" width="50" height="5"/><rect x="34" y="98" width="70" height="5"/></g>
      <rect x="0" y="210" width="400" height="90" fill="#B8C4CE"/><path d="M0 240 h400 M0 270 h400" stroke="#A5B2BD" stroke-width="2"/>`);
    case 'office': return wrap('#E6EEF4', `
      <rect x="230" y="34" width="140" height="110" rx="6" fill="#BFD9EE" stroke="#8FA6B8" stroke-width="5"/>
      <g fill="#8FA6B8"><rect x="240" y="96" width="18" height="48"/><rect x="262" y="76" width="22" height="68"/><rect x="290" y="106" width="16" height="38"/><rect x="312" y="66" width="24" height="78"/><rect x="342" y="92" width="20" height="52"/></g>
      <rect x="40" y="150" width="34" height="56" rx="6" fill="#E07A5F"/><path d="M57 150 C40 120 30 110 34 96 C48 104 56 120 57 150 C60 118 70 104 84 100 C84 116 72 132 57 150" fill="#2F9E6E"/>
      <rect x="0" y="206" width="400" height="94" fill="#C7D3DD"/><rect x="120" y="190" width="200" height="16" rx="4" fill="#8B6B4E"/>`);
    case 'street': return wrap('#CFEAF7', `
      <circle cx="340" cy="50" r="22" fill="#FFD866"/>
      <g><rect x="10" y="70" width="80" height="140" fill="#F28B66"/><rect x="96" y="40" width="70" height="170" fill="#7FB7A4"/><rect x="172" y="90" width="90" height="120" fill="#F2C14E"/><rect x="268" y="60" width="70" height="150" fill="#8E7CC3"/><rect x="344" y="100" width="60" height="110" fill="#F28B66"/></g>
      <g fill="#FFF8F0" opacity=".85">${[...Array(12)].map((_, i) => `<rect x="${22 + (i % 6) * 64}" y="${100 + Math.floor(i / 6) * 40}" width="16" height="20" rx="2"/>`).join('')}</g>
      <rect x="0" y="210" width="400" height="90" fill="#9AA5AE"/><rect x="0" y="206" width="400" height="10" fill="#C9D1D7"/>
      <g fill="#FFF8F0"><rect x="30" y="252" width="40" height="6"/><rect x="120" y="252" width="40" height="6"/><rect x="210" y="252" width="40" height="6"/><rect x="300" y="252" width="40" height="6"/></g>`);
    case 'living': return wrap('#FBE7E1', `
      <rect x="220" y="50" width="150" height="90" rx="8" fill="#1D2B36"/><path d="M285 80 l26 15 l-26 15 z" fill="#FF6B4A"/>
      <rect x="290" y="140" width="10" height="20" fill="#1D2B36"/>
      <path d="M40 60 h50 l-10 34 h-30 z" fill="#FFC94D"/><rect x="62" y="94" width="6" height="110" fill="#8B6B4E"/>
      <rect x="0" y="212" width="400" height="88" fill="#C9A78A"/>
      <rect x="110" y="160" width="190" height="56" rx="18" fill="#5B8E9E"/><rect x="96" y="150" width="30" height="66" rx="12" fill="#4D7C8B"/><rect x="284" y="150" width="30" height="66" rx="12" fill="#4D7C8B"/>`);
    case 'meeting': return wrap('#EEF1F6', `
      <rect x="40" y="36" width="200" height="120" rx="6" fill="#FFFFFF" stroke="#B5C0CC" stroke-width="5"/>
      <path d="M60 130 L100 100 L140 112 L180 70 L220 80" stroke="#14A39A" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="60" y="56" width="70" height="6" rx="3" fill="#FF6B4A"/>
      <rect x="270" y="50" width="100" height="90" rx="6" fill="#C5DCEB"/>
      <rect x="0" y="210" width="400" height="90" fill="#C9D2DC"/><rect x="40" y="196" width="320" height="18" rx="6" fill="#7A5C43"/>`);
    default: return wrap('#0F5E63', `
      <defs><radialGradient id="glow" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#14B8A6" stop-opacity=".55"/><stop offset="1" stop-color="#0F5E63" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="300" fill="url(#glow)"/>
      <circle cx="60" cy="60" r="34" fill="#FFC94D" opacity=".18"/><circle cx="350" cy="90" r="50" fill="#FF6B4A" opacity=".14"/>
      <ellipse cx="200" cy="300" rx="260" ry="70" fill="#0B4A4E"/>`);
  }
}
