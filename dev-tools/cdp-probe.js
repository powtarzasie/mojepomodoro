// Sonda CDP: odpytuje okna Electrona (overlay/tray/manager) o stan renderera.
// Uzycie: node cdp-probe.js '<wyrazenie JS>'   (domyslnie: raport stanu listwy)
const EXPR = process.argv[2] || `(() => {
  const roleV = (typeof ROLE !== 'undefined') ? ROLE : null
  const s = (typeof lastState !== 'undefined' && lastState) ? lastState : null
  const tb = document.getElementById('tb-done')
  const tbBar = document.getElementById('taskbar-view')
  return JSON.stringify({
    role: roleV,
    phase: s && s.phase, running: s && s.isRunning, left: s && s.phaseLeft,
    askDone: s && s.askDone, collapsed: s && s.collapsedMode,
    nTasks: s && s.tasks ? s.tasks.length : null, idx: s && s.currentIdx,
    curTask: s && s.tasks && s.tasks[s.currentIdx] ? s.tasks[s.currentIdx].name : null,
    tbDoneDisplay: tb ? (tb.style.display === '' ? 'VISIBLE' : tb.style.display) : 'brak-elementu',
    barShown: tbBar ? tbBar.style.display : null,
  })
})()`

async function evalOn(target, expr) {
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  const result = await new Promise((res, rej) => {
    ws.onmessage = m => {
      const d = JSON.parse(m.data)
      if (d.id === 1) res(d.result)
    }
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }))
    setTimeout(() => rej(new Error('timeout')), 5000)
  })
  ws.close()
  return result
}

;(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json()
  const pages = list.filter(t => t.type === 'page')
  for (const t of pages) {
    try {
      const r = await evalOn(t, EXPR)
      const val = r && r.result ? r.result.value : JSON.stringify(r)
      console.log(`--- ${t.url.split('/').pop()} :: ${val}`)
    } catch (e) {
      console.log(`--- ${t.url.split('/').pop()} :: BLAD ${e.message}`)
    }
  }
  process.exit(0)   // nie zostawiaj procesu żywego, gdy websocket po timeoucie wisi otwarty
})()
