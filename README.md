# Charla · Inglés conversacional con tutor que habla y escucha

Aplicación web para hispanohablantes, adaptable a celular y computadora. Sigue un método conversacional en cuatro pasos: **escuchar → comprender → hablar → perfeccionar**. El estudiante habla desde la primera sesión. Personajes, lecciones e identidad visual son originales.

## Qué incluye

| Pantalla | Qué hace |
|---|---|
| Bienvenida | Nombre opcional y selección entre 7 tutores originales: **Fito** (zorro) y **Olivia** (búho) como animales realistas; **Sofía** (maestra), **Daniel** (maestro) y **Lía Vox** (cantante ficticia) como personas realistas; y **Hana** y **Kenji** en estilo anime original. Cada uno saluda con su voz. |
| Examen inicial | 10 actividades adaptativas (~8–10 min): 3 de comprensión auditiva, 3 de vocabulario en contexto, 1 de repetición, 2 de respuesta oral y una conversación breve con el tutor. La dificultad sube o baja según cada respuesta. |
| Resultados | Nivel MCER estimado (A1–C1), desempeño por habilidad, fortalezas, aspectos por mejorar y la primera lección recomendada. Aclara que es una estimación, no una certificación. Sin micrófono, la expresión oral aparece como **«Sin evaluar»**. |
| Curso personalizado | Objetivo (viajes, trabajo, vida cotidiana o entretenimiento) y plan de **3 sesiones semanales de 30 min** con selección de días. |
| Plan de estudio | Siguiente sesión (lección ~20 min + repaso ~5 + conversación libre ~5), avance semanal y ruta de lecciones ordenada por nivel y objetivo. |
| Lecciones (6) | Café, aeropuerto, presentarte en el trabajo, dar direcciones, recomendar una serie y proponer una idea en una junta. Cada una sigue la secuencia de 6 pasos (abajo). |
| **Práctica de pronunciación** | Módulo de pura práctica oral. Tiene 10 sonidos difíciles para hispanohablantes (th, v/b, i corta y «ee» larga, sh/ch, z, h, s + consonante, -ed, r inglesa y sílabas débiles), más frases de tus lecciones, tus frases difíciles y tus palabras por mejorar. Con **Azure Speech**, califica tu audio por palabra y por sonido (pronunciación, precisión, fluidez, completitud y entonación). El tutor te dice qué sonido corregir y cómo, y te pide intentarlo otra vez. Siempre puedes escucharte y comparar tu voz con el modelo. |
| Conversación libre | 5 temas. El tutor hace una pregunta a la vez, reacciona a lo que dices, recuerda lo que mencionaste antes y muestra correcciones con reintento. |
| Progreso | Nivel, lecciones completadas, tiempo hablado, sesiones de la semana, habilidades y vocabulario por repasar (con práctica). |

**Secuencia de cada lección**
1. El tutor presenta la situación y se escucha el diálogo en audio, con el texto oculto (después puedes ver la transcripción y la traducción).
2. Demuestras qué comprendiste: preguntas de opción múltiple y una respuesta oral.
3. El tutor enseña 4 frases útiles y tú las repites en voz alta.
4. Conversación de rol acorde a tu nivel: el tutor recuerda el contexto (tu nombre, lo que pediste, tu destino…) y hace una sola pregunta a la vez.
5. Corrección concreta con **«Lo que dijiste»**, **«Una forma más natural»** e **«Inténtalo de nuevo»**.
6. Las frases difíciles se guardan para repasarlas después.

**El tutor**
- Los tutores realistas se animan por cuadros: boca cerrada, entreabierta, abierta y redonda, parpadeo y 4 expresiones. Los cuadros cambian al ritmo de la voz. Las imágenes van en `public/assets/chars/<id>/`. Si faltan, la app usa un dibujo o la inicial del tutor.
- Está integrado en el escenario (columna izquierda en computadora, franja superior en celular) y nunca tapa preguntas ni controles.
- Tiene expresiones: saludar, escuchar, pensar, celebrar y corregir con amabilidad, además de parpadeo y respiración.
- **Habla de verdad**: en inglés durante la práctica y en español de México para las instrucciones. La boca se mueve sincronizada con el audio (ver «Cómo funciona la voz»).
- Controles: **Repetir**, **Lento**, **Subtítulos** y **Silenciar**. Cuando está silenciado solo muestra subtítulos y la boca no se mueve: la app no finge que habla.

**Se guarda** (en el navegador, `localStorage`): nivel, resultado del examen, lecciones completadas, tiempo hablado, sesiones, frases por repasar y ajustes.

## Cómo ejecutarla

Necesitas **Node.js 18 o superior**. No hay dependencias que instalar.

```bash
cd charla-ingles
npm start              # compila src/ → public/index.html y abre el servidor
# abre http://localhost:8080 en Chrome o Edge y permite el micrófono
```

Sin Node también funciona con cualquier servidor estático:

```bash
python3 -m http.server 8080 -d public
```

> El reconocimiento de voz del navegador exige `https://` o `http://localhost`. Si abres `index.html` con doble clic (`file://`), Chrome puede bloquear o volver a pedir el micrófono.

**Desde el celular:** con un servidor local, abre `http://IP-de-tu-computadora:8080`. Para el micrófono, el celular necesita **HTTPS**: publica la carpeta `public/` en cualquier hosting con HTTPS (Netlify, Vercel, GitHub Pages o Cloudflare Pages) o usa un túnel como `cloudflared tunnel --url http://localhost:8080`.

### Compatibilidad de voz y micrófono

