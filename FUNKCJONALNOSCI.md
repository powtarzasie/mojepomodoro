# FUNKCJONALNOSCI.md — rejestr rozwiązań MojePomodoro

> **Po co ten plik.** To punkt wyjścia dla każdego (człowieka i AI), kto wprowadza zmiany.
> Zawiera pełną listę funkcjonalności, opcji i NIETYPOWYCH mechanizmów wraz z uzasadnieniem
> „dlaczego tak" — żeby nie odkrywać istniejących rozwiązań na nowo i nie psuć decyzji
> podjętych świadomie.
>
> **Zasady użycia (obowiązkowe):**
> 1. **PRZED zmianą** przeczytaj sekcje, których zmiana dotyka (zwłaszcza „Mechanizmy" i „Ślepe uliczki").
> 2. **PO zmianie** zaktualizuj rejestr w tym samym przebiegu co kod (nowa funkcja = nowy wiersz;
>    zmiana zachowania = aktualizacja wiersza; odrzucony pomysł = wpis w „Ślepych uliczkach").
> 3. Kolumna „Zweryfikowano" = data ostatniego świadomego testu tej pozycji (audyt ją stempluje).
>
> Rejestr ≠ CHANGELOG: changelog opisuje historię wydań dla ludzi, rejestr opisuje AKTUALNY stan
> i powody. | Stan: **v1.3.2 (onboarding, w toku), 2026-07-04** — v1.3.1 WYDANA 2026-07-03/04 (Release Latest) | Źródło prawdy: `C:\ClaudeSANDDBOX\mojepomodoro`

---

## 1. Architektura w pigułce

| Okno | Plik / rola | Charakter | Po co osobne |
|---|---|---|---|
| `overlay` | overlay.html (`--role=overlay`, domyślna) | pełnoekranowe, **przezroczyste**, klik „na wskroś" sterowany hit-testem | jedno stałe okno na widget + kurtyny PRZERWA/PRACA; **NIGDY nie jest skalowane ani chowane** (patrz Mechanizm M1) |
| `tray` | overlay.html (`--role=tray`) | małe, **nieprzezroczyste**, nad paskiem zadań przy prawej krawędzi | pełnoekranowe okno nie może rysować po pasku zadań; opaque = pokaż/ukryj bez migotania (M2) |
| `focusWin` | overlay.html (`--role=focus`) | nieprzezroczyste, realny fullscreen | Windows chowa wtedy pasek zadań — transparent overlay tego nie umie (M6) |
| `manager` | manager.html | zwykłe okno | zadania + ustawienia + plan dnia |
| `help` | help.html | zwykłe okno | instrukcja obok aplikacji; **musi być w `build.files`** (bug v1.3.0: ładowane, a niepakowane) |
| `terms` | terms.html | pierwsze uruchomienie | akceptacja warunków; zamknięcie bez zgody = wyjście z aplikacji |
| `onboarding` | onboarding.html (v1.3.2) | samouczek: first-run / po aktualizacji / z Managera | nieprzezroczyste, wyśrodkowane 640×720; wzór 1:1 z terms.html; **opcjonalny** (zamknięcie NIE blokuje startu) |

Rola okna: `additionalArguments: ['--role=…']` → `preload.js` → stała `ROLE` w rendererze;
`ROLE==='tray'` dodaje klasę `body.role-tray` (odrębny CSS listwy, np. dymki).

Stan trzyma **main** (obiekt `S`), renderery są bierne: broadcast kanałem `state` (odchudzony
`leanState()`, bez listy zadań) + osobny kanał `tasks` (`pushTasksIfChanged`). Ukryta listwa NIE
dostaje broadcastów — po każdym pokazaniu musi dostać świeży stan (patrz M5).

## 2. Timer i fazy

| Funkcja | Gdzie | Uwagi / decyzje | Zweryfikowano |
|---|---|---|---|
| Fazy `work / shortBreak / longBreak / idle / done` | main.js `S.phase`, `tick()` | źródło prawdy odliczania = `phaseEndsAt` (znacznik ms), nie licznik — odporne na dryf; dokładność zmierzona: Δlicznika = Δzegara ściennego ±1 s | 2026-07-03 |
| Długa przerwa co N pomodoro | `settings.longBreakAfter` (dom. 4) | kropki postępu w widgecie/kurtynie; pełny cykl praca→krótka→praca→długa zweryfikowany przy longBreakAfter=2 | 2026-07-03 |
| Start/pauza | cmd `toggle`, AltGr+P | pauza zatrzymuje `phaseEndsAt` przeliczeniem `phaseLeft`; pauza zamraża też `taskSpent` | 2026-07-03 |
| Pomiń fazę | cmd `skipPhase`, AltGr+K | działa w obu kierunkach (praca↔przerwa). Uwaga: skip w trakcie PAUZY zostawia przerwę spauzowaną, a kurtyna przerwy nie ma ▶ (wznowienie tylko AltGr+P / po zwinięciu) — odnotowane w audycie 07.2026, decyzja usera czy ruszać | 2026-07-03 |
| Reset | cmd `resetTimer` | przycisk w managerze; zeruje taskSpent i pomsDone, świeży blok na pauzie | 2026-07-03 |
| Po wybudzeniu z uśpienia | `powerMonitor.on('resume') → tick()` | natychmiastowe przeliczenie zamiast czekania na interwał; test z userem (packaged): po ~3,5 min snu licznik od razu poprawny, listwa nad paskiem, nakładka odrysowana | 2026-07-03 |
| Koniec pracy z zadaniem → pytanie | `S.askDone`, cmd `continueAfterTimeUp` | faza NIE przełącza się sama; wybór: ☕ przerwa / ▶ następne / ↻ jeszcze pracuję + sygnał dźwiękowy. Panel MUSI być widoczny: przy zwiniętej listwie widget rozwija się AUTOMATYCZNIE (`doExpand` w tick), a niezamknięty ekran PRACA jest chowany (`workStartExpanded=false` — inaczej kurtyna zasłania pytanie); powrót do zwiniętej ręcznie (▾/AltGr+M), spójnie z kurtynami | 2026-07-03 |
| Prosty pomodoro bez zadań | main.js `tick()` → `nextPhase()` | pusta lista: koniec pracy przechodzi w przerwę automatycznie, BEZ pytania askDone | 2026-07-03 |

## 3. Zadania

| Funkcja | Gdzie | Uwagi / decyzje | Zweryfikowano |
|---|---|---|---|
| Model zadania | `{id, name, totalMinutes}` (`sanitizeTask`) | budżet minut na zadanie; `taskSpent` limit 480 min; nazwa cięta do 200 znaków (main; bufor managera pokazuje dłuższą do odświeżenia — kosmetyka, odnotowane w audycie 07.2026) | 2026-07-03 |
| Ukończ (✓) | cmd `doneKeepTimer`, AltGr+D | dostępny w KAŻDEJ aktywnej fazie z zadaniem; zweryfikowane: środek bloku, przerwa (przerwa biegnie dalej), pauza (pauza i licznik nietknięte), dokładnie na granicy bloku (domyka askDone + przezbraja świeży blok), ostatnie zadanie (→ `done`) | 2026-07-03 |
| Zrezygnuj/pomiń (✗) | cmd `nextTask` | zapis w logu jako „pominięte"; następne zadanie dostaje ŚWIEŻY blok na pauzie | 2026-07-03 |
| Ukończ przed czasem | cmd `completeEarly` → panel wyboru → `chooseBreak`/`chooseNext`/`cancelEarly` | `taskEarlyDone` czeka na wybór; „←" (cancel) wraca do timera NA PAUZIE (świadomie); „Następne" kontynuuje bieżący blok | 2026-07-03 |
| „Zacznij teraz" | cmd `startTaskNow` | promocja zadania z kolejki + pytanie co z przerwanym (wróć/pomiń/anuluj); „pomiń" loguje `skipped` | 2026-07-03 |
| Autozapis managera | manager.html `scheduleApply` (debounce 600 ms) → `saveTasks` | BEZ przycisku „Zapisz" — komunikaty nie mogą go przywoływać; NIE wolno przy tym chować listwy (M4); zapis przy otwartym panelu askDone NIE zamyka panelu (preserved-path) | 2026-07-03 |
| Cofnij (undo) | manager.html (migawka przed zmianą) | jedna głębokość — wystarcza; cofa dodanie/usunięcie, aplikuje od razu | 2026-07-03 |
| Brak „wskrzeszania" | main.js `saveTasks` + reconcyliacja w manager.html `onTasks` | zadanie ukończone przez timer W TRAKCIE edycji listy nie wraca; edycje usera przeżywają wyścig | 2026-07-03 |
| Import/eksport CSV | manager.html + main.js `parseTasksFromCSV`/`exportTasks` | format zgodny w obie strony — round-trip 20/20 testów `dev-tools/csv-roundtrip-test.js` (średniki/cudzysłowy/nowe linie w nazwach, nagłówki, „1,5"→2, clampy, TAB/przecinek); natywne dialogi Windows poza zasięgiem CDP — ścieżka zweryfikowana odczytem kodu | 2026-07-03 |
| Plan dnia / ETA | manager.html `computePlan` | pasek postępu bieżącego + „za ~X min" przy kolejnych + chip „N zadań · Σ min · koniec ~GG:MM" (uwzględnia przerwy); zweryfikowane rachunkowo przy 3 i 55 zadaniach | 2026-07-03 |
| Pusta lista przy starcie | main.js (setTimeout 700 ms) | automatycznie otwiera managera (visible+focus) | 2026-07-03 |
| 50+ zadań | manager.html `renderTaskList` | 55 zadań: render 9 ms, pełna synchronizacja z main — bez problemów wydajnościowych | 2026-07-03 |

## 4. Widget (rozwinięty)

| Funkcja | Gdzie | Uwagi | Zweryfikowano |
|---|---|---|---|
| Nagłówek: ⚙ manager, ⛶ skupienie, S/M/L, ◐ przezroczystość, ▾ zwiń, ✕ zamknij | overlay.html, cmd `setSize`/`setOpacity` | rozmiar i opacity zapisywane w pomodoro.json; S/M/L = 260/330/420 px; suwak ◐ chowa nazwę/✓/✗ na czas regulacji | 2026-07-03 |
| ✗/✓ PRZED nazwą zadania | overlay.html `task-row` | świadoma decyzja usera (spójna z listwą); ✓ widgetu = completeEarly (panel), ✓ listwy/focus = doneKeepTimer (natychmiast) — celowa różnica | 2026-07-03 |
| Przeciąganie + zapamiętanie pozycji | cmd `saveWidgetPos`, `S.pos` | drag obsługuje renderer; pozycja = współrzędne EKRANU w pliku; clamp na krawędziach ekranu przy dragu i przy `placeWidget` | 2026-07-03 |
| Pasek postępu budżetu zadania | overlay.html `prog-fill` | minuty faktyczne / plan; overtime = gradient czerwony + „+X min (plan: Y min)" | 2026-07-03 |
| Ostatnia minuta na czerwono | overlay.html | tylko sygnał wizualny; wyłącznie gdy timer BIEGNIE (pauza gasi) | 2026-07-03 |

## 5. Mini-listwa (tryb zwinięty) — **tak startuje aplikacja**

| Funkcja | Gdzie | Uwagi | Zweryfikowano |
|---|---|---|---|
| Start aplikacji = zwinięta | main.js `S.collapsedMode: true` + `createTray` `ready-to-show → syncTray()` | listwa widoczna od razu, bez czekania na strażnika; potwierdzone na kilku restartach | 2026-07-03 |
| Pozycja: NAD paskiem zadań, prawa krawędź, **zasłania zegar** | `trayBounds()` — szer. `max(340, 28% ekranu)`, wys. = pasek zadań | zasłanianie zegara to WYMÓG (własny licznik zamiast godziny); NIE dodawać „rezerwy" z prawej (regresja v1.3.0); pomiar Win32: rect 1382→1920 (=prawa krawędź, szer. 538 = 28% z 1920) | 2026-07-03 |
| Układ: 🍅 \| ⏭ ✓ \| nazwa \| czas \| ▶ ▴ ✕ | overlay.html `#taskbar-view` | ⏭/✓ po LEWEJ stronie nazwy (życzenie usera, spójne z widgetem); zrzut w audycie 07.2026 | 2026-07-03 |
| ✓ widoczny gdy aktywna faza + zadanie | overlay.html `renderTaskbar` | patrz sekcja 3 (doneKeepTimer) | 2026-07-03 |
| Dymki WEWNĄTRZ listwy | CSS `body.role-tray [data-tip]` | patrz M3 — dymek nad przyciskiem byłby poza obrysem okna (ucięty); zrzuty wszystkich 5 przycisków: ⏭/✓ otwierają w prawo, ▶/▴/✕ w lewo, nic nie ucięte | 2026-07-03 |
| Strażnik topmost (1 s) | main.js `reassertTopmost()` | przy zwinięciu podbijana WYŁĄCZNIE listwa + samonaprawa widoczności + świeży stan; patrz M2. Zmierzone sondą: PrtScn→Alt+Tab, czysty Alt+Tab, toast — trayNADpaskiem=True zawsze, powrót ≤1 s; monitor 41 próbek co 300 ms: zero wariancji z-order (brak migotania) | 2026-07-03 |
| Zwiń/rozwiń | cmd `toggleCollapse`/`collapseWidget`/`expandWidget`, AltGr+M, ▾/▴ | kurtyny rozwijają celowo (`expandOverlay`), akcje managera NIE (M4); ▾/▴/tb-▴ klikane w audycie | 2026-07-03 |

## 6. Kurtyny pełnoekranowe (PRZERWA / PRACA)

| Funkcja | Gdzie | Uwagi | Zweryfikowano |
|---|---|---|---|
| Kurtyna przerwy | `S.breakExpanded`, overlay.html `break-screen` | duży timer, pomiń, zwiń, pasek postępu, kropki pomodoro; krótka=zielona, długa=niebieska „DŁUGA PRZERWA"; „Dalej: <następne zadanie>" | 2026-07-03 |
| Ekran PRACA po przerwie | `S.workStartExpanded` | pokazuje następne zadanie + „Na zadanie: zostało ~X min" (budżet CAŁEGO zadania, osobno od bloku); „Zaczynam!"/„Zmniejsz" → widget. Niezamknięty ekran PRACA jest chowany przy askDone (patrz sekcja 2) | 2026-07-03 |
| Poziom okna: kurtyny `floating`, reszta `screen-saver` | `applyWindowLevel()` | **UWAGA (audyt 07.2026, B3 — OTWARTE):** na Windows parametr poziomu Electrona nic nie zmienia (działa na macOS) — kurtyna jest zwykłym topmost. Zmierzone: pasek zadań (topmost) JEST nad kurtyną ✅, ale Menedżer zadań (nie-topmost) jest POD kurtyną — deklaracja z v1.3.0 „nie zasłania Menedżera" jest nieścisła (to samo zachowanie w v1.3.0 — NIE regresja). Furtki: przyciski kurtyny, AltGr+M/K, taskbar klikalny. Decyzja o ew. fixie (blur→zdjęcie topmost jak w focusWin) — user | 2026-07-03 |

## 7. Tryb skupienia (pełny ekran)

| Funkcja | Gdzie | Uwagi | Zweryfikowano |
|---|---|---|---|
| Wejście/wyjście | cmd `enterFocus`/`exitFocus`/`toggleFocus`, AltGr+F, ⛶, Esc | osobne okno `focusWin` (realny fullscreen chowa pasek zadań — zmierzone: taskbar Z=185, niewidoczny); wejście TYLKO w fazie pracy (w przerwie zablokowane); po Alt+F4 okno odtwarzane leniwie | 2026-07-03 |
| Klawisze w trybie | Enter/Spacja = start/pauza, Esc = wyjście | ✓ w trybie (focus-done) ukańcza zadanie i ZOSTAJE w trybie z następnym | 2026-07-03 |
| Alt+F4 w trybie | `focusWin.on('closed')` | samonaprawa: wyjście z trybu + powrót nakładki (bez „ślepego ekranu"); zweryfikowane WM_CLOSE | 2026-07-03 |
| Blur zdejmuje topmost | main.js (handler blur) | topmost faktycznie spada (Win32 Top=False); UWAGA (O4, kosmetyka): okno aktywowane JAKO PIERWSZE może chwilowo zostać pod czarnym ekranem (kolejność zdarzeń raise→blur) — druga aktywacja (np. Alt+Tab) wynosi je na wierzch; strażnik respektuje `isFocused()` | 2026-07-03 |
| Koniec bloku pracy | main.js | tryb skupienia sam się wyłącza; z zadaniem → od razu panel „Ukończone?" w widgecie | 2026-07-03 |

## 8. Dźwięk

| Funkcja | Gdzie | Uwagi | Zweryfikowano |
|---|---|---|---|
| Sygnał zmiany fazy | overlay.html `chime()` — WebAudio, bez plików | praca: 660→880 Hz (w górę), przerwa: 523→392 (w dół); gra tylko okno `overlay` (strażnik ROLE — bez dublowania); `chime()` wykonuje się bez błędów (CDP); słyszalność potwierdzona uchem przez usera 03.07 | 2026-07-03 |
| Sygnał przy „czas minął — ukończone?" | `askDone && !prevAskDone → chime` | najważniejszy moment nie jest niemy; ścieżka wykonywana przy każdym askDone audytu | 2026-07-03 |
| Odblokowanie audio | pierwszy klik (polityka autoplay Chromium) | `ensureAudio()` na window click + okno overlay ma `autoplayPolicy: no-user-gesture-required` — AudioContext w stanie `running` bez gestu (zmierzone) | 2026-07-03 |

## 9. Skróty klawiszowe (globalne)

`AltGr+litera ≡ Ctrl+Alt+litera` na Windows. Litery dobrane tak, by NIE kolidowały z polskimi
znakami (dlatego K zamiast S, M zamiast C). Nieudana rejestracja (skrót zajęty) = tylko warn
(zweryfikowane 2026-07-03: zewnętrzny proces trzymał Ctrl+Alt+P → dokładny warn w stderr, apka
działa dalej z pozostałymi 5). Rejestracja TYLKO przy starcie — skrót utracony w kolizji nie
wraca po zwolnieniu przez obcą aplikację (do końca sesji). Rejestracja/zwolnienie potwierdzone
sondą RegisterHotKey (wszystkie 6 zajęte przy działającej apce, wolne po zamknięciu); komendy
pod skrótami przetestowane przez IPC; fizyczne naciśnięcia potwierdzone ręcznie przez usera
(2026-07-03). UWAGA metodyczna: syntetyczne akordy (keybd_event/SendKeys) NIE wyzwalają
RegisterHotKey w środowisku audytu (zmierzone świadkiem własnym) — testować fizycznie.

| Skrót | Komenda | | Skrót | Komenda |
|---|---|---|---|---|
| AltGr+P | start/pauza | | AltGr+F | tryb skupienia |
| AltGr+K | pomiń fazę | | AltGr+D | ukończ zadanie |
| AltGr+M | zwiń/rozwiń | | AltGr+T | manager |

## 10. Persystencja, log, autostart, first-run

| Funkcja | Gdzie | Uwagi | Zweryfikowano |
|---|---|---|---|
| Stan aplikacji | `%APPDATA%\pomodoro-overlay\pomodoro.json` | tasks, settings (work/short/long/longBreakAfter), size, opacity, pos, currentIdx, taskSpent, pomsDone, termsVersion; `before-quit → flushSaved` (czyste zamknięcie = pełny zrzut ✅); kill −9 traci najwyżej <1 min postępu (zapis co pełną minutę + debounce 400 ms po komendach) i nie psuje pliku | 2026-07-03 |
| Sanityzacja przy wczytaniu | `sanitizeTask`/`sanitizeSettings`/`clampInt` | currentIdx może == length („wszystko ukończone"). Testy 07.2026: całkiem zepsuty JSON → defaulty + bramka terms; dzikie wartości → wszystkie clampy działają (minuty 1–480, ustawienia w widełkach, size→M, opacity→1, pos→null, idx→0, spent→0, poms→100) | 2026-07-03 |
| Log „plan vs fakt" | `Dokumenty\PomodoroOverlay\pomodoro-log.csv`, cmd `openLogFolder` | CSV, dopisywanie; BOM UTF-8 + nagłówek zweryfikowane bajtowo; wpisy completed/skipped poprawne (w tym polskie znaki i myślniki w nazwach) | 2026-07-03 |
| Autostart z Windows | cmd `setAutostart` | checkbox w managerze; dev: wpis `electron.app.Electron` z argumentem ścieżki (autostartOpts), on/off zweryfikowane w HKCU\...\Run; packaged rejestruje exe (kod) | 2026-07-03 |
| Pojedyncza instancja | `requestSingleInstanceLock` | dev i packaged dzielą lock i userData — nie uruchamiać obu naraz; druga instancja: wychodzi z kodem 0, pierwszej pokazuje+fokusuje managera | 2026-07-03 |
| Warunki korzystania | terms.html + `TERMS_VERSION` (=1) | podbicie stałej wymusza ponowną akceptację; przycisk akceptacji zablokowany do zaznaczenia checkboxa; „Zamknij"/zamknięcie okna = wyjście z aplikacji (0 procesów); akceptacja → flushSaved + startApp | 2026-07-03 |

## 10a. Stabilność systemowa (pomiary audytu)

| Scenariusz | Wynik | Zweryfikowano |
|---|---|---|
| Zmiana rozdzielczości w trakcie działania (1920×1080→1280×720→powrót) | reclamp działa: overlay = nowy ekran +1 px, listwa przeliczona (`max(340, 28%)`, prawa krawędź, nad paskiem), okno focus przeskalowane; packaged | 2026-07-03 |
| Autoukrywanie paska zadań | **OTWARTE (O6):** przy autohide `trayBounds` liczy y od workArea (=pełny ekran) → listwa ląduje POZA ekranem (y=1080 na ekranie 1080 px). Nie regresja (formuła od v1.2.1). Po wyłączeniu autohide wraca poprawnie. Ew. fix: clamp y do `bounds.height − taskbarH` — decyzja usera | 2026-07-03 |
| Drugi monitor | brak drugiego monitora na stanowisku audytu — nie dotyczy | 2026-07-03 |
| Długi bieg ≥30 min (CPU/RAM) | packaged, timer biegnie + pełny przebieg testów parity: RAM/CPU — patrz raport audytu (bez wycieków) | 2026-07-03 |
| Win+L (ekran blokady) | odliczanie przez blokadę 1:1 z zegarem (zmierzone 125 s = 125 s), listwa nad paskiem po odblokowaniu, nakładka tyka — packaged, test z userem | 2026-07-03 |
| Uśpienie → wybudzenie | licznik natychmiast poprawny po wybudzeniu (powerMonitor.resume), listwa nad paskiem, bez blanku — packaged, test z userem | 2026-07-03 |
| Zmiana czasu systemowego | pominięte świadomie: wymaga admina; projektowo znane — timer liczy po zegarze ściennym (`phaseEndsAt`), przestawienie zegara OS przesuwa odliczanie | 2026-07-03 |
| Fizyczne skróty AltGr+P/K/M/F/D/T + słyszalność chime | potwierdzone ręcznie przez usera („zrobione 1 i 2 jest ok") | 2026-07-03 |

## 10b. Onboarding — samouczek pierwszego uruchomienia (v1.3.2)

Nieprzezroczyste, wyśrodkowane okno (`onboarding.html`, 640×720) — kopia BEZPIECZNEGO wzorca
`terms.html`/`help.html`. Architektury nakładki (M1/M2/M6) NIE dotyka. Karuzela 6 slajdów z
**prawdziwymi zrzutami** aplikacji (nie makietami). Wpina się w łańcuch startu MIĘDZY warunki a `startApp()`.

| Element | Gdzie | Uwagi / decyzje | Zweryfikowano |
|---|---|---|---|
| Stan wyzwalania | main.js `ONBOARDING_VERSION` (=1) + `S.onboardingVersion` (w `snapshot()`) | jak `termsVersion`: podbicie stałej = istniejący user zobaczy samouczek RAZ („co nowego") | 2026-07-04 |
| Bramka startu | main.js `maybeOnboardThenStart()` (w bloku `gotTheLock`), wpięta w `whenReady` i `terms-accepted` zamiast `startApp()`; strażnik `safeStartApp()` | `startApp()` dokładnie RAZ (chroni przed dublem z „Zacznij" i z `on('closed')`) | 2026-07-04 |
| Wariant 1 — pierwsze uruchomienie | terms → onboarding → startApp | kolejność zweryfikowana (CDP) | 2026-07-04 |
| Wariant 2 — po aktualizacji | `onboardingVersion != ONBOARDING_VERSION` → onboarding „co nowego" → start | zweryfikowany na realnym stanie usera (brak pola → 0 ≠ 1) | 2026-07-04 |
| Wariant 3 — na żądanie | przycisk „🎓 Samouczek" w Managerze (`manager.html`, obok `#help-btn`) → cmd `openOnboarding` → okno `{startup:false}` | NIE woła `startApp()` (apka działa dalej); brak drugiego startu/duplikatów okien zweryfikowany | 2026-07-04 |
| Opcja „przy każdym starcie" | checkbox na ostatnim slajdzie → `S.onboardingEveryStart` (dom. OFF) | ON → onboarding co start; OFF → nie — zweryfikowane | 2026-07-04 |
| Opcjonalność | zamknięcie krzyżykiem w trybie startowym → `startApp()` i tak wstaje, ale wersja NIE oznaczona (wróci następnym razem) | inaczej niż terms (odrzucenie = wyjście); strażniki `finished`/`startedApp` | 2026-07-04 |
| Sygnał końca | preload `onboardingFinished(everyStart)` → main `ipcMain.on('onboarding-finished')` (per-okno, usuwany na `closed`) | logika slajdów w rendererze; main dostaje tylko sygnał + everyStart; sprawdza `sender` | 2026-07-04 |
| Zrzuty 1:1 | `dev-tools/capture-onboarding.js` (CDP `Page.captureScreenshot`) → `assets/onboarding/*.png` | odświeżalne jednym przebiegiem; widget przycięty do `#widget` (overlay przezroczysty → maska ciemnej karty `.shot` w slajdzie); okna tray/manager/focus nieprzezroczyste | 2026-07-04 |

**Decyzja (challenge) — `onboardingEveryStart` poza `S.settings`:** trzymane jako OSOBNE pole `S`,
bo autozapis Managera (`saveTasks` → `sanitizeSettings` na danych bez tego pola) wyzerowałby flagę
przy każdej edycji zadań. Patrz „Ślepe uliczki".

**Decyzja (scope) — most `openOnboarding`:** modułowe `let` (top-level) przypisywane WEWNĄTRZ bloku
`gotTheLock`, bo `createOnboardingWindow` w trybie startowym musi widzieć `startApp` z tamtego scope,
a `handleCmd` (top-level) woła `openOnboarding`. Wzorzec identyczny jak `manager`/`overlay`. Deklaracja
MUSI być przed blokiem `gotTheLock` (inaczej TDZ dla `let` — blok wykonuje się wcześniej).

## 11. Mechanizmy nietypowe — NAJPIERW PRZECZYTAJ, POTEM ZMIENIAJ

**M1 — Jedno stałe przezroczyste okno nakładki.** Na Windows KAŻDA operacja na powierzchni
przezroczystego okna (resize LUB hide/show) zostawia pustą warstwę (widać pulpit) aż do realnego
kliknięcia. Dlatego overlay jest tworzony RAZ na cały ekran i wszystkie tryby to wyłącznie zmiany
DOM/CSS w środku. Zwykłe odrysowanie DOM (tykający zegar) działa bez zarzutu. (Komentarz w main.js
nad `let overlay`.)

**M2 — Strażnik topmost podbija JEDNO okno.** Pasek zadań Windows potrafi wskoczyć NAD listwę
(deterministyczny wyzwalacz: PrtScn → nakładka Wycinania → Alt+Tab; zmierzone sondą z-order, dotyczyło
też v1.2.1). `reassertTopmost()` co 1 s: przy zwinięciu podbija WYŁĄCZNIE listwę (`setAlwaysOnTop`,
bez `setBounds`) + samonaprawa widoczności (`showInactive` + świeży stan). Podbijanie DWÓCH okien w tej
samej sekundzie = widoczne migotanie (zmierzone; to była pierwotna przyczyna odrzucenia reasercji).

**M3 — Własne dymki `data-tip` (zamiast natywnych `title`).** Skrypt startowy przenosi `title=` →
`data-tip` + `aria-label`; CSS `[data-tip]:hover::after` rysuje dymek NAD elementem. Powód: natywne
dymki znikały po chwili / lądowały pod oknem topmost. **W oknie listwy (`body.role-tray`) dymek jest
rysowany WEWNĄTRZ paska obok przycisku** (w prawo dla ⏭/✓ przy lewej krawędzi, w lewo dla ▶/▴/✕),
bo okno ma dokładnie wysokość paska zadań i dymek nad przyciskiem byłby poza obrysem = ucięty.
Nowe przyciski z podpowiedzią: wystarczy `title=` w HTML — konwersja jest automatyczna.

**M4 — `shrinkOverlay()` NIE rusza `collapsedMode`.** Akcje z managera/listwy (saveTasks,
startTaskNow, nextTask) przy zwiniętej listwie NIE mogą jej chować (bug „dodaję zadanie → listwa
znika"). Kurtyny rozwijają przez `expandOverlay` — tam zdjęcie zwinięcia jest celowe.

**M5 — Odchudzone broadcasty + gating do ukrytej listwy.** Kanał `state` niesie `leanState()`
(bez listy zadań), lista idzie kanałem `tasks` tylko przy zmianie. Ukryta listwa nie dostaje
broadcastów → KAŻDE pokazanie listwy musi wysłać świeży stan (robi to `syncTray` i samonaprawa
w strażniku), inaczej renderuje nieaktualne dane.

**M6 — Klikalność „na wskroś" = tani hit-test w rendererze.** Renderer utrzymuje listę prostokątów
klikalnych (`clickRects`, margines `HIT_PAD=6`) i woła mouse-enter/leave → main `setIgnoreMouseEvents`.
Bez `elementFromPoint` przy każdym ruchu myszy (koszt CPU).

## 12. Ślepe uliczki — NIE PRÓBOWAĆ PONOWNIE (tylko dopisywać)

- `app.disableHardwareAcceleration()` — zamraża przezroczystą nakładkę.
- Resize/hide/show przezroczystego okna nakładki — pusta warstwa wejściowa do realnego kliknięcia (M1).
- „Programowe szturchnięcie" (software nudge/invalidate) po operacji na oknie — nie leczyło blanku.
- Reasercja topmost DWÓCH okien co 1 s (+`setBounds`) — widoczne migotanie co sekundę.
- Całkowite wyłączenie reasercji — listwa ginie pod paskiem zadań po PrtScn→Alt+Tab i NIE wraca.
- „Rezerwa 200 px" na zasobnik w `trayBounds` — listwa przestaje zasłaniać zegar (wymóg!); cofnięte w v1.3.1.
- Powiększenie okna listwy, żeby zmieścić dymki nad przyciskami — okno musiałoby być przezroczyste
  (wraca problem M1/M2) albo pokazywać czarny pas nad paskiem zadań; zamiast tego dymki wewnątrz (M3).
- `pyautogui`/podobne do testów UI — niepotrzebne: CDP (`dev-tools/cdp-probe.js`, `tooltip-shot.js`)
  + sonda Win32 (`dev-tools/probe.ps1`) dają pomiar bez ruszania fizycznej myszy.
- Onboarding: `onboardingEveryStart` w `S.settings` — odrzucone. Autozapis Managera (`saveTasks` →
  `sanitizeSettings` na danych BEZ tego pola) zerowałby flagę przy każdej edycji zadań; trzymamy ją
  jako osobne pole `S` (jak `termsVersion`), dopisane do `snapshot()`.
- Onboarding: samouczek „przy każdym starcie" domyślnie ON — odrzucone jako antywzorzec (przeszkoda
  między „odpaliłem" a „pracuję", wbrew filozofii „start zwinięty = nie przeszkadzać"). Domyślnie OFF.
- Manager: `body{overflow-y:auto}` BEZ `overflow-x:hidden` → dymki (data-tip) przy prawej krawędzi wystają
  poza okno, a że `overflow-y != visible` wymusza `overflow-x=auto` (reguła CSS), wskakuje poziomy pasek →
  reflow → MIGANIE przy hoverze na przyciski konfiguracji (zgłoszone 2026-07-04, potwierdzone pomiarem:
  6 dymków wystaje, „Dodaj i zacznij teraz" +74 px, Autostart +12 px). Fix: `body{overflow-x:hidden}`
  (manager.html) — zabija scrollbar u źródła. Trade-off: najdłuższe dymki przy prawej krawędzi są teraz
  PRZYCINANE zamiast migać. Pełne rozwiązanie (wyrównanie dymka do prawej krawędzi elementu — `right:0`,
  rośnie w lewo — dla elementów w prawej strefie) ODŁOŻONE do v1.3.3. NIE cofać overflow-x:hidden bez zamiennika.

## 13. Build i wydanie (skrót — pełny proces: `C:\ClaudeSANDDBOX\RELEASE_PLAYBOOK_MojePomodoro.md`)

- `npm run build:win` → `release\MojePomodoro_Setup_v{wersja}.exe`; `build.files` to BIAŁA LISTA —
  każdy nowy plik ładowany przez aplikację musi być dopisany (nauczka: help.html w v1.3.0;
  v1.3.2 dodało `onboarding.html` + katalog `assets/onboarding/` ze zrzutami slajdów).
- `productName` = „Pomodoro Overlay" (stąd nazwa procesu i folderu userData `pomodoro-overlay`).
- Wydanie ZAWSZE drogą A: tag `v*` → CI buduje asset + `SHA256SUMS.txt` + provenance → VirusTotal na
  assecie z CI (brzmienie zawsze miękkie, nigdy „0/68 czysto") → landing `docs/` z realnym SHA.
- NIC na GitHub (commit/push/tag/release) bez wyraźnego „OK" Mariusza.
- Dokumentacja synchronizowana z każdą zmianą UI: help.html + INSTRUKCJA.md + CHANGELOG.md + TEN REJESTR.
