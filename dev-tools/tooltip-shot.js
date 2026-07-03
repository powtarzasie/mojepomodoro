// Zrzut dymka na listwie: najedz (CDP Input.dispatchMouseEvent) na przycisk w oknie tray
// i zrob Page.captureScreenshot calego okna (dymek CSS :hover jest wtedy wyrenderowany).
// Uzycie: node tooltip-shot.js <idPrzycisku|-> <plikWyjsciowy.png> [wyrazenieSetup]
//   idPrzycisku '-' = bez hovera (sam zrzut ukladu listwy)
const [,, btnId, outFile, setupExpr] = process.argv
const fs = require('fs')

async function connect(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl)
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
    const c = await connect(t)
    const role = await evalJs(c, `(typeof ROLE!=='undefined')?ROLE:null`)
    if (role !== 'tray') { c.ws.close(); continue }
    if (setupExpr) {
      console.log('setup:', await evalJs(c, setupExpr))
      await new Promise(r => setTimeout(r, 500))
    }
    if (btnId !== '-') {
      const rect = await evalJs(c, `(() => {
        const b = document.getElementById('${btnId}'); if (!b) return null
        const r = b.getBoundingClientRect()
        return JSON.stringify({ x: r.x + r.width/2, y: r.y + r.height/2, display: getComputedStyle(b).display })
      })()`)
      console.log('przycisk:', rect)
      const p = JSON.parse(rect)
      await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y })
      await new Promise(r => setTimeout(r, 350))
    }
    const shot = await c.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(outFile, Buffer.from(shot.result.data, 'base64'))
    console.log('zapisano', outFile)
    c.ws.close()
    process.exit(0)
  }
  console.log('BRAK okna tray')
  process.exit(1)
})()
