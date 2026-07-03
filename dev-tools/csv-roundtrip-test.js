// Test round-trip CSV: eksport (csvField + ';') → import (parseTasksFromCSV).
// Funkcje sa CZYSTE (bez Electrona), wiec wycinamy je z main.js i uruchamiamy w node —
// testujemy PRAWDZIWY kod, nie kopie. Uzycie: node dev-tools/csv-roundtrip-test.js
const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8')

// Wytnij czyste funkcje po nazwach (od "function NAZWA" lub "const NAZWA" do nastepnej
// deklaracji na poziomie 0 wciecia). Prosty, ale wystarczajacy parser dla main.js.
function cut(name) {
  const re = new RegExp(`^(?:function ${name}\\b|const ${name}\\b)`, 'm')
  const m = src.match(re)
  if (!m) throw new Error('nie znaleziono: ' + name)
  const start = m.index
  const rest = src.slice(start + 1)
  const next = rest.search(/^(?:function [a-zA-Z]|const [A-Z_a-z]+\s*=|let [a-z]|ipcMain|app\.|if \(gotTheLock\))/m)
  return src.slice(start, start + 1 + (next < 0 ? rest.length : next))
}
const code = ['csvField', 'parseCSV', 'detectDelim', 'NAME_KEYS', 'MIN_KEYS', 'matchCol', 'parseTasksFromCSV'].map(cut).join('\n')
eval(code)

const LOG_DELIM = ';'
// Odtworzenie formatu eksportu z main.js (ipcMain.handle('exportTasks')):
function exportText(tasks) {
  const rows = tasks.map(t => csvField(t.name) + LOG_DELIM + t.totalMinutes).join('\n')
  return '﻿nazwa' + LOG_DELIM + 'minuty\n' + rows + '\n'
}
function stripBom(t) { return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t }

let fails = 0
function check(desc, cond, extra) {
  if (cond) { console.log('PASS:', desc) } else { fails++; console.log('FAIL:', desc, extra || '') }
}

// 1. Round-trip z podchwytliwymi nazwami
const tricky = [
  { name: 'Zwykłe zadanie', totalMinutes: 25 },
  { name: 'Zadanie; ze średnikiem', totalMinutes: 10 },
  { name: 'Cytat "w środku" nazwy', totalMinutes: 480 },
  { name: 'Nowa\nlinia w nazwie', totalMinutes: 1 },
  { name: 'Polskie znaki: żółć ĄĘŚŹŻ', totalMinutes: 45 },
]
const rt = parseTasksFromCSV(stripBom(exportText(tricky)))
check('round-trip: liczba zadań', rt.length === tricky.length, JSON.stringify(rt))
tricky.forEach((t, i) => {
  check(`round-trip [${i}]: nazwa`, rt[i] && rt[i].name === t.name, rt[i] && rt[i].name)
  check(`round-trip [${i}]: minuty`, rt[i] && rt[i].totalMinutes === t.totalMinutes, rt[i] && rt[i].totalMinutes)
})

// 2. Nagłówek rozpoznany i pominięty (różne etykiety)
const withHeader = parseTasksFromCSV('task,duration\nAaa,30\nBbb,15')
check('nagłówek EN pominięty', withHeader.length === 2 && withHeader[0].name === 'Aaa' && withHeader[0].totalMinutes === 30, JSON.stringify(withHeader))

// 3. Plik BEZ nagłówka, pierwsze zadanie zawiera słowo-klucz — NIE zjadaj pierwszego wiersza
const noHeader = parseTasksFromCSV('Przygotować zadanie dla zespołu;30\nDrugie;15')
check('brak nagłówka: pierwszy wiersz to dane', noHeader.length === 2 && noHeader[0].totalMinutes === 30, JSON.stringify(noHeader))

// 4. Przecinek dziesiętny: "1,5" → 2 min (zaokrąglenie), nie 15
const decimal = parseTasksFromCSV('nazwa;minuty\nUłamek;"1,5"')
check('dziesiętne 1,5 → 2', decimal.length === 1 && decimal[0].totalMinutes === 2, JSON.stringify(decimal))

// 5. Clampy minut: 0→1, 9999→480; brak minut → 25
const clamps = parseTasksFromCSV('nazwa;minuty\nZero;0\nDużo;9999\nBez;')
check('clamp 0→1',      clamps[0].totalMinutes === 1,   clamps[0].totalMinutes)
check('clamp 9999→480', clamps[1].totalMinutes === 480, clamps[1].totalMinutes)
check('puste minuty→25', clamps[2].totalMinutes === 25, clamps[2].totalMinutes)

// 6. Detekcja separatora: tab i przecinek
const tabbed = parseTasksFromCSV('Zadanie A\t30\nZadanie B\t15')
check('separator TAB', tabbed.length === 2 && tabbed[0].totalMinutes === 30, JSON.stringify(tabbed))
const comma = parseTasksFromCSV('Zadanie A,30\nZadanie B,15')
check('separator przecinek', comma.length === 2 && comma[1].totalMinutes === 15, JSON.stringify(comma))

// 7. Nazwa >200 znaków przycięta do 200 (limit importu)
const long = parseTasksFromCSV('nazwa;minuty\n' + 'x'.repeat(300) + ';30')
check('nazwa 300→200 znaków', long.length === 1 && long[0].name.length === 200, long[0] && long[0].name.length)

console.log(fails === 0 ? '\nWSZYSTKIE TESTY OK' : `\n${fails} TESTÓW PADŁO`)
process.exit(fails === 0 ? 0 : 1)
