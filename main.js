// Pomodoro Overlay Timer v1.3.1
// Copyright (c) 2026 Mariusz Świerguła <Mariusz.swiergula@gmail.com>
// MIT License — https://opensource.org/licenses/MIT
//
// main.js — Electron main process: timer logic, window management
const { app, BrowserWindow, ipcMain, screen, globalShortcut, powerMonitor, shell, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')

// UWAGA: NIE wyłączać akceleracji sprzętowej (app.disableHardwareAcceleration()).
// Okno nakładki jest transparent:true — na Windows przezroczystość polega na
// kompozytorze GPU. Bez akceleracji okno przestaje się odrysowywać (zamarza /
// czernieje): timer liczy w tle, ale ekran stoi — wygląda jakby „się nie odpalał".
// Migotanie przy zmianie praca↔przerwa rozwiązane architektonicznie: jedno okno stałe
// na cały ekran, nigdy nieskalowane/niechowane — patrz komentarz przy createOverlay.

const DATA_FILE = path.join(app.getPath('userData'), 'pomodoro.json')

// ── Log ukończonych zadań (plan vs. fakt) ─────────────────────────────
// CSV w Dokumenty\PomodoroOverlay — otwieralny w Excelu, źródło prawdy dla
// zakładki „Historia". Separator ';' (przyjazny polskiemu Excelowi), BOM dla UTF-8.
const LOG_DIR    = path.join(app.getPath('documents'), 'PomodoroOverlay')
const LOG_FILE   = path.join(LOG_DIR, 'pomodoro-log.csv')
const LOG_DELIM  = ';'
const LOG_COLS   = ['completedAt', 'taskName', 'plannedMin', 'actualMin', 'actualSec', 'pomodoros', 'deltaMin', 'status']
const LOG_HEADER = '﻿' + LOG_COLS.join(LOG_DELIM) + '\n'

let logInit  = null                // wspólna obietnica inicjalizacji logu (folder + nagłówek raz)
let logChain = Promise.resolve()   // łańcuch serializujący dopisania (kolejność + brak wyścigu)
// Zapewnia istnienie folderu i nagłówka — jednorazowo (jedna obietnica → brak podwójnego nagłówka
// przy równoległych wywołaniach). Zwraca Promise (nie blokuje).
function ensureLogReady() {
  if (!logInit) {
    logInit = new Promise(resolve => {
      fs.mkdir(LOG_DIR, { recursive: true }, () => {
        fs.access(LOG_FILE, fs.constants.F_OK, err => {
          if (err) fs.writeFile(LOG_FILE, LOG_HEADER, () => resolve())
          else     resolve()
        })
      })
    })
  }
  return logInit
}

function pad2n(n) { return String(n).padStart(2, '0') }
function fmtLocalDateTime(d) {
  return `${d.getFullYear()}-${pad2n(d.getMonth() + 1)}-${pad2n(d.getDate())} ` +
         `${pad2n(d.getHours())}:${pad2n(d.getMinutes())}:${pad2n(d.getSeconds())}`
}
// Escapowanie pola CSV: cudzysłów, gdy zawiera separator / cudzysłów / nową linię.
function csvField(v) {
  const s = String(v == null ? '' : v)
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

// Dopisuje wiersz logu dla ukończonego/pominiętego zadania. taskSpent = realne sekundy pracy.
function logTaskCompletion(task, status) {
  if (!task) return
  const plannedMin = task.totalMinutes || 0
  const actualSec  = S.taskSpent || 0
  const actualMin  = Math.round(actualSec / 60)
  const deltaMin   = actualMin - plannedMin
  const row = [
    fmtLocalDateTime(new Date()),
    csvField(task.name),
    plannedMin, actualMin, actualSec, S.pomsDone || 0,
    (deltaMin > 0 ? '+' : '') + deltaMin,
    status,
  ].join(LOG_DELIM) + '\n'
  logChain = logChain
    .then(ensureLogReady)
    .then(() => new Promise(res => fs.appendFile(LOG_FILE, row, () => res())))
    .catch(() => {})
}

// ── Parser CSV (na potrzeby odczytu logu i importu zadań) ─────────────
// Obsługuje pola w cudzysłowach, escapowane "" oraz konfigurowalny separator.
function parseCSV(text, delim) {
  const rows = []
  let row = [], field = '', i = 0, inQ = false
  while (i < text.length) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQ = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"') { inQ = true; i++; continue }
    if (c === delim) { row.push(field); field = ''; i++; continue }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    if (c === '\r') { i++; continue }
    field += c; i++
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}
// Wykrycie separatora z pierwszej linii (polski Excel = ';', inne = ',' lub tab).
function detectDelim(firstLine) {
  const counts = { ';': 0, ',': 0, '\t': 0 }
  for (const ch of firstLine) if (ch in counts) counts[ch]++
  let best = ',', max = -1
  for (const d of [';', ',', '\t']) if (counts[d] > max) { max = counts[d]; best = d }
  return best
}

const NAME_KEYS = ['name', 'task', 'content', 'zadanie', 'nazwa', 'title', 'todo', 'opis']
const MIN_KEYS  = ['min', 'minutes', 'minuty', 'duration', 'estimate', 'czas', 'time', 'długość', 'dlugosc']
function matchCol(header, keys) {
  for (let i = 0; i < header.length; i++) {
    const h = String(header[i] || '').trim().toLowerCase()
    if (keys.some(k => h === k)) return i                    // dokładna etykieta — zawsze nagłówek
    if (h.length > 24 || h.split(/\s+/).length > 2) continue // zdanie = treść zadania, nie etykieta
    if (keys.some(k => h.includes(k))) return i              // np. „nazwa zadania", „czas (min)"
  }
  return -1
}
// Z surowego CSV → lista {name, totalMinutes}. Auto-mapowanie kolumn, domyślnie 25 min.
function parseTasksFromCSV(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const delim = detectDelim(firstLine)
  const rows = parseCSV(text, delim).filter(r => r.some(c => String(c).trim() !== ''))
  if (!rows.length) return []

  // Wiersz z czysto liczbową komórką to dane, nie nagłówek — chroni pliki bez
  // nagłówka, których pierwsze zadanie zawiera słowo-klucz (np. „Przygotować zadanie…;30").
  const isNum = c => /^\s*-?\d+([.,]\d+)?\s*$/.test(String(c))
  const headerCandidate = !rows[0].some(isNum)
  let nameIdx = headerCandidate ? matchCol(rows[0], NAME_KEYS) : -1
  let minIdx  = headerCandidate ? matchCol(rows[0], MIN_KEYS)  : -1
  let dataRows = rows
  if (nameIdx >= 0 || minIdx >= 0) {
    dataRows = rows.slice(1)               // pierwszy wiersz to nagłówek
  } else {
    nameIdx = 0                            // brak nagłówka: kol. 0 = nazwa, kol. 1 = minuty
    minIdx  = rows[0].length > 1 ? 1 : -1
  }
  if (nameIdx < 0) nameIdx = 0

  const out = []
  for (const r of dataRows) {
    const name = String(r[nameIdx] == null ? '' : r[nameIdx]).trim()
    if (!name) continue
    let mins = 25
    if (minIdx >= 0) {
      // parseFloat + zamiana przecinka: „1,5" / „1.5" → 2 min (nie 15)
      const m = parseFloat(String(r[minIdx]).trim().replace(',', '.').replace(/[^\d.\-]/g, ''))
      if (!isNaN(m)) mins = Math.round(m)
    }
    mins = Math.max(1, Math.min(480, mins))
    out.push({ name: name.slice(0, 200), totalMinutes: mins })
  }
  return out
}

// ── Pojedyncza instancja (drugie uruchomienie tylko pokazuje managera) ──
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) app.quit()

function readSaved() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }
  catch (_) {}
  return null
}

