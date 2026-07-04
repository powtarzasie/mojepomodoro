// Generuje zrzuty 1:1 do slajdow onboardingu z ZYWEJ aplikacji (Page.captureScreenshot przez CDP).
// Dzieki temu ekrany samouczka sa pikselowo zgodne z produkcja i mozna je odswiezyc jednym przebiegiem
// po kazdej zmianie UI (WYMOG Mariusza — nie rysujemy makiet).
//
// Wymaga: aplikacja uruchomiona z --remote-debugging-port=9222 (dev lub packaged) i WYSTARTOWANA
//         (po onboardingu — istnieja okna overlay/tray/manager/focus).
// UWAGA: mutuje stan (zadania/fazy). Przed uzyciem backup %APPDATA%\pomodoro-overlay\pomodoro.json,
//        po zrzutach przywroc (patrz dev-tools/README.md „Zasady testow").
// Uzycie: node dev-tools/capture-onboarding.js
const fs = require('fs')
const path = require('path')
const OUT = path.join(__dirname, '..', 'assets', 'onboarding')
const PORT = 9222
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function pages() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
  return list.filter(t => t.type === 'page')
}
async function open(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let nextId = 1
  const pending = new Map()
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } }
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = nextId++; pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
    setTimeout(() => rej(new Error('timeout ' + method)), 8000)
  })
  return { send, close: () => ws.close() }
}
const evalJs = async (c, expr) => {
  const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r.result && r.result.result ? r.result.result.value : undefined
}
async function shot(c, file, clip) {
  const params = { format: 'png' }
  if (clip) params.clip = clip
  const r = await c.send('Page.captureScreenshot', params)
  fs.writeFileSync(path.join(OUT, file), Buffer.from(r.result.data, 'base64'))
  console.log('  zapisano', file)
}
// Wszystkie komendy przez window.bridge.cmd (preload wystawia `bridge` w KAZDYM oknie;
// w managerze `api` to alias na bridge — uzywamy bezposrednio bridge dla spojnosci).
const cmd = (c, name) => evalJs(c, `window.bridge.cmd(${JSON.stringify(name)}); true`)

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const wins = {}
  for (const t of await pages()) {
    const c = await open(t)
    const role = await evalJs(c, `(typeof ROLE!=='undefined')?ROLE:null`)
    if (role === 'overlay') wins.overlay = c
    else if (role === 'tray') wins.tray = c
    else if (role === 'focus') wins.focus = c
    else if (t.url.includes('manager.html')) wins.manager = c
    else c.close()
  }
  for (const k of ['overlay', 'tray', 'focus', 'manager']) {
    if (!wins[k]) { console.log('BRAK okna:', k, '- czy apka wystartowana (po onboardingu)?'); process.exit(1) }
  }

  // Przykladowe, „ladne" zadania — zrzuty maja pokazac sensowna tresc, nie pusta liste.
  const tasks = [
    { id: 1, name: 'Przygotować ofertę dla klienta', totalMinutes: 30 },
    { id: 2, name: 'Przegląd i odpowiedzi na maile', totalMinutes: 15 },
    { id: 3, name: 'Sesja projektowania interfejsu', totalMinutes: 45 },
  ]
  const settings = { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakAfter: 4 }
  console.log('Ustawiam przykladowe zadania...')
  await evalJs(wins.manager, `window.bridge.cmd('saveTasks', ${JSON.stringify({ tasks, settings })}); true`)
  await sleep(700)

  // 01 — mini-listwa (tray) z aktywnym zadaniem i biegnacym czasem (collapsedMode zostaje)
  console.log('01 listwa...')
  await cmd(wins.overlay, 'toggle')
  await sleep(900)
  await shot(wins.tray, '01-listwa.png')

  // 02 — rozwiniety widget, przyciety do #widget (tlo overlay jest przezroczyste -> na slajdzie
  //      ciemna karta .shot je maskuje; okno tray/manager/focus sa nieprzezroczyste)
  console.log('02 widget...')
  await cmd(wins.overlay, 'expandWidget')
  await sleep(700)
  const rect = await evalJs(wins.overlay, `(() => { const e=document.getElementById('widget'); if(!e) return null; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.x,y:r.y,w:r.width,h:r.height}) })()`)
  let clip = null
  if (rect) { const p = JSON.parse(rect); clip = { x: Math.max(0, p.x - 10), y: Math.max(0, p.y - 10), width: p.w + 20, height: p.h + 20, scale: 1 } }
  await shot(wins.overlay, '02-widget.png', clip)

  // 06 — Manager (osobne okno)
  console.log('06 manager...')
  await cmd(wins.overlay, 'openManager')
  await sleep(700)
  await shot(wins.manager, '06-manager.png')

  // 03 — kurtyna przerwy (skipPhase: praca -> przerwa => breakExpanded + expandOverlay)
  console.log('03 przerwa...')
  await cmd(wins.overlay, 'skipPhase')
  await sleep(900)
  await shot(wins.overlay, '03-przerwa.png')

  // 04 — ekran PRACA (skipPhase: przerwa -> praca => workStartExpanded)
  console.log('04 praca...')
  await cmd(wins.overlay, 'skipPhase')
  await sleep(900)
  await shot(wins.overlay, '04-praca.png')

  // 05 — tryb skupienia (zamknij ekran PRACA, wejdz w focus w fazie pracy)
  console.log('05 skupienie...')
  await cmd(wins.overlay, 'shrinkWork')
  await sleep(400)
  await cmd(wins.overlay, 'enterFocus')
  await sleep(900)
  await shot(wins.focus, '05-skupienie.png')

  console.log('GOTOWE — zrzuty w', OUT)
  process.exit(0)
})().catch(e => { console.log('BLAD', e.message); process.exit(1) })