| Navegador | Voz del tutor | Hablarle al tutor |
|---|---|---|
| Chrome / Edge (computadora y Android) | ✅ | ✅ (Web Speech API) |
| Safari (Mac / iPhone) | ✅ | ⚠️ Depende de la versión; si no está disponible, la app pasa a respuestas escritas |
| Firefox | ✅ | ❌ → respuestas escritas |

En Chrome, el reconocimiento de voz envía el audio al servicio de Google para convertirlo en texto. La app no graba ni guarda audio: solo guarda el texto de tus respuestas en tu navegador.

## Cómo funciona la voz (y qué se evalúa)

La app elige automáticamente el mejor recurso disponible:

| | 1.ª opción | 2.ª opción | 3.ª opción |
|---|---|---|---|
| **Voz** | Servidor `/api/tts` (OpenAI TTS): audio real, la boca sigue la **amplitud de la señal** | Voz de Claude (cuando está publicada en claude.ai) | `speechSynthesis` del navegador: la boca sigue los **eventos de cada palabra** y una línea de tiempo de sílabas |
| **Oído** | Dictado de Claude (en claude.ai) | Web Speech API del navegador | Respuestas escritas |
| **Pronunciación** | Servidor `/api/pronunciation` (Azure Speech): calificación real del audio | — | Grabar y compararte con el modelo (sin calificación) |
| **Conversación** | Servidor `/api/chat` (Claude vía API de Anthropic) | IA de Claude (en claude.ai) | Motor local de reglas (sin internet) |

**Honestidad sobre la evaluación.** La app **no evalúa pronunciación**. Convierte tu voz en texto y compara ese texto con la frase objetivo («Coincidencia del texto reconocido»). También califica contenido y gramática de tus respuestas abiertas. Así lo dice en pantalla.

## Configurar APIs externas (opcional)

Sin llaves, todo funciona con la voz y el micrófono del navegador y con el motor local. Para respuestas más naturales y una voz neuronal:

```bash
cp .env.example .env
# edita .env:
#   ANTHROPIC_API_KEY=...   → conversación y correcciones con IA (console.anthropic.com)
#   OPENAI_API_KEY=...      → voz neuronal con sincronía de boca por amplitud (platform.openai.com)
npm start
```

- Las llaves viven solo en el servidor (`server.mjs`); el navegador nunca las ve.
- Los modelos y voces se cambian en `.env` (`ANTHROPIC_MODEL`, `OPENAI_TTS_MODEL`, `VOICE_FOX`…). Revisa la documentación de cada proveedor para ver los nombres vigentes.
- La pantalla **Ajustes (⚙️)** muestra qué recurso está activo para voz, micrófono y conversación.

### Activar la evaluación de pronunciación (Azure Speech)

1. Entra a https://portal.azure.com y crea un recurso **Speech** (el plan gratuito **F0** incluye horas de audio al mes).
2. En el recurso, abre «Keys and Endpoint» y copia **Key 1** y la **Location/Region** (por ejemplo, `eastus`).
3. En tu `.env` agrega:
   ```
   AZURE_SPEECH_KEY=tu_llave
   AZURE_SPEECH_REGION=eastus
   ```
4. Ejecuta `npm start`. En **Pronunciación** debe aparecer «✅ Evaluación activa».

Cómo funciona: el navegador graba tu voz en WAV de 16 kHz y la envía a `/api/pronunciation` en `server.mjs`. El servidor la reenvía a Azure (*Pronunciation Assessment*, REST de audio corto, máximo 30 s) junto con la frase de referencia. Azure devuelve puntajes por palabra y por sonido, y la app los traduce a consejos en español. La llave nunca llega al navegador.

Sin Azure, el módulo sigue funcionando para practicar y escucharte, pero indica claramente que **no está evaluando tu pronunciación**. La evaluación tampoco funciona en la versión publicada en claude.ai, porque ahí no hay servidor propio.

## Estructura

```
charla-ingles/
├── src/
│   ├── index.html      plantilla (encabezado, escenario del tutor, panel)
│   ├── styles.css      identidad visual y diseño adaptable
│   ├── content.js      lecciones, banco del examen, temas de conversación  ← edita aquí
│   ├── characters.js   personajes SVG animables y escenarios
│   ├── engine.js       correcciones, comparación de frases, diálogos, calificación, prompts de IA
│   ├── voice.js        voz, micrófono, sincronía de boca, IA
│   └── app.js          pantallas y flujo
├── public/index.html   app compilada en un solo archivo (lista para publicar)
├── server.mjs          servidor opcional + proxy de APIs
├── build.mjs           une src/ en public/index.html
├── demo/demo.py        demostración automática (Playwright)
└── .env.example
```

**Agregar una lección:** copia un objeto de `LESSONS` en `src/content.js` y cambia la situación, las preguntas, las frases, los turnos de conversación (`ask`, `expect`, `reply`) y las correcciones. Después ejecuta `npm run build`.

## Demostración automática

```bash
npm start                                # terminal 1
pip install playwright && playwright install chrome
python3 demo/demo.py                     # terminal 2
```

Recorre todo el flujo (personaje → examen → resultados → plan → lección completa → conversación libre → progreso) y guarda capturas y video en `demo/capturas/`. Un navegador automatizado no tiene altavoces ni micrófono, así que el script **simula** la voz del navegador y el micrófono con respuestas guionizadas. Para probar la voz real, abre la app en Chrome.

## Límites de esta primera versión

- 6 lecciones de ejemplo y un banco de examen corto: el nivel es una estimación orientativa.
- Sin IA configurada, la conversación usa reglas: entiende respuestas esperadas y variantes comunes, pero no cualquier frase.
- El progreso vive en un solo navegador; no hay cuentas ni sincronización entre dispositivos.