// Zapis stanu: debounced + asynchroniczny — nie blokuje pętli main / timera.
let saveTimer = null
let lastSavedSpentMin = 0   // ostatnia zapisana pełna minuta taskSpent (zapis postępu co minutę)
function snapshot() {
  return JSON.stringify({
    tasks: S.tasks, settings: S.settings, size: S.size, opacity: S.opacity, pos: S.pos,
    // Postęp bieżącej sesji — pozwala wznowić ostatnie zadanie z odłożonym czasem.
    currentIdx: S.currentIdx, taskSpent: S.taskSpent, pomsDone: S.pomsDone,
    termsVersion: S.termsVersion,
  }, null, 2)
}
function writeSaved() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { fs.writeFile(DATA_FILE, snapshot(), () => {}) }, 400)
}
function flushSaved() {
  clearTimeout(saveTimer)
  try { fs.writeFileSync(DATA_FILE, snapshot()) } catch (_) {}
}

// Wersja warunków korzystania — podbij przy zmianie treści terms.html,
// żeby wymusić ponowną akceptację przy następnym uruchomieniu.
const TERMS_VERSION = 1

const DEFAULT_SETTINGS = { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakAfter: 4 }
const SIZE_DIMS = { S: { w: 260, h: 130 }, M: { w: 330, h: 170 }, L: { w: 420, h: 210 } }

// ── Sanityzacja wczytanych danych (plik można edytować ręcznie) ──
function clampInt(v, min, max, dflt) {
  const n = parseInt(v)
  return isNaN(n) ? dflt : Math.max(min, Math.min(max, n))
}
function sanitizeTask(t) {
  return {
    id: (t && t.id != null) ? t.id : Date.now() + Math.floor(Math.random() * 1e6),
    name: String((t && t.name) || '').slice(0, 200),   // spójny limit z importem CSV (bez nieograniczonego stanu)
    totalMinutes: clampInt(t && t.totalMinutes, 1, 480, 25),
  }
}
function sanitizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw || {}) }
  return {
    workMinutes:       clampInt(s.workMinutes, 1, 120, 25),
    shortBreakMinutes: clampInt(s.shortBreakMinutes, 1, 60, 5),
    longBreakMinutes:  clampInt(s.longBreakMinutes, 1, 120, 15),
    longBreakAfter:    clampInt(s.longBreakAfter, 2, 10, 4),
  }
}

const saved = readSaved()
const S = {
  tasks:          Array.isArray(saved?.tasks) ? saved.tasks.map(sanitizeTask) : [],
  settings:       sanitizeSettings(saved?.settings),
  size:           SIZE_DIMS[saved?.size] ? saved.size : 'M',
  opacity:        (typeof saved?.opacity === 'number') ? Math.max(0.2, Math.min(1, saved.opacity)) : 0.90,
  currentIdx:     0,
  phase:          'idle',
  pomsDone:       0,
  phaseLeft:      0,
  phaseEndsAt:    0,       // znacznik czasu (ms) końca fazy — źródło prawdy dla odliczania
  taskSpent:      0,
  isRunning:      false,
  breakExpanded:  false,
  workStartExpanded: false, // fullscreen "PRACA" po zakończeniu przerwy
  taskEarlyDone:  false,   // czeka na wybór po ręcznym ukończeniu zadania
  askDone:        false,   // koniec bloku pracy z aktywnym zadaniem → pytamy „Ukończone?"
  pos:           (saved?.pos && typeof saved.pos.x === 'number') ? saved.pos : null,
  collapsedMode: true,    // start ZAWSZE jako zwinięta listwa nad paskiem zadań (zasłania zegar); AltGr+M / ▴ rozwija
  focusMode:     false,   // pełnoekranowy tryb skupienia (czarne tło, nazwa zadania, minutnik w rogu)
  termsVersion:  clampInt(saved?.termsVersion, 0, 9999, 0),   // 0 = warunki jeszcze niezaakceptowane
}

// Przywrócenie postępu z poprzedniej sesji (po sanityzacji listy zadań).
// currentIdx może równać się długości listy = stan „wszystko ukończone".
;(() => {
  const idx = parseInt(saved?.currentIdx)
  if (!isNaN(idx) && idx >= 0 && idx <= S.tasks.length) S.currentIdx = idx
  const spent = parseInt(saved?.taskSpent)
  if (!isNaN(spent) && spent >= 0) S.taskSpent = Math.min(spent, 480 * 60)
  const poms = parseInt(saved?.pomsDone)
  if (!isNaN(poms) && poms >= 0) S.pomsDone = Math.min(poms, 100)
  lastSavedSpentMin = Math.floor(S.taskSpent / 60)
})()

// JEDNO, STAŁE okno nakładki: tworzone raz na cały ekran, przezroczyste i klikalne
// „na wskroś". NIGDY nie jest skalowane ani chowane — wszystkie tryby (widget,
// pełnoekranowa kurtyna przerwy/pracy, mini-pasek) to wyłącznie zmiany DOM/CSS w środku
// (renderer w overlay.html). Powód: na Windows KAŻDA operacja na powierzchni przezroczystego
// okna (resize ALBO hide/show) zostawia pustą warstwę (widać pulpit) aż do realnego
// kliknięcia. Natomiast zwykłe odrysowanie DOM (jak tykający zegar) działa bez zarzutu —
// więc zmieniamy tylko treść, nigdy okno. Klikalność steruje renderer (hit-test pod
// kursorem), bo przy oknie pełnoekranowym nie da się tego rozstrzygnąć z prostokąta okna.
// overlay = duże, stałe okno pełnoekranowe (widget + kurtyna PRZERWA/PRACA), transparent.
// tray   = małe, NIEPRZEZROCZYSTE okno tylko na zwiniętą listwę, dokładnie nad paskiem zadań.
//          Pełnoekranowe okno nie może rysować po pasku zadań, a małe okno 'screen-saver'
//          tak — dlatego zwinięty pasek dostaje własne okno. Nieprzezroczyste = pokaż/ukryj
//          NIE migocze (blank dotyczył tylko okien transparent).
let overlay = null, manager = null, tray = null, focusWin = null
let tickHandle = null, watchdogHandle = null, topmostHandle = null
let ignoring = true
let isQuitting = false   // true dopiero przy realnym zamykaniu aplikacji (patrz before-quit / 'quit')
let movingUntil = 0   // rezerwa zgodności (drag widgetu obsługuje renderer)

