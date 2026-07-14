---
name: tasklog-and-import-plan
description: Uzgodniony plan dwóch funkcji Pomodoro Overlay — log CSV plan-vs-fakt oraz import zadań z CSV
metadata: 
  node_type: memory
  type: project
  originSessionId: 9563c4e8-d083-4bc5-bb55-75c206f1d0be
---

Dwie funkcje uzgodnione i ZBUDOWANE 2026-06-11 (zweryfikowane: składnia + testy parsera i round-trip logu).

**Funkcja 1 — log ukończonych zadań (plan vs. fakt) — GOTOWE:**
- Plik CSV `Dokumenty\PomodoroOverlay\pomodoro-log.csv` (`app.getPath('documents')`), separator `;` (przyjazny PL Excel), BOM UTF-8. Źródło prawdy + zakładka „Historia · plan vs. fakt" w `manager.html`.
- Kolumny: `completedAt, taskName, plannedMin, actualMin, actualSec, pomodoros, deltaMin, status`. Status = `completed` lub `skipped`.
- `logTaskCompletion(task, status)` w main.js (async `fs.appendFile`, escapowanie `csvField`) — wołane PRZED zmianą stanu w: `chooseBreak`, `chooseNext`, `doneKeepTimer` (completed), `nextTask` (skipped). Dane: actual = `S.taskSpent` (sekundy), pomodoros = `S.pomsDone`, plan = `task.totalMinutes`. NIE dodano `taskStartedAt` (zbędne — taskSpent wystarcza).
- IPC: `getLog` (czyta+parsuje na żądanie), komenda `openLogFolder` (`shell.openPath`). Historia odświeża się przez `maybeRefreshHistory` (zmiana currentIdx/length/phase), na focus okna i przyciskiem „Odśwież".

**Funkcja 2 — import zadań z CSV — GOTOWE:**
- IPC `importTasks` → `dialog.showOpenDialog` (csv/tsv/txt) → `parseTasksFromCSV`. Import DOŁĄCZA do listy (nie zastępuje); pozycje trafiają do bufora edycji jako podgląd, użytkownik klika „Zapisz i zastosuj".
- Parser: auto-detekcja separatora `;`/`,`/tab, obsługa cudzysłowów i `""`, strip BOM, auto-mapowanie kolumn (NAME_KEYS / MIN_KEYS), brak minut → 25, clamp 1–480, nazwa ucinana do 200 zn.

Nowe zależności: ZERO. Nowe interwały/polling: ZERO (operacje plikowe tylko na żądanie). Pliki zmienione: `main.js`, `preload.js` (getLog/importTasks), `manager.html` (przycisk „📥 Importuj CSV", sekcja Historia, style). Model zadania bez zmian: `{ id, name, totalMinutes }`.
