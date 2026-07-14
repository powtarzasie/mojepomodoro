---
name: project-mojepomodoro-release-playbook
description: "Jak wydać update MojePomodoro na GH (\"prośba o update na GH\") + stan v1.3.0 w toku"
metadata: 
  node_type: memory
  type: project
  originSessionId: 41fa59f4-3dea-4774-b850-136707bc6139
---

Wyzwalacz: gdy Mariusz pisze **„prośba o update na GH"** (lub podobnie) dla MojePomodoro/Pomodoro —
wykonaj proces z **`C:\ClaudeSANDDBOX\RELEASE_PLAYBOOK_MojePomodoro.md`** (pełne kroki, komendy, pułapki).

Kluczowe fakty (weryfikuj w kodzie/`gh` przed działaniem):
- Repo skonsolidowane **`powtarzasie/mojepomodoro`** (kod w root + landing w `/docs` + CI + Releases). Konto `gh` = `powtarzasie`.
- **Źródło prawdy = klon `C:\ClaudeSANDDBOX\mojepomodoro`** (edytuj i buduj TU; `npm ci` przed `npm run build:win`).
- ⚠️ `C:\ClaudeSANDDBOX\pomodoro-overlay` to STARA samodzielna kopia (nie repo) — potrafiła wyprzedzić repo o cały zestaw funkcji. Nie edytować równolegle; docelowo porzucić. To był powód rozjazdu 02.07.2026.
- Build: `electron-builder --win --x64 --publish never` → `release\MojePomodoro_Setup_v${version}.exe`. CI (`.github/workflows/release.yml`) na tagu `v*`: build → `SHA256SUMS.txt` → `attest-build-provenance` → `gh release create`. `.exe` NIGDY do drzewa repo.
- Landing wzorzec przy nowej wersji: bulk `v<stara>`→`v<nowa>`, SHA→nowy (placeholder `PENDING_SHA256` do czasu podania), poprzednią wersję do bloku `arc-*` (ID wersjo-neutralne `dlBtnPrev`/`modalStatsPrev`), główny licznik sumuje `.exe` ze wszystkich wydań. Podgląd: python http.server + Claude_Preview; NIE commitować `launch.json`.
- **VirusTotal ZAWSZE miękko** („publiczny raport — zobacz wynik" + FP Electron/NSIS + porównaj SHA); NIGDY „0/68". Patrz [[project-pomodoro-overlay-audit]].
- Bramka: **SHA-256 podaje Mariusz** po skanie VT dokładnie tego pliku, który jest assetem Release. Nic na GH bez zgody [[feedback_permission_explanations]]; licencje spójne w 4 miejscach [[license-audit-guardian]].

**STAN v1.3.0 (w toku, 2026-07-02) — przygotowane lokalnie, NIC nie wypchnięte:**
- Klon zsynchronizowany z lokalnym kodem (funkcje niereleasowane: tryb skupienia, panel „czas minął—ukończone?",
  „Zacznij teraz", żywa kolejka/ETA, „Cofnij", osobne okno help.html) + 16 poprawek z audytu (F1–F16: tani hit-test
  klikalności, brak „wskrzeszania" zadań w managerze, poprawki focus/topmost/tray/rozdzielczość, dźwięk na askDone,
  skróty AltGr+D/T, itd.).
- `package.json` 1.2.1→**1.3.0** + `help.html` dodane do `build.files` (było ładowane, a nie pakowane = bug).
- `CHANGELOG.md` wpis v1.3.0; stringi wersji ujednolicone; `TERMS_VERSION` bez zmian (=1, terms nietknięte).
- Landing na v1.3.0, v1.2.1 w archiwum, **SHA = placeholder `PENDING_SHA256` (6 miejsc)**.
- Zadanie/kroki końcowe: `C:\ClaudeSANDDBOX\ZADANIE-Release-v1.3.0.md`.
- **Decyzja Mariusza: DROGA A ZAWSZE** (asset z CI, nie lokalny). Local build v1.3.0 = tylko pre-check:
  `mojepomodoro\release\MojePomodoro_Setup_v1.3.0.exe`, SHA `bf2ca75cdbcfb2eae3bfb043fbce329de9e22701d1e3ec9fa32c7e4587d014cc`,
  VirusTotal **0/67 czysto** (02.07.2026).
- WYKONANE 02.07.2026: commit `82f83f7` (kod, BEZ docs) na main + tag `v1.3.0` wypchnięte → CI (run 28577913732) SUKCES.
  **Release v1.3.0 opublikowany** z assetem `MojePomodoro_Setup_v1.3.0.exe` + `SHA256SUMS.txt` + provenance (verify=exit 0).
  **SHA z CI (autorytatywny) = `65745e270955d6e046d2ff003de7f95d7aec447662f48d26949ac56d24ffab9b`** — INNY niż lokalny bf2ca75c
  (NSIS niereprodukowalny bajt-w-bajt; potwierdza, że pod drogą A VT robimy na assetcie CI, nie na lokalnym buildzie).
  Asset pobrany do `C:\ClaudeSANDDBOX\ci-v1.3.0\` (suma == SHA256SUMS ✓).
- ⚠️ v1.3.0 MA REGRESJĘ ZWIJANIA (mini-listwa nad paskiem): (a) nie zasłaniała zegara [F5 „rezerwa 200px” — cofnięte],
  (b) znika po PrtScn/Alt+Tab. Próba fixu (reasercja `tray` co 1 s w reassertTopmost) → MIGOTANIE co 1 s; usunięcie reasercji →
  listwa i tak się chowa i NIE wraca. W v1.2.1 działało płynnie (zasłaniało zegar, trzymało się, bez migotania).
  Problem z-order/DWM overlay(transparent) vs tray(opaque) — NIEROZWIĄZANY „na ślepo”.
- **v1.3.1 przygotowane lokalnie (kod+build `release\MojePomodoro_Setup_v1.3.1.exe`), NIEwypchnięte — NIE wydawać, dopóki zwijanie
  nie jest naprawione i przetestowane.** HEAD wciąż `82f83f7` (v1.3.0); landing nietknięty (v1.2.1, `PENDING_SHA256`).
- **Przekazane do NOWEGO CZATU:** pełny audyt + naprawa od buga zwijania → prompt `C:\ClaudeSANDDBOX\PROMPT-Audyt-Nakladka-Collapse_dla-nowego-czatu.md`.
  Baseline do diffu: tag `v1.2.1` (`git show v1.2.1:main.js`). Droga wydania: A zawsze (asset z CI → VT → landing z realnym SHA).

**BUG ZWIJANIA ROZWIĄZANY (02.07.2026, sesja audytu):**
- Diagnoza sondą Win32 (z-order, nie piksele; skrypt wzorzec: scratchpad `probe.ps1` — GetTopWindow/GW_HWNDNEXT
  + keybd_event): **v1.2.1 padał TAK SAMO** — deterministyczny wyzwalacz `PrtScn (nakładka Wycinania) → Alt+Tab`
  wstawia pasek zadań NAD listwę na stałe; reasercja co 1 s leczyła tylko overlay. „Regresji w diffie" nie było —
  w v1.2.1 Mariusz po prostu nie trafiał wyzwalacza. Czysty Alt+Tab / toast / nowe okno NIE wyzwalają.
- **FIX w `reassertTopmost()` (main.js):** przy `S.collapsedMode` podbijaj co 1 s WYŁĄCZNIE listwę
  (`tray.setAlwaysOnTop`, bez `setBounds`, bez overlaya — overlay przy zwinięciu jest pusty i click-through)
  + samonaprawa widoczności (`showInactive` gdy ukryta). Migotanie z dawnej próby brało się z podbijania
  DWÓCH okien w tej samej sekundzie — jedno opaque okno bez zmiany rozmiaru nie mruga (zmierzone: 51/51
  próbek co 300 ms identyczny z-order).
- Zweryfikowane dev + packaged (`release\win-unpacked\Pomodoro Overlay.exe`): zabójcza sekwencja leczona ≤1 s.
- **Domyślny start = zwinięta listwa** (życzenie Mariusza, 02.07): `S.collapsedMode: true` + w `createTray`
  `ready-to-show → syncTray()` (listwa widoczna od razu, bez czekania na strażnika). Wpis w CHANGELOG „Zmienione".
- **Dokumentacja zsynchronizowana z v1.3.1 (02.07):** help.html (start zwinięty, tryb skupienia ⛶ + sekcja,
  autozapis/„Cofnij"/„Zacznij teraz", skróty F/D/T, ✓/✗ zamiast ✓→) + INSTRUKCJA.md (te same zmiany) +
  manager.html (alert importu CSV kazał klikać nieistniejący przycisk „Zapisz i zastosuj" → autozapis).
  Landing docs/ celowo NIE ruszony (opisuje wydaną v1.2.1; aktualizacja przy wydaniu).
- Stan plików: fix w working tree klonu (main.js + CHANGELOG v1.3.1 przepisany), przebudowany
  `release\MojePomodoro_Setup_v1.3.1.exe` (z fixem); stary zbugowany instalator = `*_PRZED-FIXEM-listwy.exe.bak`.
  Worktree porównawczy: `C:\ClaudeSANDDBOX\mojepomodoro-baseline-v121` (tag v1.2.1) — można usunąć
  `git worktree remove` po wydaniu. Backup stanu appki: scratchpad sesji (`pomodoro.json`).
- NAPRAWIONE 02.07 (wieczór, po zgłoszeniu Mariusza „✓ niedostępny na pasku"): (1) `shrinkOverlay()`
  nie rusza już `collapsedMode` → edycja/`saveTasks`/`startTaskNow`/`nextTask` przy zwiniętej listwie
  NIE chowa listwy; (2) `syncTray()` + samonaprawa reasercji wysyłają świeży stan przy pokazaniu listwy
  (ukryta nie dostaje broadcastów → stale render); (3) ✓ na listwie widoczny przy KAŻDEJ aktywnej fazie
  z zadaniem (też przerwa/pauza), `doneKeepTimer` działa w przerwie (przerwa biegnie dalej). Diagnoza
  i weryfikacja: sonda CDP (`--remote-debugging-port=9222` + node, wzorzec: scratchpad `cdp-probe.js`).
  Sedno zgłoszenia: user miał PUSTĄ listę zadań (backup: tasks:[]) → ✓ słusznie ukryty; przy okazji
  wyszły realne bugi 1–3.
- POPRAWKI LISTWY 03.07 (zgłoszenie Mariusza): (1) dymki (data-tip) na listwie były UCINANE — okno tray
  ma dokładnie wysokość paska zadań, a dymek rysował się NAD przyciskiem = poza obrysem okna; fix:
  `body.role-tray` (klasa nadawana w overlay.html przy ROLE==='tray') + CSS rysujący dymek WEWNĄTRZ
  listwy obok przycisku (w prawo dla ⏭/✓ przy lewej krawędzi, w lewo dla ▶/▴/✕); NIE powiększać okna
  tray (jest celowo opaque — fundament braku migotania). (2) ⏭/✓ przeniesione na LEWĄ stronę nazwy
  zadania (spójnie z widgetem ✗/✓ przed nazwą). Weryfikacja: CDP Input.dispatchMouseEvent (hover) +
  Page.captureScreenshot okna tray (skrypt wzorzec: scratchpad `tooltip-shot.js`) — dymki w całości
  widoczne. Zsynchronizowane: CHANGELOG, help.html, INSTRUKCJA.md (opis kolejności elementów paska).
- OTWARTE (audyt UX): panel „czas minął — ukończone?" (askDone) przy zwiniętej listwie widoczny tylko
  w ukrytym widgecie („Jeszcze pracuję" niedostępne z listwy; samo ✓ już tak).
- ONBOARDING (propozycja zaakceptowana kierunkowo, mockup 6 slajdów w sesji 02.07): `onboarding.html`
  po wzorze terms.html; wyzwalacze: first-run + `ONBOARDING_VERSION` + przycisk w Managerze + checkbox
  „przy każdym starcie" (domyślnie off). WYMÓG Mariusza: ekrany IDENTYCZNE z produkcją → zrzuty robić
  programowo `webContents.capturePage` z żywej aplikacji w zadanych stanach, nie rysować makiet.
- DECYZJA 03.07: wydanie v1.3.1 DOPIERO po pełnym audycie w NOWYM CZACIE — prompt:
  `C:\ClaudeSANDDBOX\PLAN-Audyt-Funkcjonalnosci-MojePomodoro_dla-nowego-czatu.md`. Powstały:
  `mojepomodoro\FUNKCJONALNOSCI.md` (rejestr rozwiązań = checklista audytu; standard globalny
  patrz [[standard-rejestr-rozwiazan]] i C:\ClaudeSANDDBOX\CLAUDE.md) oraz `mojepomodoro\dev-tools\`
  (probe.ps1, cdp-probe.js, tooltip-shot.js + README — skopiowane ze scratchpada, żeby przetrwały sesję).
- POPRAWKI 03.07 rano (zbudowane w Setup_v1.3.1.exe, zweryfikowane zrzutami CDP): dymki na listwie
  rysowane WEWNĄTRZ paska (body.role-tray; nad przyciskiem = poza obrysem okna = ucięte; NIE powiększać
  okna tray — celowo opaque) + ⏭/✓ przeniesione na LEWĄ stronę nazwy zadania (spójnie z widgetem).
- **PEŁNY AUDYT WYKONANY 03.07.2026 (sesja audytu wg PLAN-Audyt-...)** — wszystkie 11 obszarów; rejestr
  FUNKCJONALNOSCI.md ostemplowany (poza 2 pozycjami „z userem"). NAPRAWIONE w audycie (dev+packaged):
  B1 askDone przy zwiniętej listwie → auto-rozwinięcie widgetu (`doExpand` w tick; decyzja Mariusza
  „przywróć duże okno i zapytaj"); B2 askDone pod niezamkniętym ekranem PRACA → `workStartExpanded=false`
  w tej samej gałęzi. Build PRZEBUDOWANY 03.07 19:31 z fixami (Setup_v1.3.1.exe, SHA lokalny pre-check
  5866AD4211E3589275775DE4EB61D200C4A2530E39ED79FAD0767A0928732DB5). OTWARTE (decyzje Mariusza): B3 kurtyny
  zasłaniają Taskmgr (poziom 'floating' Electrona = no-op na Windows; NIE regresja — tak samo w v1.3.0);
  O6 przy autoukrywaniu paska listwa poza ekranem (od v1.2.1); drobne O1–O5 w FUNKCJONALNOSCI/raporcie.
  Nowe dev-tools: window-shot.js, csv-roundtrip-test.js (20/20), hotkey-press.ps1. UWAGA metodyczna:
  syntetyczne akordy klawiszowe NIE wyzwalają RegisterHotKey (zmierzone świadkiem) — skróty fizycznie
  testuje user; kolizja skrótów zweryfikowana (warn + miękka degradacja). Długi bieg 31 min packaged:
  idle ~4,6% CPU sumarycznie, RAM stabilny (~694 MB, bez wycieku). Backup pomodoro.json usera przywrócony.
**WYDANE v1.3.1 (2026-07-03/04, droga A, po „OK" Mariusza):** commit `e4bba96` (kod+FUNKCJONALNOSCI.md+dev-tools/,
BEZ docs) + tag `v1.3.1` → CI run 28677832860 SUKCES → Release v1.3.1 (nie-draft) z assetem
`MojePomodoro_Setup_v1.3.1.exe` + `SHA256SUMS.txt` + provenance (verify exit 0). **SHA z CI (autorytatywny) =
`abc258b9417ab27d31c9dec513d626dc93fb69c6dc1ec489e2035875a870fb2b`**. VirusTotal: Mariusz zeskanował asset,
publiczny raport 0/67 (brzmienie na landingu/w komunikacji ZAWSZE miękkie). Landing docs/ z realnym SHA (6 miejsc,
0 PENDING) → commit `6756b22` → Pages. UWAGA: pierwszy deploy Pages padł „Deployment failed, try again later"
(transient GitHub) — `gh run rerun <id>` naprawił, strona LIVE z v1.3.1 (HTTP 200, asset .exe 200, v1.2.1 w archiwum).
Worktree `mojepomodoro-baseline-v121` USUNIĘTY (`git worktree remove`). HEAD `6756b22`, working tree czysty.
- STAN OTWARTY po wydaniu (do ew. v1.3.2, decyzje Mariusza): B3 kurtyny zasłaniają Menedżer zadań (poziom 'floating'
  Electrona = no-op na Windows; NIE regresja); O6 przy autoukrywaniu paska listwa poza ekranem (trayBounds od workArea,
  od v1.2.1); drobne O1 (skip w pauzie→przerwa bez ▶), O2 (brak maxlength w polach nazw), O3 („←" wraca na pauzie),
  O4/O5 (kosmetyka focus/manager). Szczegóły w `mojepomodoro/FUNKCJONALNOSCI.md` (rejestr ostemplowany 2026-07-03).

**v1.3.2 ONBOARDING — zaimplementowany, przetestowany, WYDANY 2026-07-04 (droga A):**
- Samouczek pierwszego uruchomienia: `onboarding.html` (640×720, wzór 1:1 terms.html), 6 slajdów z PRAWDZIWYMI
  zrzutami (`assets/onboarding/*.png`, generator `dev-tools/capture-onboarding.js`). Bramka `maybeOnboardThenStart()`
  MIĘDZY terms a startApp; `ONBOARDING_VERSION`+`S.onboardingVersion`. 3 warianty: first-run / po aktualizacji /
  „🎓 Samouczek" w Managerze (cmd `openOnboarding`, {startup:false}). Checkbox „przy każdym starcie" = `S.onboardingEveryStart`
  (dom. OFF). Pełny opis: `mojepomodoro/FUNKCJONALNOSCI.md` sekcja 10b.
- DWA świadome odstępstwa od PLAN-Onboarding (zaakceptowane przez Mariusza): (1) `onboardingEveryStart` OSOBNE pole S,
  NIE w settings — bo autozapis Managera (sanitizeSettings na danych bez pola) by je zerował; (2) most `openOnboarding`
  = modułowy `let` przypisany w bloku gotTheLock (deklaracja MUSI być PRZED blokiem — inaczej TDZ; złapane w teście).
- Wersjonowanie: onboarding = v1.3.2 (v1.3.1 potwierdzona jako WYDANA — Release Latest; wcześniejszy indeks pamięci
  mylnie mówił „niewydana"). `package.json` version→1.3.2, `build.files` += `onboarding.html` + `assets/onboarding/`.
- Testy DEV (CDP, apka `npx electron .`/detached Start-Process + port 9222) — 7/7 scenariuszy OK: first-run terms→onboarding→start,
  po aktualizacji, wariant z Managera BEZ 2× startApp (overlay zostaje 3), normalny start BEZ onboardingu (brak regresji),
  everyStart ON/OFF, krzyżyk w trybie startowym→start i tak wstaje. Backup usera `pomodoro.json` zrobiony i PRZYWRÓCONY.
- Nowe dev-tools: `eval-in.js` (eval w konkretnym oknie po URL; `@plik` omija bug PS5.1 z cudzysłowami w argv exe),
  `capture-onboarding.js` (zrzuty 1:1). ZOSTAJE do zrobienia po „OK": packaged parity (`npm run build:win` +
  `release\win-unpacked\Pomodoro Overlay.exe`: first-run + wariant z Managera) → wydanie drogą A (tag v1.3.2 → CI →
  SHA z CI → VirusTotal miękko → landing docs). ⚠️ Uwaga uruchamianie dev: electron jako background PowerShell-task GINIE
  przy sprzątaniu taska — uruchamiać przez `Start-Process` (detached); CDP `/json` przez node fetch, NIE Invoke-RestMethod (proxy→timeout).

**STATUS 2026-07-04 (koniec sesji onboarding+wydanie):** v1.3.2 WYDANA (Release+tag `v1.3.2`, SHA z CI
`e0609527b289166b7b5b68de9e938018c17a6c169943c3c1ed03e4cce3acb177`, provenance exit 0, asset w `C:\ClaudeSANDDBOX\ci-v1.3.2\`).
ZOSTAJE: (a) VirusTotal v1.3.2 (Mariusz, miękko), (b) LANDING `docs/` NADAL na v1.3.1 — do aktualizacji przy najbliższym
wydaniu, (c) FIX migania dymków w Managerze (`manager.html` → `body{overflow-x:hidden}`) — w working tree, NIEzacommitowany
→ wydać jako **v1.3.3**. Przyczyna migania (zdiagnozowana pomiarem CDP): dymek `data-tip` przy prawej krawędzi + `body`
`overflow-y:auto` wymusza `overflow-x:auto` (reguła CSS) → poziomy scrollbar → reflow → miganie przy hoverze na przyciski
konfiguracji. Trade-off fixu: długie dymki przy prawej krawędzi przycinane (pełne rozwiązanie = wyrównanie dymka do prawej
krawędzi elementu, planowane w v1.3.3). Prompt do nowego czatu: `C:\ClaudeSANDDBOX\PROMPT-Wydanie-v1.3.3-MojePomodoro_dla-nowego-czatu.md`.
Nowe dev-tools tej sesji: `eval-in.js`, `capture-onboarding.js`, `hover-shot.js` (scratchpad — do przeniesienia do dev-tools jeśli przydatny).
