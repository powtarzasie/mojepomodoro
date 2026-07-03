// Zrzut ekranu DOWOLNEGO okna aplikacji przez CDP (Page.captureScreenshot).
// W odroznieniu od tooltip-shot.js (tylko tray) wybiera okno po roli/URL i umie
// przyciac zrzut do elementu (np. samego widgetu w pelnoekranowym oknie overlay).
// Uzycie: node window-shot.js <rola|plik> <plikWyjsciowy.png> [idElementuDoPrzyciecia]
//   rola: overlay | tray | focus  (okna overlay.html po zmiennej ROLE)
//   plik: manager | help | terms  (dopasowanie po nazwie pliku w URL)
//   idElementu np. 'widget' = przytnij do prostokata elementu (+8px marginesu)
const [,, target, outFile, clipId] = process.argv
const fs = require('fs')

async function connect(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let nextId = 1
  const pending = new Map()
  ws.onmessage = m => {
    const d = JSON.parse(m.data)
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) }
  }
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = nextId++
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
    setTimeout(() => rej(new Error('timeout ' + method)), 8000)
  })
  return { ws, send }
}
const evalJs = async (c, expr) => {
  const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true })
  return r.result && r.result.result ? r.result.result.value : undefined
}

;(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json()
  for (const t of list.filter(x => x.type === 'page')) {
    const byFile = t.url.includes(`${target}.html`)
    const c = await connect(t)
    const role = await evalJs(c, `(typeof ROLE!=='undefined')?ROLE:null`)
    if (role !== target && !byFile) { c.ws.close(); continue }
    const params = { format: 'png' }
    if (clipId) {
      const rect = await evalJs(c, `(() => {
        const e = document.getElementById('${clipId}'); if (!e) return null
        const r = e.getBoundingClientRect()
        return JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height })
      })()`)
      if (!rect) { console.log('BRAK elementu', clipId); process.exit(1) }
      const p = JSON.parse(rect)
      params.clip = { x: Math.max(0, p.x - 8), y: Math.max(0, p.y - 8), width: p.w + 16, height: p.h + 16, scale: 1 }
    }
    const shot = await c.send('Page.captureScreenshot', params)
    fs.writeFileSync(outFile, Buffer.from(shot.result.data, 'base64'))
    console.log('zapisano', outFile)
    c.ws.close()
    process.exit(0)
  }
  console.log('BRAK okna', target)
  process.exit(1)
})()