// Poziom warstwy zależny od trybu: pełnoekranowa kurtyna siedzi na 'floating' (niżej niż
// okna systemowe — nie zasłania paska zadań / powiadomień), widget i mini-pasek na
// 'screen-saver' (nad wszystkim). setAlwaysOnTop NIE rusza powierzchni → nie migocze.
function applyWindowLevel() {
  if (!overlay || overlay.isDestroyed()) return
  if (S.breakExpanded || S.workStartExpanded) overlay.setAlwaysOnTop(true, 'floating')
  else                                        overlay.setAlwaysOnTop(true, 'screen-saver', 1)
}

// Tryb skupienia ma OSOBNE, nieprzezroczyste okno (focusWin), które wchodzi w realny
// fullscreen — bo duże okno nakładki (transparent) NIE potrafi zasłonić paska zadań
// (patrz komentarz przy createOverlay / createTray: pełnoekranowe transparentne okno nie
// rysuje po pasku zadań, choćby na 'screen-saver'). Okno opaque → pokaż/ukryj nie migocze.
function showFocusWindow() {
  if (!focusWin || focusWin.isDestroyed()) focusWin = createFocusWindow()
  focusWin.setBounds(focusBounds())
  focusWin.show()
  if (!focusWin.isFullScreen()) focusWin.setFullScreen(true)   // realny fullscreen → Windows chowa pasek zadań i zegar
  focusWin.setAlwaysOnTop(true, 'screen-saver', 1)
  focusWin.focus()                                             // fokus klawiatury → Esc działa
}
function hideFocusWindow() {
  if (!focusWin || focusWin.isDestroyed()) return
  if (focusWin.isFullScreen()) focusWin.setFullScreen(false)
  focusWin.hide()
}

// Wyłączenie trybu skupienia. Wołane też automatycznie przy zmianie fazy (koniec bloku pracy
// itp.), żeby użytkownik nie został z czarnym ekranem nieaktualnego zadania.
function exitFocusIfOn() {
  if (!S.focusMode) return
  S.focusMode = false
  hideFocusWindow()
  syncTray()
}

// Windows potrafi po cichu zdegradować transparentne okno alwaysOnTop z warstwy topmost
// (pasek zadań, powiadomienia, przełączanie okien). Co sekundę przywracamy topmost na
// poziomie właściwym dla bieżącego trybu — to nie operacja na powierzchni, więc bezpieczne.
// W trybie skupienia NIE podnosimy nakładki (wyszłaby nad fullscreenowe okno focus, co
// przywróciłoby pasek zadań); zamiast tego utrzymujemy topmost samego okna focus.
function reassertTopmost() {
  if (Date.now() < movingUntil) return
  if (S.focusMode) {
    // Podnoś okno skupienia TYLKO gdy ma fokus — inaczej systemowe/inne okna (Menedżer zadań,
    // prompty aplikacji) nie wyszłyby na wierzch. Utrata fokusu zdejmuje topmost (createFocusWindow),
    // powrót go przywraca.
    if (focusWin && !focusWin.isDestroyed() && focusWin.isFocused())
      focusWin.setAlwaysOnTop(true, 'screen-saver', 1)
    return
  }
  if (S.collapsedMode) {
    // Zwinięte: nakładka nic nie pokazuje i przepuszcza kliki — jej z-order nie ma znaczenia,
    // więc jej NIE podnosimy. Za to pasek zadań potrafi wskoczyć NAD listwę (zmierzone sondą
    // z-order: nakładka Wycinania po PrtScn + Alt+Tab robi to w 100% przypadków, także na
    // v1.2.1) i bez reasercji listwa ginie pod nim na stałe. Podnosimy więc WYŁĄCZNIE listwę:
    // sam setAlwaysOnTop, bez setBounds i bez drugiego okna w tej samej sekundzie — dwa
    // podbicia naraz (nakładka+listwa) powodowały kiedyś widoczne mrugnięcie co 1 s.
    if (tray && !tray.isDestroyed()) {
      if (!tray.isVisible()) {
        tray.showInactive()                        // samonaprawa: zwinięte = listwa MA być widoczna (okno opaque → show nie migocze)
        tray.webContents.send('state', leanState())   // + świeży stan (ukryta nie dostawała broadcastów)
      }
      tray.setAlwaysOnTop(true, 'screen-saver', 1)
    }
    return
  }
  applyWindowLevel()
}

function workInterval() {
  return S.settings.workMinutes * 60
}

// ── Zegar oparty na realnym czasie (odporny na dryf setInterval i sen systemu) ──
function armClock() { S.phaseEndsAt = Date.now() + S.phaseLeft * 1000 }
function startPhase(seconds) { S.phaseLeft = seconds; armClock() }

function initTask() {
  S.pomsDone = 0; S.taskSpent = 0; S.breakExpanded = false; S.workStartExpanded = false; S.taskEarlyDone = false; S.askDone = false
  if (S.tasks.length > 0 && S.currentIdx >= S.tasks.length) {
    // Wszystkie zadania ukończone
    S.phase = 'done'; S.phaseLeft = 0; S.isRunning = false; return
  }
  // Brak zadań: startuj jako prosty pomodoro (faza pracy bez zadania)
  S.phase = 'work'; startPhase(workInterval())
}

// Start aplikacji: wznawiamy na ostatnim zadaniu z ODŁOŻONYM czasem (taskSpent/pomsDone
// przywrócone z pliku). Odliczanie rusza świeżym blokiem pracy, na pauzie — użytkownik
// jak zawsze naciska start. NIE zerujemy postępu (w odróżnieniu od initTask).
function resumeSession() {
  S.breakExpanded = false; S.workStartExpanded = false; S.taskEarlyDone = false; S.askDone = false
  if (S.tasks.length > 0 && S.currentIdx >= S.tasks.length) {
    S.phase = 'done'; S.phaseLeft = 0; S.isRunning = false; return
  }
  S.phase = 'work'; startPhase(workInterval())   // świeży blok 25 min
  S.isRunning = false                            // na pauzie do naciśnięcia start
}

function _advancePhase() {
  const { shortBreakMinutes, longBreakMinutes, longBreakAfter } = S.settings
  if (S.phase === 'work') {
    S.pomsDone++
    // Brak zadania (prosty pomodoro) lub Opcja B — cyklicznie praca/przerwa
    const isLong = S.pomsDone > 0 && S.pomsDone % longBreakAfter === 0
    S.phase = isLong ? 'longBreak' : 'shortBreak'
    startPhase(isLong ? longBreakMinutes * 60 : shortBreakMinutes * 60)
    S.workStartExpanded = false
  } else {
    // Przerwa skończyła się → pokaż fullscreen "PRACA" przez kilka sekund
    S.phase = 'work'; startPhase(workInterval())
    S.workStartExpanded = true
  }
}

function nextPhase() { exitFocusIfOn(); _advancePhase(); _syncOverlaySize() }

function _syncOverlaySize() {
  const isBreak = S.phase === 'shortBreak' || S.phase === 'longBreak'
  if (isBreak) {
    S.breakExpanded = true; S.workStartExpanded = false; expandOverlay()
  } else if (S.phase === 'work' && S.workStartExpanded) {
    S.breakExpanded = false; expandOverlay()
  } else {
    S.breakExpanded = false; S.workStartExpanded = false; shrinkOverlay()
  }
}

