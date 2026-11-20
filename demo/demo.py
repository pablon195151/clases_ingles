"""
Demostración automática del recorrido principal (Playwright + Chrome).
Simula la voz del navegador y el micrófono con respuestas guionizadas,
porque un navegador automatizado no tiene altavoces ni micrófono.
Uso:  npm start   (en otra terminal)   y luego   python3 demo/demo.py
"""
import json, sys, time, pathlib
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
OUT = pathlib.Path(__file__).parent / "capturas"
OUT.mkdir(exist_ok=True)

MOCK = r"""
(() => {
  // ---- Voz simulada: eventos onstart / onboundary / onend como en Chrome ----
  const voices = [{name:'Demo US English', lang:'en-US', default:true, localService:true, voiceURI:'demo-en'},
                  {name:'Demo Español MX', lang:'es-MX', default:false, localService:true, voiceURI:'demo-es'}];
  let current = null, timers = [];
  const synth = {
    speaking:false, pending:false, paused:false, onvoiceschanged:null,
    getVoices(){ return voices; },
    speak(u){
      current = u; this.speaking = true;
      const words = [...u.text.matchAll(/\S+/g)];
      const per = (window.__wordMs || 110) / (u.rate || 1);
      timers.push(setTimeout(()=>{ u.onstart && u.onstart({}); }, 30));
      words.forEach((m,i)=> timers.push(setTimeout(()=>{ u.onboundary && u.onboundary({name:'word', charIndex:m.index}); }, 40 + i*per)));
      timers.push(setTimeout(()=>{ this.speaking=false; current=null; window.__spoken=(window.__spoken||0)+1; u.onend && u.onend({}); }, 80 + words.length*per));
    },
    cancel(){ timers.forEach(clearTimeout); timers=[]; const u=current; current=null; this.speaking=false; if(u&&u.onerror) u.onerror({error:'interrupted'}); },
    pause(){}, resume(){}
  };
  Object.defineProperty(window, 'speechSynthesis', {value: synth, configurable:true});
  window.SpeechSynthesisUtterance = class { constructor(t){ this.text=t; this.rate=1; this.pitch=1; this.lang=''; this.voice=null; } };
  // ---- Micrófono simulado: devuelve la siguiente respuesta guionizada ----
  window.__answers = [];
  class FakeRec {
    constructor(){ this.lang='en-US'; this.interimResults=true; this.continuous=false; }
    start(){
      const text = window.__answers.length ? window.__answers.shift() : 'okay';
      const half = text.split(' ').slice(0, Math.ceil(text.split(' ').length/2)).join(' ');
      this._t = [
        setTimeout(()=> this.onresult && this.onresult({resultIndex:0, results:[Object.assign([{transcript:half}],{isFinal:false})]}), 500),
        setTimeout(()=> this.onresult && this.onresult({resultIndex:0, results:[Object.assign([{transcript:text}],{isFinal:true})]}), 1300),
        setTimeout(()=> this.onend && this.onend(), 1450)];
    }
    stop(){} abort(){ (this._t||[]).forEach(clearTimeout); this.onend && this.onend(); }
  }
  window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
})();
"""

shot_n = [0]
def shot(page, name):
    shot_n[0] += 1
    p = OUT / f"{shot_n[0]:02d}-{name}.png"
    page.screenshot(path=str(p))
    print("📸", p.name)

def quiet(page, ms=500):
    """Espera a que el tutor termine de hablar."""
    page.wait_for_function("""() => !speechSynthesis.speaking""", timeout=60000)
    page.wait_for_timeout(ms)
    page.wait_for_function("""() => !speechSynthesis.speaking""", timeout=60000)

