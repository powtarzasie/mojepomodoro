# Historia zmian — Pomodoro Overlay / MojePomodoro

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
