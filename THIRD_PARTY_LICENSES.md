# Licencje komponentów zewnętrznych (NOTICE)

**Pomodoro Overlay** — © 2026 Mariusz Świerguła, licencja MIT (plik [`LICENSE`](LICENSE)).

Aplikacja nie zawiera żadnych bibliotek uruchomieniowych firm trzecich w kodzie
własnym (`dependencies: {}`). Do użytkownika trafia wyłącznie kod aplikacji oraz
środowisko Electron, w którym aplikacja działa.

## Komponenty dystrybuowane z aplikacją (w instalatorze)

| Komponent | Wersja | Licencja | Copyleft? | Uwagi |
|-----------|--------|----------|-----------|-------|
| Electron | ^28.0.0 | MIT | nie | środowisko uruchomieniowe aplikacji |
| Chromium (część Electrona) | wbudowany | BSD-3-Clause + licencje komponentów | nie | pełna lista w pliku `LICENSES.chromium.html` dołączanym automatycznie do każdej paczki |
| Node.js (część Electrona) | wbudowany | MIT | nie | nota w `LICENSE.electron.txt` w katalogu instalacji |

electron-builder dołącza pliki `LICENSE.electron.txt` oraz `LICENSES.chromium.html`
do katalogu instalacji automatycznie — należy je tam pozostawić (wymóg atrybucji
licencji BSD/MIT).

## Narzędzia używane tylko do budowania (NIE są dystrybuowane)

| Komponent | Wersja | Licencja | Uwagi |
|-----------|--------|----------|-------|
| electron-builder | ^24.13.3 | MIT | pakowanie do instalatora NSIS; nie trafia do użytkownika |
| NSIS | wbudowany w electron-builder | zlib/libpng | sam instalator; licencja permisywna, dystrybucja instalatorów bez ograniczeń |

## Zasoby

- **Czcionki:** aplikacja używa wyłącznie czcionek systemowych użytkownika
  (Segoe UI, Consolas itp.) — żadna czcionka nie jest dołączana do paczki.
- **Dźwięki:** generowane programowo przez WebAudio API — brak plików audio firm trzecich.
- **Ikona (`build/icon.ico`, `assets/icon.ico`):** grafika wygenerowana na potrzeby
  projektu narzędziem AI (Claude Code) — nie pochodzi z żadnego banku ikon ani
  zasobu objętego licencją osób trzecich; traktowana jako grafika własna projektu.

## Znaki towarowe

„Pomodoro Technique®" i „Pomodoro®" są znakami towarowymi Francesco Cirillo.
Ta aplikacja nie jest powiązana z Francesco Cirillo ani przez niego sponsorowana;
nazwa „Pomodoro" jest użyta wyłącznie opisowo, jako odniesienie do popularnej
metody zarządzania czasem.
