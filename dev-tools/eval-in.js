// Ewaluuje wyrazenie JS w KONKRETNYM oknie Electrona (wybieranym po fragmencie URL) przez CDP.
// Uzupelnia cdp-probe.js (ten iteruje WSZYSTKIE okna) — tu celujemy w jedno, np. klikniecie
// przycisku w oknie onboarding.html bez ruszania pozostalych okien.
// Uzycie:
//   node eval-in.js list                         # wypisz URL-e wszystkich okien 'page'
//   node eval-in.js <urlFrag> "<wyrazenie JS>"   # eval w pierwszym oknie pasujacym do urlFrag
//   node eval-in.js <urlFrag> @sciezka.js        # wczytaj kod z PLIKU (omija escaping cudzyslowow w PS 5.1!)
// Przyklady:
//   node eval-in.js onboarding "location.href"
//   node eval-in.js onboarding @C:\tmp\klik.js   # gdy JS ma cudzyslowy/nawiasy — PS 5.1 je psuje w argv
const [,, target, expr] = process.argv
const fs = require('fs')

async function main() {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json()
  const pages = list.filter(t => t.type === 'page')
  if (!target || target === 'list') { pages.forEach(p => console.log(p.url)); process.exit(0) }

  // Kod z pliku (@sciezka) omija problem PS 5.1 z cudzyslowami w argumentach natywnych exe.
  let code = expr || 'null'
  if (code.startsWith('@')) code = fs.readFileSync(code.slice(1), 'utf8')

  const t = pages.find(p => p.url.includes(target))
  if (!t) { console.log('BRAK okna pasujacego do: ' + target); process.exit(1) }

  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  const r = await new Promise((res, rej) => {
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) res(d.result) }
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate',
      params: { expression: code, returnByValue: true, awaitPromise: true } }))
    setTimeout(() => rej(new Error('timeout')), 8000)
  })
  ws.close()
  if (r && r.exceptionDetails) {
    const ex = r.exceptionDetails.exception
    console.log('WYJATEK: ' + (ex && ex.description ? ex.description : r.exceptionDetails.text))
  } else {
    console.log(JSON.stringify(r && r.result ? r.result.value : r))
  }
  process.exit(0)
}
main().catch(e => { console.log('BLAD ' + e.message); process.exit(1) })