def speak(page, text):
    page.evaluate("t => window.__answers.push(t)", text)
    page.locator(".answer:not(.done) .mic").last.click()
    page.wait_for_timeout(1800)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", args=["--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        ctx = browser.new_context(viewport={"width": 1280, "height": 800}, record_video_dir=str(OUT / "video"), record_video_size={"width": 1280, "height": 800})
        ctx.add_init_script(MOCK)
        page = ctx.new_page()
        page.on("pageerror", lambda e: print("PAGE ERROR:", e))
        page.on("console", lambda m: m.type == "error" and print("console:", m.text))
        page.goto(URL); page.wait_for_timeout(800)
        page.evaluate("localStorage.clear()"); page.reload(); page.wait_for_timeout(800)
        shot(page, "bienvenida")

        # Bienvenida: nombre y personaje
        page.fill("#nameIn", "Ana")
        page.click(".char-card[data-c=fox]")
        page.wait_for_timeout(900); shot(page, "tutor-saluda")
        quiet(page)
        page.click("#startTest")

        # Examen inicial
        quiet(page)
        page.wait_for_selector(".mic"); shot(page, "examen-microfono")
        speak(page, "Hello, I'm ready!")
        quiet(page)
        bank = page.evaluate("JSON.stringify({L:TEST_BANK.L.map(i=>[i.q,i.options[0],i.d]),V:TEST_BANK.V.map(i=>[i.sentence,i.options[0],i.d])})")
        bank = json.loads(bank)
        open_answers = {
            1: "My name is Ana and I'm from Monterrey, Mexico.",
            2: "I usually go to the park with my family and I watch movies.",
            3: "Last year I went to Oaxaca with my sister. We ate mole and visited the markets, it was amazing.",
            4: "I would build more bike lanes and plant more trees, because the traffic is terrible.",
            5: "I think remote work is better for focus, but I have 30 years and I miss my coworkers sometimes."}
        conv = ["I work in logistics, I'm a support analyst for a retail company.", "I like to play soccer and cook with my family on weekends.", "Because I want to travel and get a better job."]
        ci = 0; shots_taken = set()
        for step in range(40):
            if page.locator(".results").count(): break
            page.wait_for_function("""() => document.querySelector('.results') || document.querySelector('#q:not([hidden]) .opt:not(:disabled)') || document.querySelector('.sentence ~ .opts .opt:not(:disabled)') || document.querySelector('.answer:not(.done) .mic')""", timeout=60000)
            title = page.inner_text("#tTitle") if page.locator("#tTitle").count() else ""
            quiet(page, 300)
            if page.locator(".results").count(): break
            if page.locator("#q:not([hidden]) .opt:not(:disabled)").count():
                q = page.inner_text("#q h3")
                item = next(i for i in bank["L"] if i[0] == q)
                ans = item[1] if item[2] <= 4 else "Sale este trimestre sin cambios"
                if "auditiva" not in shots_taken: shot(page, "examen-escucha"); shots_taken.add("auditiva")
                page.locator("#q .opt", has_text=ans).first.click()
            elif page.locator(".sentence").count() and page.locator(".opts .opt:not(:disabled)").count():
                s = page.inner_text(".sentence").replace("_____", "___")
                item = next(i for i in bank["V"] if i[0].replace(" ", "") == s.replace(" ", ""))
                ans = item[1] if item[2] <= 4 else "make"
                if "vocab" not in shots_taken: shot(page, "examen-vocabulario"); shots_taken.add("vocab")
                page.locator(".opts .opt", has_text=ans).first.click()
            elif page.locator(".answer:not(.done) .mic").count():
                if "Conversación" in title:
                    if "conv" not in shots_taken and ci == 1: shot(page, "examen-conversacion"); shots_taken.add("conv")
                    speak(page, conv[min(ci, 2)]); ci += 1
                elif "Expresión" in title:
                    phrase = page.evaluate("Voice.last[Voice.last.length-1].text")
                    if "rep" not in shots_taken: shot(page, "examen-repetir"); shots_taken.add("rep")
                    speak(page, phrase.replace(",", ""))
                else:
                    q = page.evaluate("Voice.last[Voice.last.length-1].text")
                    d = page.evaluate("JSON.stringify(TEST_BANK.S.find(i=>i.en===%s)?.d || 3)" % json.dumps(q))
                    speak(page, open_answers.get(int(d), open_answers[3]))
            page.wait_for_timeout(600)
        page.wait_for_selector(".results"); page.wait_for_timeout(1200)
        shot(page, "resultados")
        page.evaluate("document.querySelector('#view').scrollIntoView()"); page.mouse.wheel(0, 700); page.wait_for_timeout(500)
        shot(page, "resultados-detalle")
        quiet(page)
        page.click("#toGoal"); quiet(page)
        page.click(".goal-card[data-g=viajes]"); page.wait_for_timeout(700); shot(page, "objetivo-y-plan"); quiet(page)
        page.click("#savePlan"); page.wait_for_timeout(800); shot(page, "plan-de-estudio"); quiet(page)

        # Lección
        page.click("#startSession"); page.wait_for_timeout(2500); shot(page, "leccion-1-escucha")
        page.wait_for_selector("#next:not([disabled])", timeout=90000)
        page.click("#tx"); page.wait_for_timeout(300); shot(page, "leccion-1-texto")
        page.click("#next")
        L = json.loads(page.evaluate("JSON.stringify(LESSONS.find(x=>x.title===document.querySelector('.lesson h1').textContent))"))
        # Comprensión
        for qi, q in enumerate(L["comprehension"]):
            quiet(page, 300)
            if q.get("spoken"):
                page.wait_for_selector(".answer:not(.done) .mic"); shot(page, "leccion-2-respuesta-oral")
                speak(page, q["model"]); quiet(page); page.click("#next")
            else:
                page.wait_for_selector(".opts .opt:not(:disabled)")
                if qi == 0: shot(page, "leccion-2-comprension")
                page.locator(".opts .opt", has_text=q["options"][0]).first.click()
                page.wait_for_timeout(1200); quiet(page, 900)
        # Frases útiles
        for pi, ph in enumerate(L["phrases"]):
            page.wait_for_selector(".answer:not(.done) .mic", timeout=60000); quiet(page, 200)
            said = ph["en"] if pi != 2 else "I like a window seat"
            speak(page, said); page.wait_for_selector("#next"); page.wait_for_timeout(500)
            if pi in (0, 2): shot(page, f"leccion-3-frase-{pi+1}")
            quiet(page); page.click("#next")
        # Conversación
        convo = ["I want to go to Cancun", "Sure, here you go.", "Yes, one suitcase.", "I want a window seat", "No, I'm traveling alone."]
        k = 0
        while True:
            page.wait_for_function("() => document.querySelector('.answer:not(.done) .mic') || document.querySelector('#ans #next')", timeout=60000)
            quiet(page, 300)
            if page.locator("#ans #next").count(): break
            speak(page, convo[min(k, len(convo) - 1)]); k += 1
            if k == 4: page.wait_for_timeout(600); shot(page, "leccion-4-conversacion")
        shot(page, "leccion-4-conversacion-fin")
        page.click("#ans #next")
        # Corrección
        page.wait_for_selector(".corr"); quiet(page); shot(page, "leccion-5-correccion")
        natural = page.inner_text(".corr-row.natural p")
        speak(page, natural); page.wait_for_selector("#fb #next"); page.wait_for_timeout(400); shot(page, "leccion-5-nuevo-intento")
        quiet(page); page.click("#fb #next")
        # Guardar frases
        page.wait_for_selector("#finish"); quiet(page); shot(page, "leccion-6-repaso")
        page.click("#finish"); page.wait_for_timeout(1200); shot(page, "leccion-terminada"); quiet(page)

        # Conversación libre
        page.click("#toFree"); quiet(page); page.click("[data-t=comida]")
        for ans in ["I love tacos!", "I eat them every weekend with my family.", "I have 30 years and I cook a lot."]:
            page.wait_for_selector(".answer:not(.done) .mic", timeout=60000); quiet(page, 300)
            speak(page, ans)
        page.wait_for_selector(".answer:not(.done) .mic", timeout=60000); quiet(page, 300)
        shot(page, "conversacion-libre-correccion")
        page.locator("#chat .retry-btn").last.click(); page.wait_for_timeout(400)
        speak(page, "I'm 30 years old and I cook a lot."); page.wait_for_timeout(800); quiet(page, 300)
        shot(page, "conversacion-libre-nuevo-intento")
        page.click("#endChat"); page.wait_for_timeout(800); shot(page, "conversacion-libre-fin")

        # Progreso
        page.click("#nav button[data-go=progress]"); page.wait_for_timeout(800); shot(page, "progreso")
        state = page.evaluate("localStorage.getItem('charla-ingles.v1')")
        (OUT / "estado-guardado.json").write_text(json.dumps(json.loads(state), indent=2, ensure_ascii=False))

        # Vista de celular
        page.set_viewport_size({"width": 390, "height": 844})
        page.click("#nav button[data-go=plan]"); page.wait_for_timeout(1500); shot(page, "celular-plan")
        page.click("#nav button[data-go=progress]"); page.wait_for_timeout(600); shot(page, "celular-progreso")
        page.click("#nav button[data-go=lessons]"); page.wait_for_timeout(300)
        page.locator("[data-lesson=cafe]").click(); page.wait_for_timeout(3500); shot(page, "celular-leccion")
        ctx.close()

        # Práctica de pronunciación con una respuesta de Azure SIMULADA (para mostrar la pantalla sin llave real)
        fake = json.loads(open(pathlib.Path(__file__).parent / "azure-simulado.json").read())
        ctx2 = browser.new_context(viewport={"width": 1280, "height": 860}, permissions=["microphone"])
        ctx2.add_init_script(MOCK + ";window.__wordMs=60;")
        ctx2.route("**/api/config", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"chat": False, "tts": False, "pronunciation": True})))
        ctx2.route("**/api/pronunciation*", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(fake)))
        pg = ctx2.new_page(); pg.goto(URL); pg.wait_for_timeout(600)
        pg.evaluate("S.character='sofia'; S.levelIdx=2; S.goal='viajes'; S.test={skipped:true}; save()"); pg.reload(); pg.wait_for_timeout(1200)
        pg.click("#nav button[data-go=practice]"); pg.wait_for_timeout(1500); shot(pg, "pronunciacion-inicio")
        pg.click("[data-set=th]"); pg.wait_for_function("()=>!speechSynthesis.speaking", timeout=30000); pg.wait_for_timeout(800)
        pg.wait_for_selector(".pron-ans .mic"); pg.click(".pron-ans .mic"); pg.wait_for_timeout(1600); pg.click(".pron-ans .mic")
        pg.wait_for_selector(".pron-res", timeout=15000); pg.wait_for_timeout(1800); shot(pg, "pronunciacion-resultado")
        ctx2.close(); browser.close()
        print("Listo. Capturas en", OUT)

if __name__ == "__main__":
    main()