// ── Klikalność z deduplikacją (sterowana przez renderer: hit-test pod kursorem) ──
// Renderer (overlay.html) na bieżąco sprawdza, czy kursor jest nad strefą klikalną
// (.clickzone: widget, mini-pasek, przyciski przerwy) i woła mouse-enter/leave.
function setIgnore(v) {
  if (!overlay || overlay.isDestroyed() || v === ignoring) return
  ignoring = v
  if (v) overlay.setIgnoreMouseEvents(true, { forward: true })
  else   overlay.setIgnoreMouseEvents(false)
}

// Prostokąt zwiniętej listwy: NA pasku zadań (od jego górnej krawędzi w dół), przy prawej
// krawędzi ekranu — dokładnie jak w pierwotnej wersji, która nachodziła na zegar.
// Prostokąt zwiniętej listwy: NA pasku zadań, przy PRAWEJ krawędzi — CELOWO nachodzi na zegar
// i zasobnik (podstawowe wymaganie: listwa zasłania zegar). NIE dodawać rezerwy z prawej.
function trayBounds() {
  const { bounds, workArea } = screen.getPrimaryDisplay()
  const taskbarH = Math.max(36, bounds.height - workArea.height - workArea.y)
  const w = Math.max(340, Math.round(bounds.width * 0.28))
  return { x: bounds.x + bounds.width - w, y: workArea.y + workArea.height, width: w, height: taskbarH }
}
// Pokaż/ukryj okno-listwę zgodnie z trybem. Nieprzezroczyste okno → pokaż/ukryj nie migocze.
function syncTray() {
  if (!tray || tray.isDestroyed()) return
  if (S.collapsedMode) {
    tray.setBounds(trayBounds())                 // odśwież pozycję (np. po zmianie rozdzielczości)
    tray.setAlwaysOnTop(true, 'screen-saver', 1)
    if (!tray.isVisible()) tray.showInactive()
    // Ukryta listwa NIE dostaje broadcastów (patrz broadcast) — po pokazaniu natychmiast
    // wyślij świeży stan, inaczej do najbliższego ticku/cmd renderowałaby nieaktualne dane.
    tray.webContents.send('state', leanState())
  } else if (tray.isVisible()) {
    tray.hide()
  }
}

// Tryby wyświetlania = TYLKO zmiana flag stanu + poziomu okna + pokaż/ukryj listwę. Widok
// dużego okna przełącza renderer (broadcast → render w overlay.html); duże okno NIGDY nie
// zmienia rozmiaru ani się nie chowa, więc nic nie miga.
// UWAGA: shrinkOverlay NIE rusza collapsedMode — „powrót do widgetu" z kurtyn dotyczy okna
// rozwiniętego (collapsedMode=false i tak), a akcje z Managera/listwy (saveTasks, startTaskNow,
// nextTask) przy zwiniętej listwie NIE mogą jej chować (bug: „dodaję zadanie → listwa znika").
// Kurtyny nadal rozwijają przez expandOverlay (tam zdjęcie zwinięcia jest celowe).
function expandOverlay() { S.collapsedMode = false; applyWindowLevel(); syncTray() }   // wejście w kurtynę (przerwa/start pracy)
function shrinkOverlay() { applyWindowLevel(); syncTray() }                            // powrót do widgetu / odświeżenie listwy
function doCollapse()    { S.collapsedMode = true;  applyWindowLevel(); syncTray() }   // zwiń → listwa na pasku zadań
function doExpand()      { S.collapsedMode = false; applyWindowLevel(); syncTray() }   // rozwiń → widget

function tick() {
  if (!S.isRunning || S.phase === 'idle' || S.phase === 'done') return
  const left = Math.max(0, Math.round((S.phaseEndsAt - Date.now()) / 1000))
  if (S.phase === 'work') {
    S.taskSpent += Math.max(0, S.phaseLeft - left)  // realny przyrost (odporny na zawieszenie/sen)
    const m = Math.floor(S.taskSpent / 60)
    if (m !== lastSavedSpentMin) { lastSavedSpentMin = m; writeSaved() }  // zapis postępu co pełną minutę
  }
  S.phaseLeft = left
  if (left === 0) {
    // Koniec bloku pracy z aktywnym zadaniem → NIE przechodź od razu do przerwy,
    // tylko zatrzymaj i pokaż wyraźny panel „Ukończone?" (decyzja użytkownika).
    if (S.phase === 'work' && S.tasks.length > 0 && S.currentIdx < S.tasks.length) {
      S.isRunning = false
      S.askDone   = true
      exitFocusIfOn()   // pokaż panel „Ukończone?" w widgetcie zamiast czarnego ekranu
      // Panel „Ukończone?" żyje TYLKO w widgetcie dużego okna i musi być WIDOCZNY:
      // niezamknięty ekran PRACA zasłoniłby pytanie (renderer rysuje kurtynę zamiast widgetu),
      // a listwa nie mieści trzech wyborów — przy zwiniętej rozwiń widget (droga jak ▴/AltGr+M).
      // Powrót do zwiniętej: użytkownik, jak po każdej kurtynie (spójne z resztą przepływów).
      S.workStartExpanded = false
      if (S.collapsedMode) doExpand()
      else applyWindowLevel()   // poziom okna wraca z 'floating' (kurtyna) na 'screen-saver' od razu, nie po 1 s strażnika
    } else {
      nextPhase()   // prosty pomodoro bez zadania / przerwa → klasyczne przejście
    }
  }
  broadcast()
}

// Stan „lean" — wszystko poza listą zadań. Lista leci osobnym kanałem 'tasks' TYLKO przy zmianie
// (pushTasksIfChanged), więc co-sekundowy broadcast nie serializuje całej tablicy zadań do 4 okien.
function leanState() {
  const { tasks, ...rest } = S
  return rest
}
function broadcast() {
  const st = leanState()   // webContents.send i tak robi structured clone
  if (overlay && !overlay.isDestroyed()) overlay.webContents.send('state', st)
  if (tray && !tray.isDestroyed() && tray.isVisible()) tray.webContents.send('state', st)
  if (focusWin && !focusWin.isDestroyed() && focusWin.isVisible()) focusWin.webContents.send('state', st)
  if (manager && !manager.isDestroyed() && manager.isVisible()) manager.webContents.send('state', st)
}

// Wyślij listę zadań do WSZYSTKICH okien (także ukrytych — to rzadkie, więc tanie), ale tylko gdy
// faktycznie się zmieniła. Dzięki temu np. zwinięta listwa ma aktualne zadania zaraz po pokazaniu,
// a manager dostaje autorytatywne usunięcia (patrz reconcyliacja anty-wyścigowa w manager.html).
let _lastTasksSig = null
function tasksSigMain() { return S.tasks.map(t => `${t.id}:${t.name}:${t.totalMinutes}`).join('|') }
function pushTasksIfChanged() {
  const sig = tasksSigMain()
  if (sig === _lastTasksSig) return
  _lastTasksSig = sig
  for (const w of [overlay, tray, focusWin, manager]) {
    if (w && !w.isDestroyed()) w.webContents.send('tasks', S.tasks)
  }
}

