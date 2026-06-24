# 🍅 MojePomodoro

Darmowy timer **Pomodoro** dla Windows 10/11 — zawsze widoczny nad oknami,
półprzezroczysty, z listą zadań, budżetem czasu, importem/eksportem CSV i
rejestrem „plan vs. fakt". Aplikacja desktopowa (Electron), open source na licencji **MIT**.

**Autor:** Mariusz Świerguła — [mariusz.swiergula@gmail.com](mailto:mariusz.swiergula@gmail.com)
· 🔗 Strona: <https://powtarzasie.github.io/mojepomodoro/>

To repozytorium zawiera **kod źródłowy** aplikacji oraz stronę pobierania (`docs/`).
Gotowy instalator publikowany jest jako **asset w [Releases](https://github.com/powtarzasie/mojepomodoro/releases/latest)** — nigdy nie jest trzymany w drzewie repo.

---

## ⬇️ Pobranie (dla użytkownika)

1. Wejdź na [najnowsze wydanie (Releases)](https://github.com/powtarzasie/mojepomodoro/releases/latest)
   lub na [stronę pobierania](https://powtarzasie.github.io/mojepomodoro/).
2. Pobierz `MojePomodoro_Setup_vX.Y.Z.exe`.
3. Uruchom instalator. Wymaga zwykłego Windows 10/11 (64-bit) — **nie** trzeba dograć
   Node.js ani mieć uprawnień administratora.

> **Ostrzeżenie SmartScreen.** Instalator nie jest podpisany płatnym certyfikatem,
> więc Windows może pokazać „System Windows ochronił ten komputer". To normalne dla
> niepodpisanego pliku — kliknij **„Więcej informacji" → „Uruchom mimo to"**. Żaden
> darmowy krok nie zdejmuje tego ostrzeżenia; zamiast tego dajemy Ci możliwość
> **samodzielnej weryfikacji** pliku (poniżej). Instalujesz na własną odpowiedzialność.

---

## 🔒 Prywatność — zweryfikowana w kodzie, nie tylko deklarowana

Aplikacja działa **w pełni lokalnie i offline**: bez kont, bez telemetrii, bez
automatycznych aktualizacji. Nie wysyła ani nie pobiera żadnych danych.

To nie jest tylko obietnica — możesz to sprawdzić sam:
w [`main.js`](main.js), [`preload.js`](preload.js) oraz w plikach interfejsu
([`overlay.html`](overlay.html), [`manager.html`](manager.html), [`terms.html`](terms.html))
**nie ma** `fetch`, `http`/`https`, `net`, `XMLHttpRequest`, `autoUpdater` ani żadnej
biblioteki sieciowej/analitycznej. Aplikacja korzysta wyłącznie z lokalnych plików
(`fs`) i API Electrona. Lista zależności runtime jest pusta (`"dependencies": {}`).

Dane zapisywane są lokalnie:
- ustawienia i stan: `%APPDATA%\pomodoro-overlay\pomodoro.json`
- log „plan vs. fakt": `Dokumenty\PomodoroOverlay\pomodoro-log.csv`

---

## 🛡️ Zaufanie i weryfikowalność wydania

Każde wydanie jest **budowane automatycznie w GitHub Actions z otagowanego kodu**
([workflow](.github/workflows/release.yml)) — nie wgrywam plików budowanych „ręcznie u siebie".
Do każdego instalatora dołączane są:

- **`SHA256SUMS.txt`** — suma kontrolna SHA-256. Po pobraniu sprawdź zgodność:
  ```powershell
  Get-FileHash .\MojePomodoro_Setup_vX.Y.Z.exe -Algorithm SHA256
  ```
  Wynik musi być identyczny z wartością w `SHA256SUMS.txt` przy wydaniu.

- **Build Provenance Attestation** — kryptograficzny dowód, że ten konkretny plik
  powstał z tego kodu, w tym workflow. Weryfikacja (wymaga [GitHub CLI](https://cli.github.com/)):
  ```powershell
  gh attestation verify .\MojePomodoro_Setup_vX.Y.Z.exe --repo powtarzasie/mojepomodoro
  ```

- **VirusTotal** — link do skanu podawany przy wydaniu/na stronie. Uwaga: spakowane
  instalatory Electron/NSIS bywają oznaczane **fałszywym alarmem** przez część
  silników — w razie wątpliwości porównaj SHA-256 i sprawdź log builda w Actions.

> Standard ten czyni plik **weryfikowalnym**, a nie *bez-ostrzeżeniowym*: ostrzeżenie
> SmartScreen zniknie dopiero po podpisie kodu lub publikacji w Microsoft Store.

---

## 🧩 Budowanie ze źródła

Wymaga **Node.js LTS** (<https://nodejs.org>).

```powershell
npm install
npm run build:win      # instalator NSIS ląduje w release\
# albo: dwuklik build-installer.bat
```

Uruchomienie bez budowania instalatora:

```powershell
npm install
npm start
```

Pełna instrukcja użytkownika: [INSTRUKCJA.md](INSTRUKCJA.md).

---

## 📁 Struktura repo

| Ścieżka | Rola |
|---------|------|
| `main.js`, `preload.js` | proces główny Electrona + bezpieczny most (bez sieci) |
| `overlay.html`, `manager.html`, `terms.html` | interfejs (nakładka, menedżer zadań, ekran warunków) |
| `package.json` | konfiguracja aplikacji i builda (electron-builder / NSIS) |
| `build/`, `assets/` | ikony i zasoby do budowania |
| `.github/workflows/release.yml` | CI: build + SHA-256 + provenance + Release |
| `docs/` | strona pobierania (GitHub Pages) |
| `INSTRUKCJA.md`, `CHANGELOG.md` | instrukcja użytkownika i historia zmian |
| `LICENSE`, `THIRD_PARTY_LICENSES.md` | licencja MIT i atrybucja komponentów |

Instalator `.exe` oraz `node_modules/`/`release/` **nie** są trzymane w repo (patrz `.gitignore`).

---

## 📜 Licencja

MIT — © 2026 Mariusz Świerguła. Pełna treść w [`LICENSE`](LICENSE);
atrybucja komponentów zewnętrznych w [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).
Wolne do użytku prywatnego, komercyjnego, modyfikacji i dystrybucji.

> „Pomodoro®" i „Pomodoro Technique®" to znaki towarowe Francesco Cirillo.
> Aplikacja nie jest z nim powiązana — nazwa użyta wyłącznie opisowo.
