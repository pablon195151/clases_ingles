/* ============================================================
   CONTENIDO DE EJEMPLO — lecciones, examen y temas de conversación
   Todo el contenido es original. Edita o agrega lecciones aquí.
   ============================================================ */

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const LEVEL_DESC_ES = {
  A1: 'Principiante: entiendes y usas frases muy básicas sobre ti y tu entorno.',
  A2: 'Básico: te comunicas en situaciones sencillas y cotidianas.',
  B1: 'Intermedio: te defiendes en viajes, trabajo y temas conocidos.',
  B2: 'Intermedio alto: conversas con bastante fluidez sobre muchos temas.',
  C1: 'Avanzado: te expresas con soltura, precisión y matices.'
};

const GOALS = {
  viajes: { label: 'Viajes', icon: '✈️', desc: 'Aeropuertos, hoteles, pedir direcciones' },
  trabajo: { label: 'Trabajo', icon: '💼', desc: 'Presentarte, juntas, proponer ideas' },
  cotidiana: { label: 'Vida cotidiana', icon: '🏙️', desc: 'Cafeterías, compras, plática casual' },
  entretenimiento: { label: 'Entretenimiento', icon: '🎬', desc: 'Series, música, recomendaciones' }
};

const SKILL_LABELS = {
  L: 'Comprensión auditiva',
  V: 'Vocabulario en contexto',
  S: 'Expresión oral',
  C: 'Conversación',
  W: 'Respuestas escritas'
};

/* ---------------- EXAMEN INICIAL (banco adaptativo) ----------------
   d = dificultad 1..5 (≈ A1..C1). El examen elige el reactivo más
   cercano a la dificultad actual y sube o baja según la respuesta. */
const TEST_SEQUENCE = ['L', 'V', 'L', 'V', 'R', 'L', 'V', 'S', 'S', 'C'];

