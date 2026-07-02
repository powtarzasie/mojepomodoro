# Historia zmian — Pomodoro Overlay / MojePomodoro

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
