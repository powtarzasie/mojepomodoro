# Historia zmian — Pomodoro Overlay / MojePomodoro

## v1.3.2 — 2026-07-04

### Nowe funkcje
- **Samouczek pierwszego uruchomienia.** Po instalacji (oraz raz po tej aktualizacji) pojawia się
  krótkie wprowadzenie w 6 krokach: mini-listwa na miejscu zegara, klikanie „na wskroś", zadania
  i budżet czasu, przerwy i ekran PRACA, tryb skupienia oraz ściąga skrótów. Ekrany pokazują
  prawdziwe zrzuty aplikacji. Samouczek można w każdej chwili odpalić ponownie z Managera przyciskiem
  **🎓 Samouczek**, a na ostatnim slajdzie włączyć opcję „Pokazuj przy każdym starcie" (domyślnie
  wyłączoną). Samouczek jest opcjonalny — można go pominąć, a zamknięcie okna nie blokuje startu aplikacji.

---

## v1.3.1 — 2026-07-03

### Zmienione
- **Start w trybie zwiniętym.** Aplikacja uruchamia się od razu jako mini-listwa nad paskiem zadań
  (zasłania zegar) — bez rozwiniętego widgetu na środku ekranu. Rozwinięcie: `AltGr+M` lub przycisk ▴.
- **⏭/✓ na mini-listwie przeniesione na lewą stronę nazwy zadania** — spójnie z widżetem,
  gdzie ✗/✓ też stoją przed nazwą. Po prawej zostają start/pauza, ▴ (rozwiń) i ✕ (zamknij).

### Naprawione
- **Pytanie „Czas minął — ukończone?" nie ginie już przy zwiniętej listwie ani pod ekranem PRACA.**
  Panel z wyborami (☕ Przerwa / ▶ Następne / ↻ Jeszcze pracuję) istnieje tylko w widżecie — gdy blok
  pracy kończy się przy zwiniętej listwie, widżet rozwija się teraz automatycznie, żeby zadać pytanie;
  a jeśli pulsujący ekran PRACA nie został zamknięty przez cały blok, jest chowany, żeby nie zasłonić
  panelu. Z powrotem zwijasz widżet przyciskiem ▾ albo `AltGr+M`.
- **Dymki podpowiedzi na mini-listwie nie są już ucinane.** Okno listwy ma dokładnie wysokość
  paska zadań, a dymek rysował się nad przyciskiem — czyli poza obrysem okna, więc nie było go
  widać. Teraz dymek pojawia się wewnątrz listwy, obok przycisku.
- **„✓ Ukończ zadanie" na mini-listwie dostępny zawsze, gdy jest aktywne zadanie** — także podczas
  przerwy i pauzy (wcześniej tylko w fazie pracy). Ukończenie w przerwie nie przerywa odpoczynku:
  przerwa biegnie dalej, a po niej ekran PRACA pokazuje już następne zadanie.
- **Edycja zadań przy zwiniętej listwie nie chowa już listwy.** Autozapis Managera rozwijał nakładkę
  bez pytania — teraz tryb zwinięty jest zachowywany (kurtyny przerwy/pracy nadal rozwijają celowo).
- **Ponownie pokazana listwa od razu dostaje świeży stan.** Ukryta listwa nie odbiera aktualizacji,
  więc po pokazaniu mogła przez moment wyświetlać nieaktualną fazę lub czas.
- **Zwinięta listwa znów zasłania zegar.** W v1.3.0 mini-listwa siadała obok zegara zamiast na nim
  (regresja z „rezerwy" na zasobnik) — przywrócono pierwotne zachowanie: listwa nachodzi na zegar
  przy prawej krawędzi.
- **Zwinięta listwa nie znika już pod paskiem zadań — i nie migocze.** Pasek zadań Windows potrafi
  wskoczyć ponad listwę (np. po zrzucie ekranu i Alt+Tab) i listwa ginęła pod nim na stałe — dotyczyło
  to także wcześniejszych wersji, w tym v1.2.1. Teraz przy zwinięciu strażnik „zawsze na wierzchu"
  utrzymuje samą listwę (zamiast pustej, przezroczystej nakładki), więc listwa wraca najpóźniej po
  sekundzie. Wcześniejsze migotanie brało się z podbijania dwóch okien naraz — to usunięte: podbijane
  jest jedno, nieprzezroczyste okno, bez zmiany rozmiaru, co nie powoduje przemalowań.

---

## v1.3.0 — 2026-07-02

### Nowe funkcje
- **Tryb skupienia (pełny ekran).** Czarny ekran z nazwą bieżącego zadania i minutnikiem w rogu —
  wchodzisz przyciskiem lub skrótem `AltGr+F`, wychodzisz `Esc`. Pomaga odciąć rozpraszacze.
- **Panel „Czas minął — ukończone?".** Gdy blok pracy z aktywnym zadaniem dobiega końca, aplikacja
  nie przeskakuje od razu do przerwy, tylko pyta: wziąć przerwę, przejść do następnego, czy pracować dalej.
- **„Zacznij teraz".** Dowolne zadanie z kolejki można natychmiast ustawić jako bieżące (z pytaniem,
  co zrobić z przerwanym: wrócić do kolejki czy pominąć).