const TEST_BANK = {
  L: [
    { id: 'L1', d: 1, lines: [{ who: 'npc', en: "Hi! My name is Sam. I'm from Canada, and I'm a nurse." }],
      q: '¿De dónde es Sam?', options: ['De Canadá', 'De Colombia', 'De California'], answer: 0 },
    { id: 'L2', d: 2, lines: [{ who: 'npc', en: 'Excuse me, the bus to the airport leaves at a quarter past seven.' }],
      q: '¿A qué hora sale el autobús?', options: ['7:15', '7:45', '6:15'], answer: 0 },
    { id: 'L3', d: 3, lines: [
        { who: 'npc', en: 'Do you want to grab dinner tonight?' },
        { who: 'tutor', en: "I'd love to, but I have to finish a report. How about tomorrow?" }],
      q: '¿Qué propone la segunda persona?', options: ['Cenar mañana', 'Cenar hoy después del trabajo', 'Terminar el reporte juntos'], answer: 0 },
    { id: 'L4', d: 4, lines: [{ who: 'npc', en: "Honestly, the hotel was fine, but considering the price, I expected a lot more. I probably wouldn't stay there again." }],
      q: '¿Qué opina la persona del hotel?', options: ['Estaba bien, pero no valió lo que costó', 'Le encantó y volvería', 'Era barato pero muy sucio'], answer: 0 },
    { id: 'L6', d: 4, lines: [{ who: 'npc', en: "If I'd known the traffic would be this bad, I'd have taken the train." }],
      q: '¿Qué quiere decir la persona?', options: ['Se arrepiente de no haber tomado el tren', 'Mañana va a tomar el tren', 'El tren también tenía tráfico'], answer: 0 },
    { id: 'L5', d: 5, lines: [{ who: 'npc', en: "We've decided to put the launch on hold until legal signs off, which, realistically, won't happen before the end of the quarter." }],
      q: '¿Qué pasará con el lanzamiento?', options: ['Se pospone hasta que lo apruebe el área legal, quizá después del trimestre', 'Sale este trimestre sin cambios', 'Se cancela definitivamente'], answer: 0 }
  ],
  V: [
    { id: 'V1', d: 1, sentence: "I'm hungry. Let's ___ something.", options: ['eat', 'sleep', 'drive'], answer: 0 },
    { id: 'V2', d: 2, sentence: 'My flight was ___, so I waited four hours at the airport.', options: ['delayed', 'borrowed', 'closed'], answer: 0 },
    { id: 'V6', d: 2, sentence: 'Can you ___ me the salt, please?', options: ['pass', 'lend', 'take'], answer: 0 },
    { id: 'V3', d: 3, sentence: "I'm really looking ___ to the trip.", options: ['forward', 'ahead', 'after'], answer: 0 },
    { id: 'V4', d: 4, sentence: "She's very ___: she always finishes her work before the deadline.", options: ['reliable', 'reluctant', 'restless'], answer: 0 },
    { id: 'V5', d: 5, sentence: 'The new policy is likely to ___ a lot of criticism.', options: ['draw', 'make', 'take'], answer: 0 }
  ],
  // R = repetir (expresión oral; con micrófono se compara el texto reconocido)
  R: [
    { id: 'R1', d: 1, en: 'Nice to meet you.' },
    { id: 'R2', d: 2, en: 'Could I have a glass of water, please?' },
    { id: 'R3', d: 3, en: "I've been working here for about two years." },
    { id: 'R4', d: 4, en: "I'd rather stay in tonight, if you don't mind." },
    { id: 'R5', d: 5, en: 'Had I known about the delay, I would have rescheduled the meeting.' }
  ],
  // S = respuesta abierta
  S: [
    { id: 'S1', d: 1, en: "What's your name, and where are you from?", minWords: 5, expect: /\b(name|i'm|i am|from)\b/i },
    { id: 'S2', d: 2, en: 'What do you usually do on weekends?', minWords: 6, expect: /\b(i|we)\s+(usually|always|often|sometimes|like|go|play|watch|visit|stay|sleep|read|cook|walk)\b/i },
    { id: 'S3', d: 3, en: 'Tell me about a trip you took. Where did you go?', minWords: 10, expect: /\b(went|was|were|visited|saw|liked|loved|stayed|traveled|travelled|ate|took|had)\b/i },
    { id: 'S4', d: 4, en: 'If you could change one thing about your city, what would it be?', minWords: 12, expect: /\b(would|could|should|i'd)\b/i },
    { id: 'S5', d: 5, en: "Some people say remote work is better than working in an office. What's your opinion?", minWords: 20, expect: /\b(i think|i believe|in my opinion|personally|however|although|on the other hand|whereas|while|because)\b/i }
  ]
};

/* ---------------- LECCIONES ----------------
   Secuencia de cada lección:
   1 situación (audio) → 2 comprensión → 3 frases útiles → 4 conversación
   → 5 corrección y nuevo intento → 6 guardar frases difíciles          */
const LESSONS = [
  {
    id: 'cafe', title: 'Tu primer café en inglés', title_en: 'Ordering at a café',
    goals: ['cotidiana', 'viajes'], level: 1, scene: 'cafe',
    npc: { name: 'Mia', role: 'barista', icon: '☕' },
    intro_es: 'Estamos en una cafetería. Primero escucha la conversación sin leer. Fíjate en qué pide el cliente.',
    situation: [
      { who: 'npc', en: 'Hi there! What can I get for you?', es: '¡Hola! ¿Qué te sirvo?' },
      { who: 'tutor', en: 'Hi! Can I have a medium latte, please?', es: '¡Hola! ¿Me das un latte mediano, por favor?' },
      { who: 'npc', en: 'Sure. Is that for here or to go?', es: 'Claro. ¿Es para tomar aquí o para llevar?' },
      { who: 'tutor', en: 'To go, please.', es: 'Para llevar, por favor.' },
      { who: 'npc', en: "Great. That's four fifty. Can I get a name for the order?", es: 'Perfecto. Son cuatro cincuenta. ¿Me das un nombre para la orden?' },
      { who: 'tutor', en: "It's {tutor}. Thank you!", es: 'Es {tutor}. ¡Gracias!' }
    ],
    comprehension: [
      { q_en: 'What did the customer order?', q_es: '¿Qué pidió el cliente?', options: ['A medium latte', 'A large tea', 'A small black coffee'], answer: 0, line: 1 },
      { q_en: 'Is the drink for here or to go?', q_es: '¿La bebida es para tomar ahí o para llevar?', options: ['To go', 'For here', "We don't know"], answer: 0, line: 3 },
      { spoken: true, q_en: 'How much is the latte?', q_es: 'Responde en voz alta: ¿cuánto cuesta el latte?', expect: /\b(four|4)\b.*\b(fifty|50)\b|4[.:]50/i, model: "It's four fifty.", line: 4 }
    ],
    phrases: [
      { en: 'Can I have a latte, please?', es: '¿Me das un latte, por favor?', tip: '"Can I have…?" es la forma más común y amable de pedir algo.' },
      { en: 'For here, please.', es: 'Para tomar aquí, por favor.', tip: 'Si lo quieres para llevar, di "To go, please."' },
      { en: 'How much is it?', es: '¿Cuánto es?', tip: 'También se usa "How much do I owe you?"' },
      { en: 'Thanks, have a nice day!', es: '¡Gracias, que tengas buen día!', tip: 'Despedida amable y muy común.' }
    ],
    conversation: {
      role_es: 'Ahora yo soy el barista y tú eres el cliente. Contesta en inglés como puedas. ¡Equivocarte es parte de aprender!',
      scenario: 'A café counter. The tutor is the barista; the student is a customer ordering a drink.',
      role_en: 'the barista at Cloud Café',
      opening: 'Hi! Welcome to Cloud Café.',
      turns: [
        { ask: 'What can I get for you?', simple: 'What drink do you want? Coffee? Tea?',
          hint: 'Pide una bebida: "Can I have a latte, please?"', model: 'Can I have a latte, please?',
          expect: [{ re: /\b(latte|coffee|cappuccino|espresso|americano|tea|mocha|hot chocolate|chocolate|juice|water|frappe|frappuccino|smoothie|soda|milk)\b/i, slot: 'drink', reply: 'One {drink}, great choice.' }],
          any: 'Okay, one house coffee then.', anySlots: { drink: 'coffee' } },
        { ask: 'What size would you like? Small, medium, or large?', simple: 'Small, medium, or large?',
          hint: 'Elige un tamaño: "Medium, please."', model: 'Medium, please.',
          expect: [{ re: /\b(small|medium|large|regular|big|tall|grande)\b/i, slot: 'size',
            val: m => ({ big: 'large', grande: 'large', tall: 'small', regular: 'medium' }[m[1].toLowerCase()] || m[1].toLowerCase()),
            reply: 'A {size} {drink}, got it.' }],
          any: "Let's make it a medium.", anySlots: { size: 'medium' } },
        { ask: 'Is that for here or to go?', simple: 'Here or to go?',
          hint: 'Di "For here, please" o "To go, please".', model: 'To go, please.',
          expect: [
            { re: /\b(to go|take ?away|take ?out|go)\b/i, slot: 'where', val: () => 'to go', reply: "Sure, I'll put a lid on it." },
            { re: /\b(here|stay|sit)\b/i, slot: 'where', val: () => 'for here', reply: 'Perfect, you can sit anywhere you like.' }],
          any: "I'll give you a cup to go, just in case." },
        { ask: 'Can I get a name for the order?', simple: 'What is your name?',
          hint: 'Di tu nombre: "It\'s Ana."', model: "It's Ana.",
          expect: [
            { re: /(?:it's|it is|my name is|my name's|i'm|i am|name's|call me)\s+([a-záéíóúñü]+)/i, slot: 'name', val: m => cap(m[1]), reply: 'Thanks, {name}!' },
            { re: /^\s*([a-záéíóúñü]+)[.!]?\s*$/i, slot: 'name', val: m => cap(m[1]), reply: 'Thanks, {name}!' }],
          any: 'Thanks!' },
        { minLevel: 2, ask: 'Would you like anything to eat with that? We have muffins and croissants.',
          hint: 'Puedes decir "Yes, a croissant, please" o "No, thanks".', model: "No, thanks. That's all.",
          expect: [
            { re: /\b(muffin|croissant|cookie|sandwich|cake|bagel)s?\b/i, slot: 'food', reply: 'Good choice, the {food}s are fresh today.' },
            { re: /\b(no|nope|that's all|that's it|i'm good|nothing)\b/i, reply: 'No problem.' }],
          any: 'Okay!' }
      ],
      closing: "That's four fifty. Your {size|} {drink|coffee} will be ready in a minute. Have a great day, {name|friend}!"
    },
    corrections: [
      { re: /\bi want (a |an |one )?([a-z ]*?(latte|coffee|cappuccino|espresso|americano|tea|mocha|chocolate|juice|water|frappe|smoothie|soda|muffin|croissant)s?)\b(,? please)?/i,
        rep: (m0, a, b) => `Can I have ${a || 'a '}${b}, please`, tip: '"I want…" suena brusco al pedir. "Can I have…, please?" es más amable.', tag: 'Pedir con cortesía' },
      { re: /\bgive me (a |an |one )?([a-z ]+)/i, rep: (m0, a, b) => `Could I get ${a || 'a '}${b}, please`, tip: '"Give me…" suena a orden. Mejor: "Could I get…, please?"', tag: 'Pedir con cortesía' }
    ]
  },

  {
    id: 'airport', title: 'Documenta en el aeropuerto', title_en: 'Airport check-in',
    goals: ['viajes'], level: 2, scene: 'airport',
    npc: { name: 'Ken', role: 'agente de aerolínea', icon: '🛫' },
    intro_es: 'Estamos en el mostrador de una aerolínea. Escucha y fíjate a dónde viaja la persona, cuántas maletas lleva y qué asiento pide.',
    situation: [
      { who: 'npc', en: 'Good morning. Where are you flying today?', es: 'Buenos días. ¿A dónde vuela hoy?' },
      { who: 'tutor', en: "Good morning. I'm flying to Chicago.", es: 'Buenos días. Vuelo a Chicago.' },
      { who: 'npc', en: 'May I see your passport, please?', es: '¿Me permite su pasaporte, por favor?' },
      { who: 'tutor', en: 'Sure, here you go.', es: 'Claro, aquí tiene.' },
      { who: 'npc', en: 'Are you checking any bags?', es: '¿Va a documentar maletas?' },
      { who: 'tutor', en: 'Yes, just one suitcase.', es: 'Sí, solo una maleta.' },
      { who: 'npc', en: 'Would you like a window or an aisle seat?', es: '¿Prefiere ventanilla o pasillo?' },
      { who: 'tutor', en: 'A window seat, please.', es: 'Ventanilla, por favor.' }
    ],
    comprehension: [
      { q_en: 'Where is the passenger flying?', q_es: '¿A dónde viaja la persona?', options: ['Chicago', 'Cancún', 'Chile'], answer: 0, line: 1 },
      { q_en: 'How many bags is the passenger checking?', q_es: '¿Cuántas maletas documenta?', options: ['One', 'Two', 'None'], answer: 0, line: 5 },
      { spoken: true, q_en: 'What seat does the passenger want?', q_es: 'Responde en voz alta: ¿qué asiento pidió?', expect: /\bwindow\b/i, model: 'A window seat.', line: 7 }
    ],
    phrases: [
      { en: "I'm flying to Chicago.", es: 'Vuelo a Chicago.', tip: 'Usa "I\'m flying to…" + tu destino.' },
      { en: 'Here you go.', es: 'Aquí tiene.', tip: 'Se dice al entregar algo, como tu pasaporte.' },
      { en: "I'd like a window seat, please.", es: 'Quisiera ventanilla, por favor.', tip: '"I\'d like…" es más amable que "I want…".' },
      { en: 'What time does boarding start?', es: '¿A qué hora empieza el abordaje?', tip: '"Boarding" = abordaje; "gate" = sala o puerta.' }
    ],
    conversation: {
      role_es: 'Ahora yo soy el agente de la aerolínea y tú eres el pasajero. Elige tu destino: ¡a donde quieras!',
      scenario: 'Airport check-in counter. The tutor is the airline agent; the student is a passenger.',
      role_en: 'an airline check-in agent',
      opening: 'Good morning, welcome to Sky Lines.',
      turns: [
        { ask: 'Where are you flying today?', simple: 'Where are you going? What city?',
          hint: 'Di tu destino: "I\'m flying to Chicago."', model: "I'm flying to Chicago.",
          expect: [
            { re: /\b(?:to|for)\s+([a-záéíóúñ]+(?:\s(?!please)[a-záéíóúñ]+)?)/i, slot: 'city', val: (m, t) => {
                const all = [...t.matchAll(/\b(?:to|for)\s+(?=([a-záéíóúñ]+(?:\s(?!please\b|today\b|tomorrow\b|to\b)[a-záéíóúñ]+)?))/gi)].map(x => x[1]).filter(x => !/^(go|fly|travel|be|visit|see|the)\b/i.test(x));
                return titleCase((all.pop() || m[1]).replace(/\s+(today|please|tomorrow|now)$/i, ''));
              }, reply: '{city}, perfect.' },
            { re: /^\s*([a-záéíóúñ]+(?:\s[a-záéíóúñ]+)?)[.!]?\s*$/i, slot: 'city', val: m => titleCase(m[1]), reply: '{city}, perfect.' }],
          any: 'Okay, let me check.', anySlots: { city: 'your destination' } },
        { ask: 'May I see your passport, please?', simple: 'Your passport, please?',
          hint: 'Entrega tu pasaporte: "Sure, here you go."', model: 'Sure, here you go.',
          expect: [{ re: /\b(here|sure|yes|of course|okay|ok|passport)\b/i, reply: 'Thank you.' }], any: 'Thank you.' },
        { ask: 'Are you checking any bags today?', simple: 'Do you have a suitcase?',
          hint: 'Responde "Yes, one suitcase" o "No, just a carry-on".', model: 'Yes, just one suitcase.',
          expect: [
            { re: /\b(no|nope|just (a )?carry[- ]on|only (a )?backpack)\b/i, slot: 'bags', val: () => 'no', reply: 'Okay, just a carry-on then.' },
            { re: /\b(one|two|three|1|2|3|a suitcase|yes|yeah)\b/i, slot: 'bags', val: () => 'yes', reply: 'Please put your bag on the scale.' }],
          any: 'Okay.' },
        { ask: 'Would you like a window or an aisle seat?', simple: 'Window or aisle?',
          hint: '"A window seat, please." / "An aisle seat, please."', model: 'A window seat, please.',
          expect: [{ re: /\b(window|aisle|middle)\b/i, slot: 'seat', val: m => m[1].toLowerCase(), reply: 'A {seat} seat, no problem.' }],
          any: "I'll find you a good seat." },
        { minLevel: 2, ask: 'Is anyone traveling with you today?', hint: '"No, I\'m traveling alone." / "Yes, my wife."',
          model: "No, I'm traveling alone.",
          expect: [{ re: /\b(alone|no|nobody|just me)\b/i, reply: 'Okay, traveling solo.' }, { re: /\b(yes|my|with)\b/i, reply: 'Great, I see you are together.' }], any: 'Okay.' }
      ],
      closing: 'Here is your boarding pass. Boarding starts at nine forty at gate twelve. Have a nice flight to {city|your destination}!'
    },
    corrections: [
      { re: /\bi want (a |an )?(window|aisle|middle)( seat)?/i, rep: (m0, a, b) => `I'd like ${b === 'aisle' ? 'an' : 'a'} ${b} seat`, tip: '"I\'d like…" suena más amable que "I want…".', tag: 'Pedir con cortesía' },
      { re: /\bi go to ([a-z]+)/i, rep: (m0, a) => `I'm flying to ${a}`, tip: 'Para un vuelo es más natural "I\'m flying to…".', tag: 'Hablar de planes' }
    ]
  },

  {
    id: 'work-intro', title: 'Preséntate en tu nuevo trabajo', title_en: 'Meeting a new colleague',
    goals: ['trabajo'], level: 1, scene: 'office',
    npc: { name: 'Priya', role: 'compañera de trabajo', icon: '👩🏽‍💼' },
    intro_es: 'Es tu primer día en una oficina. Escucha cómo se presentan dos compañeros. Fíjate en qué hacía antes la persona nueva.',
    situation: [
      { who: 'npc', en: "Hi, you must be the new team member. I'm Priya, I work in marketing.", es: 'Hola, tú debes ser la persona nueva del equipo. Soy Priya, trabajo en marketing.' },
      { who: 'tutor', en: "Nice to meet you, Priya! I'm {tutor}. I'm the new support analyst.", es: '¡Mucho gusto, Priya! Soy {tutor}. Soy el nuevo analista de soporte.' },
      { who: 'npc', en: 'Welcome! What did you do before this?', es: '¡Bienvenido! ¿Qué hacías antes?' },
      { who: 'tutor', en: 'I worked at a logistics company for three years.', es: 'Trabajé en una empresa de logística tres años.' },
      { who: 'npc', en: 'Cool. Let me know if you need anything.', es: 'Qué bien. Avísame si necesitas algo.' }
    ],
    comprehension: [
      { q_en: 'Where does Priya work?', q_es: '¿En qué área trabaja Priya?', options: ['In marketing', 'In logistics', 'In support'], answer: 0, line: 0 },
      { q_en: "What's the new person's job?", q_es: '¿Cuál es el puesto de la persona nueva?', options: ['Support analyst', 'Marketing manager', 'Truck driver'], answer: 0, line: 1 },
      { spoken: true, q_en: 'How long did the new person work at the logistics company?', q_es: 'Responde en voz alta: ¿cuánto tiempo trabajó en logística?', expect: /\b(three|3)\s+years?\b/i, model: 'For three years.', line: 3 }
    ],
    phrases: [
      { en: 'Nice to meet you.', es: 'Mucho gusto.', tip: 'Se usa la primera vez que conoces a alguien.' },
      { en: "I'm the new support analyst.", es: 'Soy el nuevo analista de soporte.', tip: 'Para tu puesto usa "I\'m a…" o "I work as a…".' },
      { en: 'I worked at a logistics company for three years.', es: 'Trabajé tres años en una empresa de logística.', tip: 'Duración: "for" + tiempo (for three years).' },
      { en: 'Let me know if you need anything.', es: 'Avísame si necesitas algo.', tip: 'Frase muy común entre compañeros.' }
    ],
    conversation: {
      role_es: 'Ahora yo soy tu compañero de trabajo y tú eres la persona nueva. Cuéntame de ti.',
      scenario: 'First day at a new office. The tutor is a friendly colleague; the student is the new employee.',
      role_en: 'a friendly colleague who works in marketing',
      opening: "Hi! You must be the new team member. I'm {tutor}, I work in marketing.",
      turns: [
        { ask: "What's your name?", simple: 'What is your name?', hint: '"I\'m Ana. Nice to meet you."', model: "I'm Ana. Nice to meet you.",
          expect: [
            { re: /(?:it's|it is|my name is|my name's|i'm|i am|name's|call me)\s+([a-záéíóúñü]+)/i, slot: 'name', val: m => cap(m[1]), reply: 'Nice to meet you, {name}!' },
            { re: /^\s*([a-záéíóúñü]+)[.!]?\s*$/i, slot: 'name', val: m => cap(m[1]), reply: 'Nice to meet you, {name}!' }],
          any: 'Nice to meet you!' },
        { ask: 'So, what will you be doing here?', simple: 'What is your job?',
          hint: '"I\'m the new support analyst." / "I work in logistics."', model: "I'm the new support analyst.",
          expect: [
            { re: /(?:i'm an?|i am an?|i work as an?|i'll be an?|i will be an?|i'm the|i am the|i'll be the)\s+(?:new\s+)?([a-z ]+?)(?:[.,!]|$| for| in| at)/i, slot: 'job', val: m => m[1].trim(), reply: 'Oh, a {job}! That sounds interesting.' },
            { re: /(?:work in|working in|work on|work with)\s+([a-z ]+?)(?:[.,!]|$)/i, slot: 'area', val: m => m[1].trim(), reply: "Oh, {area}! We work with that team a lot." }],
          any: 'Oh, that sounds interesting.' },
        { ask: 'What did you do before this job?', simple: 'Where did you work before?',
          hint: 'Usa pasado: "I worked at a logistics company."', model: 'I worked at a logistics company.',
          expect: [{ re: /\b(worked|was|were|studied|did|used to|had)\b/i, reply: 'Nice, that experience will be really useful here.' }],
          any: 'Cool.' },
        { ask: 'How long did you do that?', simple: 'How many years?',
          hint: '"For three years."', model: 'For three years.',
          expect: [{ re: /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few|many|several)\s+(years?|months?)/i, slot: 'time', val: m => m[0].toLowerCase(), reply: "Wow, {time}. That's a lot of experience." }],
          any: 'Okay, great.' },
        { minLevel: 2, ask: 'What are you most excited about in this new role?', hint: '"I\'m excited to learn new things."',
          model: "I'm excited to work with a new team.", expect: [], any: 'I love that.' }
      ],
      closing: 'Well, welcome to the team, {name|my friend}! Let me know if you need anything.'
    },
    corrections: [
      { re: /\bwork like (a|an)\b/i, rep: (m0, a) => `work as ${a}`, tip: 'Para tu puesto: "I work as a…", no "like".', tag: 'Hablar de tu trabajo' }
    ]
  },

  {
    id: 'directions', title: 'Ayuda a un turista perdido', title_en: 'Giving directions',
    goals: ['viajes', 'cotidiana'], level: 2, scene: 'street',
    npc: { name: 'Sam', role: 'vecino', icon: '🧭' },
    intro_es: 'Alguien pregunta cómo llegar a la estación de tren. Escucha las indicaciones: ¿derecho, izquierda o derecha?',
    situation: [
      { who: 'tutor', en: 'Excuse me, how do I get to the train station?', es: 'Disculpa, ¿cómo llego a la estación de tren?' },
      { who: 'npc', en: "Sure. Go straight for two blocks, then turn left at the bank. It's next to a big park.", es: 'Claro. Sigue derecho dos cuadras y da vuelta a la izquierda en el banco. Está junto a un parque grande.' },
      { who: 'tutor', en: 'Is it far?', es: '¿Está lejos?' },
      { who: 'npc', en: "No, it's about a ten-minute walk.", es: 'No, está como a diez minutos caminando.' }
    ],
    comprehension: [
      { q_en: 'Where do you turn left?', q_es: '¿Dónde hay que dar vuelta a la izquierda?', options: ['At the bank', 'At the park', 'At the station'], answer: 0, line: 1 },
      { q_en: 'What is next to the station?', q_es: '¿Qué está junto a la estación?', options: ['A big park', 'A hospital', 'A museum'], answer: 0, line: 1 },
      { spoken: true, q_en: 'How long is the walk?', q_es: 'Responde en voz alta: ¿cuánto se tarda caminando?', expect: /\b(ten|10)\b.*\bminutes?\b|\bten-minute\b/i, model: 'About ten minutes.', line: 3 }
    ],
    phrases: [
      { en: 'Excuse me, how do I get to the station?', es: 'Disculpa, ¿cómo llego a la estación?', tip: '"How do I get to…?" sirve para cualquier lugar.' },
      { en: 'Go straight for two blocks.', es: 'Sigue derecho dos cuadras.', tip: '"Block" = cuadra. Se dice "for two blocks".' },
      { en: 'Turn left at the bank.', es: 'Da vuelta a la izquierda en el banco.', tip: 'Turn left / turn right. "At" + el lugar donde das la vuelta.' },
      { en: "It's next to the park.", es: 'Está junto al parque.', tip: 'Next to = junto a; across from = enfrente de.' }
    ],
    conversation: {
      role_es: 'Ahora los papeles cambian: yo soy un turista perdido y tú me das indicaciones en inglés.',
      scenario: 'On a street. The tutor is a lost tourist; the student is a local giving directions to a pharmacy.',
      role_en: 'a lost tourist looking for a pharmacy',
      opening: "Excuse me, sorry to bother you. I'm a little lost.",
      turns: [
        { ask: 'Is there a pharmacy near here?', simple: 'A pharmacy, near here?',
          hint: '"Yes, there\'s one near here."', model: "Yes, there's one near here.",
          expect: [
            { re: /\b(no|not|don't know|sorry)\b/i, reply: "Oh, okay. Maybe there's one a little farther away." },
            { re: /\b(yes|yeah|sure|there's|there is|one)\b/i, reply: 'Oh, great!' }],
          any: 'Oh, great!' },
        { ask: 'How do I get there?', simple: 'Left or right?',
          hint: '"Go straight for two blocks and turn left."', model: 'Go straight for two blocks, then turn left.',
          expect: [{ re: /\b(straight|left|right|blocks?|corner|next to|across|turn|walk)\b/i, slot: 'dirs', val: (m, t) => shorten(t, 12), reply: 'Okay, so, {dirs}. Got it.' }],
          any: 'Okay, I think I understand.' },
        { ask: 'Is it far from here?', simple: 'Is it far?',
          hint: '"No, it\'s about a five-minute walk."', model: "No, it's about a five-minute walk.",
          expect: [
            { re: /(\d+|one|two|three|five|ten|fifteen|twenty|a few)[\s-]+minutes?/i, slot: 'mins', val: m => m[0].toLowerCase(), reply: 'Only {mins}? Perfect.' },
            { re: /\b(not far|close|near|no)\b/i, reply: 'Great, not far.' },
            { re: /\b(yes|far|pretty far|a bit)\b/i, reply: 'Hmm, okay.' }],
          any: 'Okay.' },
        { ask: 'Should I walk or take a taxi?', simple: 'Walk or taxi?',
          hint: '"You can walk." / "Take a taxi."', model: 'You can walk, it\'s close.',
          expect: [
            { re: /\b(walk|walking|on foot)\b/i, reply: 'Walking it is. I need the exercise!' },
            { re: /\b(taxi|uber|cab|bus|metro|subway|train)\b/i, slot: 'transport', reply: "Okay, I'll take the {transport}." }],
          any: 'Good idea.' }
      ],
      closing: 'Thank you so much for your help! Have a great day.'
    },
    corrections: [
      { re: /\bstraight (to|by) (\w+) blocks\b/i, rep: (m0, a, b) => `straight for ${b} blocks`, tip: 'Se dice "go straight for two blocks".', tag: 'Dar indicaciones' },
      { re: /\bin the corner\b/i, rep: 'at the corner', tip: 'En la esquina de la calle = "at the corner".', tag: 'Preposiciones de lugar' },
      { re: /\bturn to the (left|right)\b/i, rep: (m0, a) => `turn ${a}`, tip: 'Más natural y corto: "turn left / turn right".', tag: 'Dar indicaciones' }
    ]
  },

  {
    id: 'series', title: 'Recomienda una serie', title_en: 'Recommending a show',
    goals: ['entretenimiento', 'cotidiana'], level: 3, scene: 'living',
    npc: { name: 'Leo', role: 'amigo', icon: '🍿' },
    intro_es: 'Dos amigos platican de series. Escucha de qué trata la serie y qué opinan de ella.',
    situation: [
      { who: 'npc', en: 'Have you watched anything good lately?', es: '¿Has visto algo bueno últimamente?' },
      { who: 'tutor', en: "Yes! I've just finished a series called Signal Lost. It's a sci-fi mystery.", es: '¡Sí! Acabo de terminar una serie que se llama Signal Lost. Es un misterio de ciencia ficción.' },
      { who: 'npc', en: "What's it about?", es: '¿De qué trata?' },
      { who: 'tutor', en: "It's about a radio host who receives messages from the future. It's a bit slow at first, but it gets really intense.", es: 'Trata de un locutor de radio que recibe mensajes del futuro. Al principio es un poco lenta, pero luego se pone muy intensa.' },
      { who: 'npc', en: "Sounds cool. I'll check it out.", es: 'Suena bien. La voy a ver.' }
    ],
    comprehension: [
      { q_en: 'What kind of series is it?', q_es: '¿Qué tipo de serie es?', options: ['A sci-fi mystery', 'A romantic comedy', 'A cooking show'], answer: 0, line: 1 },
      { q_en: 'What is the problem with the beginning?', q_es: '¿Qué pasa al principio de la serie?', options: ["It's a bit slow", "It's too scary", "It's very short"], answer: 0, line: 3 },
      { spoken: true, q_en: 'Who is the main character?', q_es: 'Responde en voz alta: ¿quién es el protagonista?', expect: /\bradio\b/i, model: 'A radio host.', line: 3 }
    ],
    phrases: [
      { en: 'Have you watched anything good lately?', es: '¿Has visto algo bueno últimamente?', tip: 'Ideal para iniciar plática sobre series o películas.' },
      { en: "It's about a radio host who receives messages.", es: 'Trata de un locutor que recibe mensajes.', tip: '"It\'s about…" = trata de… (sin "of").' },
      { en: "It's a bit slow at first, but it gets really good.", es: 'Al principio es lenta, pero luego mejora mucho.', tip: '"At first… but…" para contrastar.' },
      { en: "I'd totally recommend it.", es: 'La recomiendo muchísimo.', tip: '"Totally" le da énfasis informal.' }
    ],
    conversation: {
      role_es: 'Ahora tú me recomiendas una serie o película que te guste. Cuéntame de qué trata.',
      scenario: 'Two friends chatting about TV series and movies. The student recommends something.',
      role_en: 'a friend who loves TV series',
      opening: 'Hey! I need something new to watch this weekend.',
      turns: [
        { ask: 'Have you watched anything good lately?', simple: 'What series do you like?',
          hint: '"Yes, I\'ve just watched…" / "I\'m watching…"', model: "Yes, I've just finished a series called Dark Waters.",
          expect: [
            { re: /\b(?:watched|watching|saw|seen|finished|started|called|like|love)\s+(.+)/i, slot: 'show',
              val: m => m[1].split(/[,.!?]| and | it | on | because /)[0].replace(/^(a series|a show|a movie|the series|series)\s*(called)?\s*/i, '').trim().slice(0, 40), reply: 'Oh, {show}! I\'ve heard about it.' },
            { re: /\b(no|not really|nothing)\b/i, slot: 'show', val: () => '', reply: 'No worries. Tell me about your favorite show ever, then.' }],
          any: 'Oh, nice.' },
        { ask: "What's it about?", simple: 'Is it funny, scary, or romantic?',
          hint: '"It\'s about a family who…" / "It\'s a comedy about…"', model: "It's about a detective who solves crimes in London.",
          expect: [{ re: /\b(about|story|follows|guy|girl|man|woman|family|people|detective|comedy|drama|funny|scary|romantic|action|it's a)\b/i, reply: 'That sounds really interesting.' }],
          any: 'Hmm, interesting.' },
        { ask: 'Why would you recommend it?', simple: 'Do you like it?',
          hint: 'Usa "because": "Because the characters are amazing."', model: "Because the characters are great and the story is surprising.",
          expect: [{ re: /\b(because|the characters|the story|the actors|funny|exciting|intense|good|great|amazing|interesting)\b/i, reply: 'Okay, you convinced me.' }],
          any: 'Okay, I trust you.' },
        { ask: 'How often do you watch series?', simple: 'Every day? On weekends?',
          hint: '"Almost every night." / "Only on weekends."', model: 'Almost every night, after dinner.',
          expect: [{ re: /\b(every day|every night|weekends?|sometimes|often|once|twice|never|always|usually|night|day)\b/i, reply: "Same here, it's my favorite way to relax." }],
          any: 'Nice.' }
      ],
      closing: "Thanks for the recommendation! I'll check out {show|something new} this weekend."
    },
    corrections: [
      { re: /\bis about of\b/i, rep: 'is about', tip: '"It\'s about…" no lleva "of".', tag: 'Hablar de series' },
      { re: /\bthe history (is|was)\b/i, rep: (m0, a) => `the story ${a}`, tip: 'La trama es "story"; "history" es la historia como disciplina.', tag: 'Falsos amigos' },
      { re: /\b(in|at) netflix\b/i, rep: 'on Netflix', tip: 'Con plataformas y TV se usa "on": on Netflix, on TV.', tag: 'Preposiciones' }
    ]
  },

  {
    id: 'meeting', title: 'Propón una idea en una junta', title_en: 'Suggesting an idea in a meeting',
    goals: ['trabajo'], level: 4, scene: 'meeting',
    npc: { name: 'Dana', role: 'gerente', icon: '📊' },
    intro_es: 'En una junta, la gerente pide ideas para resolver un problema. Escucha qué propone el empleado y cuándo estaría listo.',
    situation: [
      { who: 'npc', en: "Okay team, we're getting too many repeated support tickets. Any ideas?", es: 'Bien, equipo, estamos recibiendo demasiados tickets repetidos. ¿Ideas?' },
      { who: 'tutor', en: 'I have a suggestion. What if we created a short FAQ for the most common issues?', es: 'Tengo una sugerencia. ¿Y si hacemos unas preguntas frecuentes cortas para los problemas más comunes?' },
      { who: 'npc', en: 'Interesting. How long would that take?', es: 'Interesante. ¿Cuánto tomaría?' },
      { who: 'tutor', en: 'I think we could have a first version ready by next Friday.', es: 'Creo que podríamos tener una primera versión para el próximo viernes.' },
      { who: 'npc', en: "Great, let's try it.", es: 'Perfecto, intentémoslo.' }
    ],
    comprehension: [
      { q_en: "What's the problem?", q_es: '¿Cuál es el problema?', options: ['Too many repeated tickets', 'Not enough employees', 'A slow computer system'], answer: 0, line: 0 },
      { q_en: 'What does the employee suggest?', q_es: '¿Qué propone el empleado?', options: ['A short FAQ', 'Hiring more people', 'A longer meeting'], answer: 0, line: 1 },
      { spoken: true, q_en: 'When could the first version be ready?', q_es: 'Responde en voz alta: ¿cuándo estaría lista la primera versión?', expect: /\bfriday\b/i, model: 'By next Friday.', line: 3 }
    ],
    phrases: [
      { en: 'I have a suggestion.', es: 'Tengo una sugerencia.', tip: 'Forma amable de pedir la palabra en una junta.' },
      { en: 'What if we created a short FAQ?', es: '¿Y si hacemos unas preguntas frecuentes cortas?', tip: '"What if we + pasado" suena a propuesta abierta, no a orden.' },
      { en: 'I think we could have it ready by Friday.', es: 'Creo que podríamos tenerlo listo para el viernes.', tip: '"By" + fecha = a más tardar.' },
      { en: "That's a good point, but…", es: 'Buen punto, pero…', tip: 'Para no estar de acuerdo con tacto.' }
    ],
    conversation: {
      role_es: 'Ahora yo soy tu gerente. Cuéntame un problema real de tu trabajo y propón una solución.',
      scenario: 'A team meeting at work. The tutor is the manager; the student describes a problem and proposes a solution.',
      role_en: 'a supportive team manager running a meeting',
      opening: 'Okay team, quick question before we wrap up.',
      turns: [
        { ask: "What's one problem that slows your team down at work?", simple: 'What is a problem at your work?',
          hint: 'Describe un problema: "We get too many repeated tickets."', model: 'We get a lot of repeated questions from stores.',
          expect: [], any: 'Yeah, I can see how that would be frustrating.' },
        { ask: 'What would you suggest to fix it?', simple: 'What is your idea?',
          hint: 'Usa "What if we…?" o "We could…"', model: 'What if we created a short FAQ for the most common issues?',
          expect: [{ re: /\b(what if|we could|i suggest|i'd suggest|i propose|maybe we|we should|let's|how about|i think we)\b/i, reply: 'I like that idea.' }],
          any: 'Okay, that could work.' },
        { ask: 'How long do you think it would take?', simple: 'Days? Weeks?',
          hint: '"About two weeks." / "By next Friday."', model: 'I think we could have a first version by next Friday.',
          expect: [{ re: /(\d+|one|two|three|a couple of|a few)\s+(days?|weeks?|months?|hours?)|by (monday|tuesday|wednesday|thursday|friday|next week|the end of [a-z ]+)/i, slot: 'time', val: m => m[0].toLowerCase(), reply: '{time} sounds realistic.' }],
          any: 'Okay, sounds realistic.' },
        { ask: 'What could go wrong with this plan?', simple: 'Is there a risk?',
          hint: '"The risk is that…"', model: "The only risk is that people might not read it, so we'd need to share it often.",
          expect: [], any: "Good point, we'll keep that in mind." }
      ],
      closing: "Great, let's try it. Please send everyone a short summary after the meeting. Thanks!"
    },
    corrections: [
      { re: /\b(make|do) a meeting\b/i, rep: 'have a meeting', tip: 'Se dice "have / schedule a meeting".', tag: 'Inglés de oficina' },
      { re: /\bdiscuss about\b/i, rep: 'discuss', tip: '"Discuss" no lleva "about".', tag: 'Inglés de oficina' }
    ]
  }
];

/* ---------------- CONVERSACIÓN LIBRE ---------------- */
const FREE_TOPICS = [
  { id: 'intro', label: 'Sobre ti', icon: '🙂', hidden: true,
    qA: ['Tell me a little about yourself. What do you do?', 'What do you like to do in your free time?', 'Why do you want to learn English?'],
    qB: ['So, tell me a bit about yourself. What keeps you busy these days?', "What's something you've really enjoyed doing recently?", 'How do you think English could change things for you?'] },
  { id: 'dia', label: 'Tu día', icon: '☀️',
    qA: ['How are you today?', 'What did you do this morning?', 'What are you going to do tonight?', 'What time do you usually wake up?', 'What is your favorite part of the day?'],
    qB: ["How's your day going so far?", "What's the best part of a normal day for you?", 'If you had a free afternoon today, what would you do?', "Is there anything you're looking forward to this week?", "What's something that always makes your day better?"] },
  { id: 'comida', label: 'Comida', icon: '🌮',
    qA: ['What do you usually eat for breakfast?', 'What is your favorite food?', 'Do you like to cook?', 'What Mexican food do you recommend?', 'Do you like spicy food?'],
    qB: ["What's a dish you could eat every single day?", 'Do you prefer cooking at home or eating out?', "What's the best meal you've ever had?", 'If a friend visited your city, where would you take them to eat?', 'Is there a food you used to hate but now love?'] },
  { id: 'viajes', label: 'Viajes', icon: '🧳',
    qA: ['Do you like to travel?', 'Where did you go on your last vacation?', 'Do you prefer the beach or the mountains?', 'What city do you want to visit?', 'Who do you usually travel with?'],
    qB: ["What's the most memorable trip you've taken?", 'Do you prefer planning everything or improvising when you travel?', "Where would you go if money weren't a problem?", "What's something every visitor should do in your city?", 'Have you ever had a problem while traveling?'] },
  { id: 'trabajo', label: 'Trabajo o estudios', icon: '💼',
    qA: ['What do you do?', 'Do you like your job?', 'What time do you start work?', 'Do you work in an office or at home?', 'What do you do after work?'],
    qB: ['What does a typical workday look like for you?', 'What do you enjoy most about your work?', "What's a challenge you're dealing with at work right now?", 'How do you use English at work, or how would you like to?', 'Where do you see yourself in five years?'] },
  { id: 'entretenimiento', label: 'Series y música', icon: '🎧',
    qA: ['What music do you like?', 'Do you watch series?', 'What is your favorite movie?', 'Do you play video games?', 'Who is your favorite singer?'],
    qB: ["What have you been watching lately?", "What's a song you've had on repeat recently?", "Is there a movie you think everyone should see?", 'Do you prefer series or movies? Why?', "What's the best concert you've been to?"] }
];

const LEXICON = {
  food: ['pizza', 'tacos', 'taco', 'sushi', 'pasta', 'burger', 'burgers', 'hamburger', 'chicken', 'salad', 'chocolate', 'coffee', 'tea', 'fruit', 'eggs', 'bread', 'cereal', 'enchiladas', 'pozole', 'mole', 'tamales', 'quesadillas', 'chilaquiles', 'ramen', 'steak', 'fish', 'rice', 'beans', 'pancakes', 'ice cream', 'cake', 'soup', 'tortillas', 'cookies'],
  place: ['beach', 'mountains', 'park', 'museum', 'mexico city', 'mexico', 'monterrey', 'guadalajara', 'cancun', 'oaxaca', 'puebla', 'merida', 'tijuana', 'new york', 'paris', 'london', 'japan', 'tokyo', 'spain', 'madrid', 'canada', 'europe', 'italy', 'rome', 'los angeles', 'chicago', 'texas', 'colombia', 'peru', 'argentina'],
  music: ['music', 'songs', 'song', 'band', 'concert', 'guitar', 'piano', 'rock', 'pop', 'reggaeton', 'jazz', 'rap', 'hip hop', 'singing', 'banda', 'cumbia', 'k-pop', 'electronic'],
  movie: ['movie', 'movies', 'film', 'films', 'series', 'show', 'shows', 'netflix', 'anime', 'documentary', 'documentaries', 'cinema'],
  sport: ['soccer', 'football', 'basketball', 'baseball', 'tennis', 'running', 'gym', 'yoga', 'swimming', 'cycling', 'boxing', 'volleyball', 'hiking'],
  family: ['mom', 'dad', 'mother', 'father', 'wife', 'husband', 'kids', 'children', 'son', 'daughter', 'brother', 'sister', 'family', 'girlfriend', 'boyfriend', 'dog', 'cat', 'friends', 'parents', 'grandma', 'grandmother'],
  work: ['job', 'office', 'boss', 'meeting', 'meetings', 'project', 'team', 'company', 'school', 'university', 'class', 'classes', 'customers', 'clients']
};

const FOLLOWUPS = {
  food: ['How often do you eat {w}?', 'Where do you usually get {w}?', 'Do you know how to make {w}?'],
  place: ['What do you like most about {W}?', 'When was the last time you were in {W}?', 'What would you recommend doing in {W}?'],
  music: ['When do you usually listen to music?', 'Have you been to a concert recently?', 'Who do you like to listen to these days?'],
  movie: ['What was the last one you really enjoyed?', 'Do you prefer watching at home or at the movie theater?', 'Do you watch them in English or in Spanish?'],
  sport: ['How often do you do that?', 'What do you like most about {w}?', 'How did you get into {w}?'],
  family: ['What do you like to do with your {w}?', 'Do you see your {w} often?'],
  work: ['What do you like most about your {w}?', 'Is your {w} busy these days?']
};

const ACKS = {
  food: ['Oh, {w}, yum!', 'Mmm, {w} sounds delicious.', 'I love {w}.'],
  place: ['{W}, nice!', 'Oh, {W} is a great place.', '{W}, cool!'],
  music: ['Oh, nice, music is the best.', 'Cool, I love music too.'],
  movie: ['Oh, nice!', 'Cool, I love a good story.'],
  sport: ['Nice, that keeps you active!', 'Oh, cool!'],
  family: ["That's really nice.", 'Aw, that sounds lovely.'],
  work: ['I see.', 'Got it, that sounds interesting.'],
  positive: ["That's great!", 'Awesome!', 'I love that!'],
  negative: ["Oh no, I'm sorry to hear that.", 'That sounds tough.', 'Hang in there.'],
  generic: ['I see.', 'Interesting!', 'Cool!', 'Nice!', 'Got it.', 'Okay, that makes sense.']
};

const FEELINGS = {
  positive: ['good', 'great', 'fine', 'happy', 'excited', 'amazing', 'awesome', 'love', 'fantastic', 'wonderful', 'nice', 'fun', 'relaxed', 'well'],
  negative: ['tired', 'stressed', 'sad', 'bad', 'busy', 'sick', 'bored', 'angry', 'worried', 'hate', 'terrible', 'awful', 'exhausted']
};