if (gotTheLock) {
  app.on('second-instance', () => {
    if (manager && !manager.isDestroyed()) { manager.show(); manager.focus() }
  })

  // Bramka warunków: przy pierwszym uruchomieniu (lub po zmianie TERMS_VERSION)
  // pokaż ekran „Akceptuję warunki" ZANIM wystartuje timer i nakładka.
  app.whenReady().then(() => {
    if (S.termsVersion === TERMS_VERSION) startApp()
    else createTermsWindow()
  })

  function startApp() {
    overlay = createOverlay(); tray = createTray(); manager = createManager(); focusWin = createFocusWindow()
    ensureLogReady()   // utwórz folder Dokumenty\PomodoroOverlay + nagłówek CSV z wyprzedzeniem
    tickHandle = setInterval(tick, 1000); resumeSession()

    // Watchdog click-through: samonaprawa, gdy kursor opuści okno bez zdarzenia mouseleave
    // (Alt+Tab, koniec dragu poza widgetem, przełączenie pulpitu, powiadomienia itp.)
    watchdogHandle = setInterval(() => {
      if (!overlay || overlay.isDestroyed()) return
      if (Date.now() < movingUntil) return   // nie przerywaj trwającego przeciągania okna
      const p = screen.getCursorScreenPoint()
      const b = overlay.getBounds()
      const inside = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height
      if (!inside) setIgnore(true)
    }, 200)

    // Strażnik Z-order: co sekundę przywraca okno na wierzch, gdy Windows zdegradował
    // je z warstwy topmost (klik w pasek, przełączenie okien itp.). Bez tego widget
    // „znika" do następnego ręcznego AltGr+M. Patrz reassertTopmost.
    topmostHandle = setInterval(reassertTopmost, 1000)

    // Reakcja na zmianę rozdzielczości / (od)łączenie monitora — to JEDYNY moment, gdy
    // okno realnie zmienia rozmiar (dopasowanie do nowego ekranu). Zdarza się rzadko i
    // wtedy użytkownik i tak wchodzi w interakcję, więc ewentualne odrysowanie nie przeszkadza.
    // broadcast() → renderer ponownie doklamruje pozycję widgetu do nowych wymiarów.
    const reclamp = () => {
      if (!overlay || overlay.isDestroyed()) return
      overlay.setBounds(fullBounds())   // dopasuj do nowego ekranu (z 1px nadmiarem — patrz fullBounds)
      applyWindowLevel()
      syncTray()                        // przesuń listwę na nowy pasek zadań (gdy zwinięte)
      if (focusWin && !focusWin.isDestroyed()) focusWin.setBounds(focusBounds())
      broadcast()
    }
    screen.on('display-metrics-changed', reclamp)
    screen.on('display-added', reclamp)
    screen.on('display-removed', reclamp)

    // Po wybudzeniu systemu przelicz natychmiast (tick i tak liczy z zegara ściennego)
    powerMonitor.on('resume', () => { tick() })

    // Globalne skróty klawiszowe — sterowanie bez myszy.
    // UWAGA: na Windows AltGr = Ctrl+Alt, więc Ctrl+Alt+<litera> jest wyzwalany przez
    // AltGr+<litera>. Litery dobrane tak, by NIE kolidowały z polskimi znakami (AltGr+s=ś,
    // AltGr+c=ć itd.): P (wolne), K (zamiast S), M (zamiast C — zwijanie/rozwijanie).
    const SHORTCUTS = [
      ['CommandOrControl+Alt+P', 'toggle'],          // start / pauza
      ['CommandOrControl+Alt+K', 'skipPhase'],       // pomiń fazę
      ['CommandOrControl+Alt+M', 'toggleCollapse'],  // zwiń / rozwiń (AltGr+M)
      ['CommandOrControl+Alt+F', 'toggleFocus'],     // tryb skupienia
      ['CommandOrControl+Alt+D', 'doneKeepTimer'],   // ukończ bieżące zadanie (D — wolne od polskich znaków AltGr)
      ['CommandOrControl+Alt+T', 'openManager'],     // otwórz managera zadań (T — wolne od polskich znaków AltGr)
    ]
    for (const [accel, cmd] of SHORTCUTS) {
      const ok = globalShortcut.register(accel, () => handleCmd(cmd))
      if (!ok) console.warn(`[skrót] nie udało się zarejestrować ${accel} — zajęty przez inną aplikację`)
    }

    setTimeout(() => { pushTasksIfChanged(); broadcast(); if (S.tasks.length === 0) { manager.show(); manager.focus() } }, 700)
  }

  // ── Okno warunków korzystania (first-run) ───────────────────────────
  let termsWin = null
  function createTermsWindow() {
    termsWin = new BrowserWindow({
      width: 560, height: 700, resizable: false, minimizable: false, maximizable: false,
      title: 'Pomodoro Overlay — Warunki korzystania', backgroundColor: '#0d1117',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    })
    termsWin.setMenuBarVisibility(false)
    termsWin.loadFile(path.join(__dirname, 'terms.html'))
    // Zamknięcie okna bez akceptacji = rezygnacja — aplikacja się kończy.
    termsWin.on('closed', () => {
      termsWin = null
      if (S.termsVersion !== TERMS_VERSION) app.exit(0)
    })
  }
  ipcMain.on('terms-accepted', () => {
    S.termsVersion = TERMS_VERSION
    flushSaved()
    if (termsWin && !termsWin.isDestroyed()) termsWin.close()
    startApp()
  })
  ipcMain.on('terms-declined', () => { app.exit(0) })
}

// Wymiary okna celowo o 1px większe niż monitor (góra + boki; dół WYRÓWNANY do dołu ekranu).
// Powód: gdy okno topmost ma DOKŁADNIE wymiary monitora, Windows uznaje je za pełnoekranowe i
// wypycha pasek zadań NAD nie — wtedy zwinięta listwa nie nachodzi na zegar. 1px nadmiaru łamie
// to wykrywanie, więc 'screen-saver' znów trzyma okno nad paskiem zadań. Dół bez nadmiaru, żeby
// #taskbar-view (bottom:0) siadał równo na pasku. To NIE jest realna zmiana rozmiaru w trakcie
// pracy — ustawiamy raz przy tworzeniu (i przy zmianie rozdzielczości).
function fullBounds() {
  const b = screen.getPrimaryDisplay().bounds
  return { x: b.x - 1, y: b.y - 1, width: b.width + 2, height: b.height + 1 }
}

// Dokładne wymiary monitora (BEZ 1px nadmiaru) dla okna trybu skupienia — wchodzi ono w realny
// fullscreen, więc nie potrzebuje sztuczki z nadmiarem (ta służy oknu nakładki do współpracy
// z paskiem zadań). Tu chcemy odwrotnie: pełny fullscreen, który pasek zadań chowa.
function focusBounds() {
  const b = screen.getPrimaryDisplay().bounds
  return { x: b.x, y: b.y, width: b.width, height: b.height }
}