- **Żywa kolejka „Plan dnia" + ETA.** Manager pokazuje pasek postępu bieżącego zadania, szacowany czas
  do startu każdego kolejnego i przybliżoną godzinę końca dnia.
- **„Cofnij" (undo).** Dodanie lub usunięcie zadania można wycofać jednym kliknięciem.
- **Osobne okno „Jak to działa".** Instrukcję można teraz trzymać obok panelu (dołączona do instalatora).

### Stabilność i wydajność
- **Płynniejsza nakładka.** Klikalność „na wskroś" liczona jest teraz tanim testem geometrycznym zamiast
  kosztownego sprawdzania przy każdym ruchu myszy po całym ekranie — mniejsze zużycie procesora.
- **Lista zadań nie „wskrzesza".** Jeśli timer ukończył zadanie w trakcie edycji listy w managerze,
  ukończone zadanie nie wraca już do kolejki.
- **Spójne ukończenie zadania.** Oznaczenie zadania jako ukończone w listwie dokładnie w chwili końca
  bloku nie zaburza już zapisu w historii.
- **Tryb skupienia bez „ślepego" ekranu.** Zamknięcie okna skupienia (np. Alt+F4) przywraca nakładkę
  zamiast zostawiać pusty ekran.
- **Ustępowanie oknom systemowym.** Nakładka i tryb skupienia nie zasłaniają już Menedżera zadań ani
  monitów systemowych; zwinięta listwa nie zakrywa zegara ani zasobnika Windows.

### UX
- **Sygnał dźwiękowy** także w momencie „czas minął — ukończone?" (wcześniej ta chwila była cicha).
- **Nowe skróty klawiszowe:** `AltGr+D` — ukończ bieżące zadanie, `AltGr+T` — otwórz managera;
  w trybie skupienia `Enter`/`Spacja` = start/pauza.
- Poprawki po zmianie rozdzielczości ekranu, bezpieczniejsze zamykanie aplikacji, limit długości nazwy zadania.

---

## v1.2.1 — 2026-06-24

Wydanie procesowe — **bez zmian funkcjonalnych** (kod aplikacji identyczny jak w 1.2.0).
- Kod źródłowy opublikowany w repozytorium; wydanie budowane automatycznie w **GitHub Actions** z otagowanego kodu.
- Do instalatora dołączane: suma kontrolna **SHA-256** (`SHA256SUMS.txt`) oraz **attestacja provenance** (`gh attestation verify`).
- Ujednolicona nazwa instalatora: `MojePomodoro_Setup_v1.2.1.exe`.

---

## v1.2.0 — 2026-06-17

### Naprawione
- **Migotanie ekranu przy zmianie praca ↔ przerwa.** Pełnoekranowa kurtyna potrafiła
  mignąć na ułamek sekundy, zniknąć (było widać pulpit) i wrócić dopiero po kliknięciu.
  Przyczyną było skalowanie/chowanie przezroczystego okna nakładki na Windows. Mechanizm
  nakładki przebudowano: jedno stałe okno na cały ekran, w którym tryby (widget, kurtyna
  przerwy/pracy) przełączane są tylko zmianą treści — okno nigdy nie zmienia rozmiaru ani
  się nie chowa, więc nie ma czego nie odrysować. Migotanie zniknęło u źródła.

### Poprawione
- **Zwinięta listwa znów nachodzi na pasek zadań (zegar).** Dostała własne, dedykowane,
  nieprzezroczyste okno ustawione dokładnie na pasku — bez migotania przy zwijaniu/rozwijaniu.
- **Przeciąganie widgetu i klikalność pulpitu.** Widget przeciąga się płynnie, a gdy wisi
  w rogu, pulpit pod spodem pozostaje w pełni klikalny.

### Pod maską
- Akceleracja sprzętowa pozostaje włączona (jej wyłączenie zamrażało przezroczystą nakładkę).

---

## v1.1.0 — 2026-06-16
- Ekran akceptacji warunków przy pierwszym uruchomieniu.
- Eksport listy zadań do CSV (zgodny z importem).
- Log „plan vs. fakt" do `Dokumenty\PomodoroOverlay\pomodoro-log.csv`.
- Autostart z Windows; trzecie firm licencje w `THIRD_PARTY_LICENSES.md`.
