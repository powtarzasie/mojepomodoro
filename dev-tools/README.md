# dev-tools — narzędzia diagnostyczne (nie trafiają do instalatora)

Narzędzia wypracowane podczas audytów stabilności. `build.files` w package.json ich nie
obejmuje, więc nie są pakowane do aplikacji.

## cdp-probe.js — stan renderera przez CDP
Odpytuje wszystkie okna aplikacji (overlay/tray/manager/focus) o stan JS.
```
# aplikacja musi działać z portem debugowania:
npx electron . --remote-debugging-port=9222        # dev
"Pomodoro Overlay.exe" --remote-debugging-port=9222  # packaged

node dev-tools/cdp-probe.js                    # domyślny raport: rola/faza/timer/zadania/widoczność ✓
node dev-tools/cdp-probe.js "api.cmd('toggle')"  # dowolne wyrażenie JS w każdym oknie
```

## tooltip-shot.js — zrzut ekranu okna listwy (tray) z symulowanym hoverem
Najeżdża na przycisk (CDP `Input.dispatchMouseEvent` — wyzwala prawdziwe CSS `:hover`)
i zapisuje PNG całego okna. Służy do weryfikacji dymków i układu bez ruszania fizycznej myszy.
```
node dev-tools/tooltip-shot.js tb-done dymek.png              # hover na ✓ + zrzut
node dev-tools/tooltip-shot.js - uklad.png "api.cmd('toggle')"  # bez hovera, z akcją setup
```

## csv-roundtrip-test.js — testy jednostkowe importu/eksportu CSV
Wycina CZYSTE funkcje parsera z main.js (testuje prawdziwy kod, nie kopię) i sprawdza
round-trip eksport→import: podchwytliwe nazwy (średniki, cudzysłowy, nowe linie),
wykrywanie nagłówka i separatora, przecinek dziesiętny, clampy minut, limit 200 znaków.
```
node dev-tools/csv-roundtrip-test.js   # wypisuje PASS/FAIL, kod wyjścia 0/1
```

## window-shot.js — zrzut ekranu DOWOLNEGO okna aplikacji
Jak tooltip-shot, ale wybiera okno po roli (`overlay`/`tray`/`focus`) lub pliku
(`manager`/`help`/`terms`) i umie przyciąć zrzut do elementu (np. samego widgetu
w pełnoekranowym oknie nakładki).
```
node dev-tools/window-shot.js overlay panel.png widget   # widget (przycięty) z okna nakładki
node dev-tools/window-shot.js manager manager.png        # całe okno managera
```

## probe.ps1 — sonda z-order Win32 (PowerShell + P/Invoke)
Mierzy KOLEJNOŚĆ okien (GetTopWindow/GW_HWNDNEXT), flagi topmost, widoczność i prostokąty —
obiektywny pomiar „listwa nad/pod paskiem zadań" zamiast oceny na oko. Umie też wyzwalać
zdarzenia (PrtScn, Alt+Tab, toast) przez keybd_event/SendKeys.
```
powershell -File dev-tools/probe.ps1 -Action snapshot   # bieżący z-order okien aplikacji i paska zadań
powershell -File dev-tools/probe.ps1 -Action prtsc      # zabójcza sekwencja: PrtScn → Alt+Tab
powershell -File dev-tools/probe.ps1 -Action monitor    # próbkowanie co 300 ms (wykrywanie migotania)
```
Kluczowy wskaźnik w wyniku: `trayNADpaskiem=True` (listwa ponad Shell_TrayWnd).

## Zasady testów
- Przed testami mutującymi stan: backup `%APPDATA%\pomodoro-overlay\pomodoro.json`, po testach przywróć.
- Dev i packaged dzielą userData i blokadę pojedynczej instancji — nie uruchamiaj obu naraz.
- Weryfikuj KAŻDĄ poprawkę w obu wariantach: dev (`npx electron .`) i packaged (`release\win-unpacked\Pomodoro Overlay.exe`).