// Jedno stałe okno na cały ekran. NIE jest movable ani resizable — przeciąganie widgetu
// i jego pozycję obsługuje renderer (CSS), a tryby przełączamy treścią. Domyślnie klikalne
// na wskroś; renderer włącza klikalność tylko nad strefami .clickzone.
function createOverlay() {
  const fb = fullBounds()
  const win = new BrowserWindow({
    x: fb.x, y: fb.y, width: fb.width, height: fb.height,
    frame: false, alwaysOnTop: true, transparent: true, hasShadow: false,
    skipTaskbar: true, resizable: false, movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',   // sygnał dźwiękowy faz zagra bez gestu (apka sterowana skrótami)
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver', 1)
  win.setOpacity(S.opacity)
  win.setIgnoreMouseEvents(true, { forward: true })
  ignoring = true
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.loadFile(path.join(__dirname, 'overlay.html'))
  return win
}

// Okno zwiniętej listwy: małe, NIEPRZEZROCZYSTE, dokładnie nad paskiem zadań. Tworzone raz,
// ukryte; pokazywane przy zwinięciu. Ładuje overlay.html z rolą 'tray' (renderer rysuje wtedy
// wyłącznie mini-pasek na całe okno). W pełni klikalne (małe okno — nie blokuje pulpitu).
function createTray() {
  const tb = trayBounds()
  const win = new BrowserWindow({
    x: tb.x, y: tb.y, width: tb.width, height: tb.height,
    frame: false, alwaysOnTop: true, transparent: false, hasShadow: false,
    skipTaskbar: true, resizable: false, movable: false, show: false, backgroundColor: '#080a14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false, additionalArguments: ['--role=tray'],
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver', 1)
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.loadFile(path.join(__dirname, 'overlay.html'))
  // Start w trybie zwiniętym: pokaż listwę dokładnie w chwili, gdy renderer ma co malować
  // (bez tego pierwszy raz pokazałby ją dopiero strażnik topmost, do ~1 s po starcie).
  win.once('ready-to-show', () => { if (S.collapsedMode) syncTray() })
  return win
}

// Osobne okno trybu skupienia: NIEPRZEZROCZYSTE, wchodzi w realny fullscreen (Windows chowa
// wtedy pasek zadań i zegar). Duże okno nakładki jest transparent i — jak listwa tray — nie
// zasłoni paska zadań, dlatego focus dostaje własne okno. Ładuje overlay.html z rolą 'focus'
// (renderer rysuje wtedy WYŁĄCZNIE ekran skupienia). Tworzone raz, ukryte; pokazywane na żądanie.
function createFocusWindow() {
  const fb = focusBounds()
  const win = new BrowserWindow({
    x: fb.x, y: fb.y, width: fb.width, height: fb.height,
    frame: false, alwaysOnTop: true, transparent: false, hasShadow: false,
    skipTaskbar: true, resizable: false, movable: false, show: false, backgroundColor: '#05060a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false, additionalArguments: ['--role=focus'],
    },
  })
  win.setMenuBarVisibility(false)
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.loadFile(path.join(__dirname, 'overlay.html'))
  // Zamknięcie z zewnątrz (Alt+F4) w trybie skupienia: nie zostawiaj pustego, martwego ekranu —
  // wyjdź z trybu i pokaż z powrotem nakładkę.
  win.on('closed', () => {
    focusWin = null
    if (S.focusMode) { S.focusMode = false; syncTray(); broadcast() }
  })
  // Utrata fokusu zdejmuje topmost (żeby Menedżer zadań / prompty systemowe wyszły na wierzch);
  // powrót fokusu przywraca. reassertTopmost również respektuje isFocused().
  win.on('blur',  () => { if (!win.isDestroyed()) win.setAlwaysOnTop(false) })
  win.on('focus', () => { if (!win.isDestroyed()) win.setAlwaysOnTop(true, 'screen-saver', 1) })
  return win
}

function createManager() {
  const win = new BrowserWindow({
    width: 550, height: 700, minWidth: 420, minHeight: 500, show: false,
    title: '🍅 Pomodoro — Zadania', backgroundColor: '#0d1117',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  })
  win.loadFile(path.join(__dirname, 'manager.html'))
  // X chowa okno (apka żyje dalej). Ale przy realnym zamykaniu (isQuitting) pozwól je zamknąć —
  // inaczej wylogowanie / zamknięcie systemu mogłoby zawisnąć na anulowanym close.
  win.on('close', e => { if (!isQuitting) { e.preventDefault(); win.hide() } })
  return win
}

// Osobne okno „Jak to działa" — żeby instrukcję i panel można było widzieć równolegle.
// Tworzone leniwie przy pierwszym otwarciu; zamknięcie tylko chowa (szybki ponowny start).
let helpWin = null
function openHelp() {
  if (helpWin && !helpWin.isDestroyed()) { helpWin.show(); helpWin.focus(); return }
  helpWin = new BrowserWindow({
    width: 560, height: 720, minWidth: 420, minHeight: 480, show: false,
    title: '🍅 Pomodoro — Jak to działa', backgroundColor: '#0d1117',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  })
  helpWin.setMenuBarVisibility(false)
  helpWin.loadFile(path.join(__dirname, 'help.html'))
  helpWin.once('ready-to-show', () => { helpWin.show(); helpWin.focus() })
  helpWin.on('close', e => { if (!isQuitting) { e.preventDefault(); helpWin.hide() } })
}

function handleCmd(cmd, data) {
  switch (cmd) {

    case 'toggle':
      if (S.phase === 'done' || S.phase === 'idle') { S.currentIdx = 0; initTask() }
      S.isRunning = !S.isRunning
      if (S.isRunning) armClock()              // wznawiamy odliczanie od bieżącego phaseLeft
      break

    case 'skipPhase':
      if (S.phase !== 'idle' && S.phase !== 'done') nextPhase()
      break

    // ── Ręczne wcześniejsze ukończenie zadania ────────────────────
    case 'completeEarly':
      if (S.tasks.length > 0 && S.currentIdx < S.tasks.length && S.phase === 'work') {
        S.isRunning    = false
        S.taskEarlyDone = true
      }
      break

    // User wybrał: weź przerwę przed następnym zadaniem
    case 'chooseBreak': {
      if (!S.taskEarlyDone && !S.askDone) break
      S.taskEarlyDone = false; S.askDone = false
      logTaskCompletion(S.tasks[S.currentIdx], 'completed')
      // Ukończone → USUŃ z listy (nie tylko przesuwaj wskaźnik). Inaczej zadanie zostawało w
      // S.tasks, wracało na liście i odpalało się od nowa po „done" (toggle→currentIdx=0).
      // Po splice currentIdx wskazuje już następne zadanie (jak w doneKeepTimer).
      S.tasks.splice(S.currentIdx, 1); S.taskSpent = 0; S.pomsDone = 0
      if (S.currentIdx >= S.tasks.length) { S.phase = 'done'; S.phaseLeft = 0; S.isRunning = false; break }
      S.phase     = 'shortBreak'
      startPhase(S.settings.shortBreakMinutes * 60)
      S.isRunning = true
      S.breakExpanded = true
      expandOverlay()
      break
    }

    // User wybrał: przejdź od razu do następnego zadania (timer kontynuuje)
    case 'chooseNext': {
      if (!S.taskEarlyDone && !S.askDone) break
      S.taskEarlyDone = false; S.askDone = false
      logTaskCompletion(S.tasks[S.currentIdx], 'completed')
      S.tasks.splice(S.currentIdx, 1); S.taskSpent = 0; S.pomsDone = 0   // ukończone → usuń z listy (jak doneKeepTimer)
      if (S.currentIdx >= S.tasks.length) { S.phase = 'done'; S.phaseLeft = 0; S.isRunning = false; break }
      S.phase     = 'work'
      S.isRunning = true
      // Wczesne ukończenie: kontynuuj resztę bloku. Po upływie czasu (askDone, phaseLeft=0):
      // wystartuj świeży blok pracy dla następnego zadania.
      if (S.phaseLeft <= 0) startPhase(workInterval()); else armClock()
      S.breakExpanded = false
      shrinkOverlay()
      break
    }

    // „Jeszcze nie skończyłem" po upływie bloku — zadanie NIE jest ukończone:
    // weź zaplanowaną przerwę (klasyczny pomodoro), to samo zadanie trwa dalej.
    case 'continueAfterTimeUp':
      if (!S.askDone) break
      S.askDone = false
      nextPhase()          // work→przerwa: pomsDone++, startPhase(przerwa), rozwiń kurtynę
      S.isRunning = true
      break

    // Anuluj wczesne ukończenie / panel po czasie (wróć do normalnego timera)
    case 'cancelEarly':
      S.taskEarlyDone = false
      S.askDone = false
      break

    // Rezygnacja / pominięcie zadania (✗) — zapis jako „skipped", skok do następnego
    case 'nextTask':
      if (S.tasks.length > 0 && S.currentIdx < S.tasks.length) {
        logTaskCompletion(S.tasks[S.currentIdx], 'skipped')
        S.tasks.splice(S.currentIdx, 1); S.taskSpent = 0; S.pomsDone = 0   // pominięte → usuń z listy
        S.taskEarlyDone = false; S.askDone = false
        if (S.currentIdx >= S.tasks.length) {
          S.phase = 'done'; S.phaseLeft = 0; S.isRunning = false
        } else {
          S.phase = 'work'; startPhase(workInterval()); S.isRunning = false; S.breakExpanded = false
        }
        shrinkOverlay()
      }
      break

    // Ukończ zadanie, nie zatrzymując timera — usuwa z listy, skacze do kolejnego
    // ✓ ukończ bieżące zadanie (widżet/listwa/focus/AltGr+D). Działa TAKŻE w przerwie —
    // listwa jest od startu-zwiniętego głównym widokiem; przerwa biegnie wtedy dalej,
    // a po niej ekran PRACA pokaże już następne zadanie.
    case 'doneKeepTimer':
      if (S.currentIdx < S.tasks.length && S.phase !== 'idle' && S.phase !== 'done') {
        logTaskCompletion(S.tasks[S.currentIdx], 'completed')
        S.tasks.splice(S.currentIdx, 1)
        S.taskSpent = 0; S.pomsDone = 0
        S.taskEarlyDone = false; S.askDone = false   // domknij ewentualny panel „Co teraz?" (spójność listwa/panel/focus)
        if (S.currentIdx >= S.tasks.length) {
          // Nie ma już kolejnych zadań
          S.phase = 'done'; S.phaseLeft = 0; S.isRunning = false
          exitFocusIfOn()   // brak zadań → wyjdź z czarnego ekranu
        } else if (S.phaseLeft <= 0) {
          // Ukończenie w momencie końca bloku (panel askDone) — przezbrój świeży blok dla kolejnego zadania.
          startPhase(workInterval())
        }
        // currentIdx nie zmienia się — po usunięciu element pod tym indeksem to już następne zadanie
        writeSaved()
      }
      break

    // Zacznij wybrane zadanie OD RAZU (przeskakuje na początek i staje się bieżące). Przerwane
    // zadanie: prevAction 'queue' = zostaje w liście (wznowisz później), 'skip' = zapis jako
    // pominięte + usunięte. Świeży blok pracy, postęp zerowany (timer liczy tylko bieżące).
    case 'startTaskNow': {
      const id = data?.id
      if (id == null) break
      if (S.tasks.findIndex(t => t.id === id) < 0) break
      const wasActive = S.phase !== 'idle' && S.phase !== 'done'
      const curTask = (wasActive && S.currentIdx >= 0 && S.currentIdx < S.tasks.length) ? S.tasks[S.currentIdx] : null
      if (curTask && curTask.id === id) break   // już bieżące — nic nie rób

      if (curTask && data?.prevAction === 'skip') {
        logTaskCompletion(curTask, 'skipped')
        const ci = S.tasks.findIndex(t => t.id === curTask.id)
        if (ci >= 0) S.tasks.splice(ci, 1)
      }
      // prevAction 'queue' → przerwane zadanie zostaje w liście (wznowisz później)

      const ni = S.tasks.findIndex(t => t.id === id)   // przelicz po ewentualnym splice
      const [task] = S.tasks.splice(ni, 1)
      S.tasks.unshift(task)
      S.currentIdx = 0
      S.taskSpent = 0; S.pomsDone = 0
      S.taskEarlyDone = false; S.askDone = false
      S.breakExpanded = false; S.workStartExpanded = false
      S.phase = 'work'; startPhase(workInterval())
      S.isRunning = true
      shrinkOverlay()
      writeSaved()
      break
    }

    case 'shrinkManual':
      S.breakExpanded = false; shrinkOverlay()
      break

    case 'shrinkWork':
      S.workStartExpanded = false; S.breakExpanded = false; shrinkOverlay()
      break

    case 'setSize': {
      const sz = data?.size
      if (SIZE_DIMS[sz]) {
        S.size = sz                 // rozmiar to teraz tylko klasa CSS widgetu — renderer ją
        writeSaved()                // zastosuje i doklamruje pozycję (broadcast niżej)
      }
      break
    }

    case 'setOpacity': {
      const v = Math.max(0.2, Math.min(1.0, data?.value ?? 0.9))
      S.opacity = v
      if (overlay && !overlay.isDestroyed()) overlay.setOpacity(v)   // opacity całego okna — nie rusza powierzchni
      writeSaved()
      break
    }

    // Renderer po przeciągnięciu widgetu zgłasza jego nową pozycję (współrzędne EKRANU).
    case 'saveWidgetPos':
      if (data && typeof data.x === 'number' && typeof data.y === 'number') {
        S.pos = { x: Math.round(data.x), y: Math.round(data.y) }
        writeSaved()
      }
      break

    case 'openManager': manager.show(); manager.focus(); break

    case 'openHelp': openHelp(); break

    case 'saveTasks': {
      const newTasks    = Array.isArray(data?.tasks) ? data.tasks.map(sanitizeTask) : []
      const newSettings = sanitizeSettings(data?.settings)
      const wasActive   = S.phase !== 'idle' && S.phase !== 'done'
      const curTask     = S.tasks[S.currentIdx]
      S.tasks    = newTasks
      S.settings = newSettings
      // Zachowaj trwającą sesję, jeśli BIEŻĄCE zadanie nadal istnieje (po id) i ma ten sam
      // czas — wtedy dopisanie zadania na koniec, edycja nazw albo zmiana kolejności NIE
      // kasuje postępu ani nie zatrzymuje timera. Resetujemy plan tylko, gdy bieżące zadanie
      // zniknęło albo zmieniono jego długość (realna zmiana planu tego, co teraz robisz).
      let preserved = false
      if (wasActive && curTask) {
        const ni = newTasks.findIndex(t => t.id === curTask.id)
        if (ni >= 0 && newTasks[ni].totalMinutes === curTask.totalMinutes) {
          S.currentIdx = ni
          preserved = true
        }
      }
      if (!preserved) {
        S.currentIdx = 0; S.isRunning = false; initTask(); shrinkOverlay()
      }
      writeSaved()
      break
    }

    case 'resetTimer':
      S.currentIdx = 0; S.isRunning = false; initTask(); shrinkOverlay()
      break

    case 'setAutostart':
      app.setLoginItemSettings({ openAtLogin: !!data?.enabled, ...autostartOpts() })
      break

    case 'collapseWidget': doCollapse(); break
    case 'expandWidget':   doExpand();   break

    case 'toggleCollapse':
      if (S.breakExpanded || S.workStartExpanded) break
      if (S.collapsedMode) doExpand(); else doCollapse()
      break

    // ── Tryb skupienia (pełnoekranowa czerń) ──────────────────────
    // Wchodzimy tylko podczas pracy. setOpacity(1) → pełna czerń (widget chodzi na ~0.9);
    // collapsedMode=false → chowamy listwę; applyWindowLevel → 'screen-saver' kryje pasek zadań.
    case 'enterFocus':
      if (S.phase === 'work' && !S.focusMode) {
        S.focusMode = true; S.collapsedMode = false
        showFocusWindow(); syncTray()
      }
      break

    case 'exitFocus':
      exitFocusIfOn()
      break

    case 'toggleFocus':
      if (S.focusMode) {
        exitFocusIfOn()
      } else if (S.phase === 'work') {
        S.focusMode = true; S.collapsedMode = false
        showFocusWindow(); syncTray()
      }
      break

    case 'openLogFolder': ensureLogReady().then(() => shell.openPath(LOG_DIR)); break

    case 'quit': isQuitting = true; app.quit(); break   // before-quit → flushSaved, will-quit → cleanup
  }
  writeSaved()   // utrwal ewentualną zmianę postępu (currentIdx/taskSpent/pomsDone); debounced
  pushTasksIfChanged()   // lista zadań osobnym kanałem — tylko gdy się zmieniła
  broadcast()
}

ipcMain.on('cmd', (_, { cmd, data }) => handleCmd(cmd, data))

// ── Autostart z Windows ────────────────────────────────────────────
// Wersja spakowana (instalator): rejestrowany jest exe aplikacji — bez opcji.
// Tryb deweloperski (npm start): process.execPath to electron.exe, więc bez
// argumentu ze ścieżką projektu autostart otworzyłby puste okno Electrona.
// Te same opcje MUSZĄ iść do set i get, inaczej odczyt stanu nie znajdzie wpisu.
// Uwaga: autostart uruchamia aplikację ZAWSZE w stanie pauzy (resumeSession
// ustawia isRunning=false) — odmierzanie rusza dopiero po kliknięciu ▶.
function autostartOpts() {
  return app.isPackaged ? {} : { args: [`"${__dirname}"`] }
}

ipcMain.handle('getState',     () => S)
ipcMain.handle('getAutostart', () => app.getLoginItemSettings(autostartOpts()).openAtLogin)

// ── Historia: odczyt logu CSV → wiersze dla zakładki „Historia" ───────
ipcMain.handle('getLog', () => {
  try {
    if (!fs.existsSync(LOG_FILE)) return { rows: [], path: LOG_FILE }
    let text = fs.readFileSync(LOG_FILE, 'utf8')
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
    const parsed = parseCSV(text, LOG_DELIM)
    parsed.shift()  // nagłówek
    const rows = parsed
      .filter(r => r.length >= 2 && String(r[0]).trim() !== '')
      .map(r => ({
        completedAt: r[0], taskName: r[1], plannedMin: r[2], actualMin: r[3],
        actualSec: r[4], pomodoros: r[5], deltaMin: r[6], status: r[7],
      }))
    return { rows, path: LOG_FILE }
  } catch (e) {
    return { rows: [], path: LOG_FILE, error: String(e && e.message || e) }
  }
})

// ── Eksport zadań do pliku CSV (format zgodny z importem: nazwa;minuty) ─
ipcMain.handle('exportTasks', async (_, tasks) => {
  const list = (Array.isArray(tasks) ? tasks : []).map(sanitizeTask).filter(t => t.name.trim())
  if (!list.length) return { canceled: true }
  const parent = (manager && !manager.isDestroyed()) ? manager : undefined
  const res = await dialog.showSaveDialog(parent, {
    title: 'Eksportuj zadania do pliku CSV',
    defaultPath: 'pomodoro-zadania.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  })
  if (res.canceled || !res.filePath) return { canceled: true }
  try {
    // BOM + ';' jak w logu — plik otwiera się poprawnie w polskim Excelu
    const rows = list.map(t => csvField(t.name) + LOG_DELIM + t.totalMinutes).join('\n')
    fs.writeFileSync(res.filePath, '﻿nazwa' + LOG_DELIM + 'minuty\n' + rows + '\n')
    return { canceled: false, file: res.filePath, count: list.length }
  } catch (e) {
    return { canceled: false, error: String(e && e.message || e) }
  }
})

// ── Import zadań z pliku CSV (dialog → parse → zwrot do renderera) ─────
ipcMain.handle('importTasks', async () => {
  const parent = (manager && !manager.isDestroyed()) ? manager : undefined
  const res = await dialog.showOpenDialog(parent, {
    title: 'Importuj zadania z pliku CSV',
    filters: [{ name: 'CSV / tekst', extensions: ['csv', 'tsv', 'txt'] }, { name: 'Wszystkie pliki', extensions: ['*'] }],
    properties: ['openFile'],
  })
  if (res.canceled || !res.filePaths.length) return { canceled: true }
  try {
    let text = fs.readFileSync(res.filePaths[0], 'utf8')
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
    return { canceled: false, tasks: parseTasksFromCSV(text), file: path.basename(res.filePaths[0]) }
  } catch (e) {
    return { canceled: false, error: String(e && e.message || e) }
  }
})

// Renderer (hit-test pod kursorem) zgłasza, czy kursor jest nad strefą klikalną.
ipcMain.on('mouse-enter', () => setIgnore(false))
ipcMain.on('mouse-leave', () => setIgnore(true))

if (gotTheLock) {
  app.on('before-quit', () => { isQuitting = true; flushSaved() })
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    if (tickHandle) clearInterval(tickHandle)
    if (watchdogHandle) clearInterval(watchdogHandle)
    if (topmostHandle) clearInterval(topmostHandle)
  })
}
app.on('window-all-closed', () => {})
