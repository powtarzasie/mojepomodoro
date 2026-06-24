# 🍅 Pomodoro Overlay — Instrukcja obsługi

Mały licznik czasu (nakładka), który zawsze jest na wierzchu innych okien i pomaga
pracować **metodą Pomodoro**: bloki skupionej pracy przeplatane krótkimi przerwami.

> Tę samą instrukcję znajdziesz w programie — w oknie **Manager** kliknij przycisk
> **❓ Jak to działa**.

---

## Spis treści

1. [Instalacja i pierwsze uruchomienie](#1-instalacja-i-pierwsze-uruchomienie)
2. [Widżet — co widzisz w rogu ekranu](#2-widżet--co-widzisz-w-rogu-ekranu)
3. [Sterowanie myszą (ważne!)](#3-sterowanie-myszą-ważne)
4. [Tryby pełnoekranowe (przerwa / praca)](#4-tryby-pełnoekranowe)
5. [Mini-pasek](#5-mini-pasek)
6. [Okno Manager — zadania i ustawienia](#6-okno-manager--zadania-i-ustawienia)
7. [Import i eksport zadań (CSV)](#7-import-i-eksport-zadań-csv)
8. [Historia · plan vs. fakt (log CSV)](#8-historia--plan-vs-fakt-log-csv)
9. [Skróty klawiszowe](#9-skróty-klawiszowe)
10. [Gdzie zapisują się dane](#10-gdzie-zapisują-się-dane)
11. [Najczęstsze pytania](#11-najczęstsze-pytania)
12. [Licencja](#12-licencja)

---

## 1. Instalacja i pierwsze uruchomienie

### Czego potrzebujesz — niczego dodatkowego

Do działania programu wystarczy **standardowy Windows 10 lub 11 (64-bit)**.
Nie trzeba instalować żadnych dodatków: ani Node.js, ani .NET, ani Javy, ani
żadnych bibliotek — instalator zawiera w sobie wszystko, czego aplikacja potrzebuje.
Nie są też wymagane **uprawnienia administratora** — program instaluje się
w profilu użytkownika, więc zadziała także np. na komputerze firmowym.

### Dwa ostrzeżenia, które możesz zobaczyć (to normalne)

To nie są dodatkowe instalacje — tylko jednorazowe kliknięcia:

1. **Filtr SmartScreen.** Instalator nie jest podpisany płatnym certyfikatem
   (podpis kodu to koszt rzędu kilkuset złotych rocznie), więc przy pierwszym
   uruchomieniu Windows może pokazać niebieskie okno
   **„System Windows ochronił ten komputer"**. To standardowe ostrzeżenie przy
   darmowych programach od niezależnych autorów — nie oznacza wirusa.
   Aby kontynuować, kliknij **„Więcej informacji"**, a następnie
   **„Uruchom mimo to"**.
2. **Antywirus.** Z tego samego powodu (brak podpisu) niektóre programy
   antywirusowe mogą zapytać o zgodę na uruchomienie instalatora — wystarczy
   ją wyrazić / dodać program do zaufanych.

### Pierwsze uruchomienie

Po instalacji uruchom **Pomodoro Overlay** (skrót na pulpicie lub w menu Start).

Przy **pierwszym** uruchomieniu pojawi się jednorazowy ekran **„Warunki korzystania"**
(licencja MIT, brak gwarancji, informacja o danych) — zaznacz „Przeczytałem i akceptuję"
i kliknij **„Akceptuję i kontynuuję"**. Bez akceptacji aplikacja się nie uruchomi;
ekran nie pojawi się ponownie (chyba że warunki się zmienią).

Po akceptacji w rogu ekranu pojawi się półprzezroczysty widżet z licznikiem. To wszystko, czego
potrzebujesz, by zacząć — kliknij **▶**, aby ruszyć z pierwszą sesją pracy.

Bez listy zadań program działa jak zwykły licznik Pomodoro. Gdy dodasz zadania
(patrz [okno Manager](#6-okno-manager--zadania-i-ustawienia)), licznik poprowadzi
Cię przez nie po kolei.

---

## 2. Widżet — co widzisz w rogu ekranu

### Ikony w nagłówku

| Ikona | Działanie |
|-------|-----------|
| ⚙ | Otwiera okno **Manager** (zadania i ustawienia) |
| S / M / L | Rozmiar widżetu — klikaj, by przełączać mały / średni / duży |
| ◐ | Suwak przezroczystości widżetu |
| ▾ | Zwija widżet do wąskiego [mini-paska](#5-mini-pasek) |
| ✕ | Zamyka **całą** aplikację |

### Licznik i przyciski

| Element | Znaczenie |
|---------|-----------|
| Kolorowa plakietka | Faza: **PRACA / PRZERWA / DŁ. PRZERWA**. Kropki = ile sesji pracy zaliczono do następnej długiej przerwy |
| Duża cyfra `25:00` | Czas do końca bieżącej fazy (w ostatniej minucie robi się czerwona) |
| ▶ / ⏸ | Start / pauza licznika |
| ⏭ | Pomiń bieżącą fazę (np. od razu zacznij przerwę albo wróć do pracy) |
| ✓→ | Oznacz zadanie jako ukończone, **bez zatrzymywania** timera — przeskok do następnego zadania |
| ✓ | „Skończyłem to zadanie wcześniej" — pojawia się wybór **☕ Przerwa** albo **▶ Następne** |

Pasek na dole widżetu pokazuje, ile minut już poświęciłeś na bieżące zadanie
względem planu.

---

## 3. Sterowanie myszą (ważne!)

- 🖱 **Widżet przepuszcza kliknięcia**, dopóki nie najedziesz na niego myszą — dzięki
  temu nie zasłania tego, co jest pod nim. **Najedź kursorem**, aby przyciski stały
  się klikalne.
- ✥ Aby **przesunąć** widżet — złap go i przeciągnij (poza przyciskami). Pozycja
  zapisuje się automatycznie.

---

## 4. Tryby pełnoekranowe

- ☕ **Przerwa** — gdy zaczyna się przerwa, widżet rozwija się na cały ekran z dużym
  licznikiem (przypomnienie, by odpocząć). Tło nadal przepuszcza kliknięcia —
  możesz korzystać z pulpitu; klikalne są tylko **„Pomiń przerwę"** i **„Zmniejsz"**.
- 🍅 **Powrót do pracy** — po przerwie pokazuje się ekran „PRACA". Kliknij
  **„Zaczynam!"** lub **„Zmniejsz"**, aby wrócić do małego widżetu.

---

## 5. Mini-pasek

Po kliknięciu **▾** widżet zwija się do wąskiego paska tuż nad paskiem zadań.
Zawiera: emoji fazy, nazwę zadania, czas, **⏭** pomiń, **✓→** ukończ, start/pauzę,
**▴** (rozwiń z powrotem) oraz **✕** (zamknij aplikację).

---

## 6. Okno Manager — zadania i ustawienia

Otwierasz je ikoną **⚙** na widżecie. Karta na górze pokazuje **na żywo**, co dzieje
się w liczniku.

| Element | Działanie |
|---------|-----------|
| **+ Dodaj zadanie** | Wpisz nazwę i czas w minutach |
| ⠿ (uchwyt) | Przeciągnij, aby zmienić kolejność zadań |
| ✕ | Usuwa dane zadanie z listy |
| ⏱ **Pomodoro** | Długość pracy, krótkiej i długiej przerwy oraz co ile sesji wypada długa przerwa |
| ⏻ **Autostart z Windows** | Uruchamia aplikację po starcie systemu. Timer **nie rusza sam** — po starcie czeka w pauzie na pierwszym niedokończonym zadaniu, aż klikniesz **▶** |
| 💾 **Zapisz i zastosuj** | Zapisuje zmiany. Sama zmiana nazw nie kasuje bieżącego postępu; zmiana liczby lub kolejności zadań startuje plan od nowa |
| 🔄 **Resetuj timer** | Wraca do pierwszego zadania i zeruje postęp |

---

## 7. Import i eksport zadań (CSV)

### Import

Przycisk **📥 Importuj CSV** wczytuje listę zadań z pliku **.csv**, **.tsv** lub **.txt**
(np. wyeksportowanego z Excela, Arkuszy Google, Todoist itp. → „Zapisz jako CSV").

- Program **sam rozpoznaje kolumny**:
  - **nazwę** zadania szuka w kolumnie typu *nazwa / zadanie / task / name / title / todo*,
  - **czas** w kolumnie typu *minuty / min / czas / time / duration / estimate*.
- Jeśli plik **nie ma nagłówków**, brana jest **1. kolumna jako nazwa**, a **2. jako minuty**.
- Gdy minut brak — zadanie dostaje domyślne **25 min** (dozwolony zakres 1–480).
- Zaimportowane zadania **dopisują się** do listy (niczego nie kasują). To dopiero
  podgląd — możesz je poprawić, a następnie kliknij **💾 Zapisz i zastosuj**.

**Przykładowy plik CSV:**

```csv
nazwa;minuty
Przygotować ofertę;45
Odpowiedzieć na maile;25
Przegląd kodu;30
```

### Eksport

Przycisk **📤 Eksportuj CSV** zapisuje bieżącą listę zadań (łącznie z niezapisanymi
zmianami widocznymi na liście) do wybranego pliku **.csv** w formacie `nazwa;minuty` —
dokładnie takim, jaki rozumie import. Dzięki temu możesz:

- zrobić **kopię zapasową** planu dnia,
- **przenieść zadania na inny komputer** (eksport → import),
- otworzyć i edytować listę w **Excelu** (plik ma BOM i średniki — polski Excel
  otwiera go poprawnie od razu).

---

## 8. Historia · plan vs. fakt (log CSV)

Każde zadanie oznaczone jako **ukończone** lub **pominięte** zapisuje się
automatycznie do pliku **`pomodoro-log.csv`** w folderze
**`Dokumenty\PomodoroOverlay`**.

Tabela **„Historia"** w oknie Manager pokazuje:

| Kolumna | Znaczenie |
|---------|-----------|
| Data | Kiedy zadanie zostało zamknięte |
| Nazwa | Nazwa zadania |
| Plan | Ile minut założyłeś |
| Fakt | Ile realnie zajęło |
| Różnica | +/− względem planu |
| Status | Ukończone / pominięte |

Dzięki temu widzisz, jak Twoje szacunki mają się do rzeczywistości.

- **🔄 Odśwież** — wczytuje historię z pliku na nowo.
- **📂 Folder logów** — otwiera folder z plikiem CSV. Plik możesz otworzyć w Excelu
  i analizować dalej.

---

## 9. Skróty klawiszowe

Działają **w całym systemie** (nawet gdy okno aplikacji nie jest aktywne):

| Skrót | Działanie |
|-------|-----------|
| `Ctrl+Alt+P` | Start / pauza |
| `Ctrl+Alt+K` | Pomiń bieżącą fazę |
| `Ctrl+Alt+M` | Zwiń / rozwiń widżet (działa też prawy `AltGr+M`) |

> Jeśli inny program zajmuje już dany skrót, może on u nas nie zadziałać — to
> normalne ograniczenie systemu Windows.

---

## 10. Gdzie zapisują się dane

| Co | Gdzie |
|----|-------|
| Zadania i ustawienia | `%APPDATA%\pomodoro-overlay\` |
| Historia (log plan vs. fakt) | `Dokumenty\PomodoroOverlay\pomodoro-log.csv` |

Dane zostają na komputerze nawet po odinstalowaniu programu (instalator ich nie
kasuje).

---

## 11. Najczęstsze pytania

**Windows ostrzega przy instalacji („System Windows ochronił ten komputer").**
To filtr SmartScreen reagujący na brak płatnego podpisu cyfrowego — nie oznacza
wirusa. Kliknij „Więcej informacji" → „Uruchom mimo to". Szczegóły w
[rozdziale 1](#1-instalacja-i-pierwsze-uruchomienie).

**Czy muszę coś doinstalować, żeby program działał?**
Nie. Wystarczy standardowy Windows 10/11 — instalator zawiera wszystko w sobie
(nie potrzeba Node.js, .NET ani uprawnień administratora).

**Widżet zasłania mi pracę.**
Zwiń go (**▾**), zmniejsz przezroczystość (**◐**) albo przeciągnij w inny róg ekranu.

**Nie mogę kliknąć przycisków na widżecie.**
Najedź na niego myszą — dopóki kursor jest poza widżetem, przepuszcza on kliknięcia
celowo (żeby nie przeszkadzać).

**Jak zamknąć całą aplikację?**
Przycisk **✕** w nagłówku widżetu lub na mini-pasku.

**Skrót klawiszowy nie działa.**
Prawdopodobnie zajął go inny program. Spróbuj zamknąć aplikację, która może używać
tej samej kombinacji.

---

## 12. Licencja

Pomodoro Overlay jest udostępniany na licencji **MIT** — możesz go bez opłat używać
prywatnie i komercyjnie, kopiować, modyfikować oraz przekazywać dalej. Jedyny
warunek: w kopiach należy zachować informację o autorze i treść licencji. Program
jest dostarczany „tak jak jest", bez gwarancji.

© 2026 **Mariusz Świerguła** <Mariusz.swiergula@gmail.com>

Pełna treść licencji znajduje się w pliku [`LICENSE`](LICENSE). Aplikacja korzysta
z bibliotek open source **Electron** i **electron-builder** (obie na licencji MIT) —
pełna lista komponentów i atrybucji: [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).

„Pomodoro Technique®" i „Pomodoro®" są znakami towarowymi Francesco Cirillo.
Aplikacja nie jest z nim powiązana ani przez niego sponsorowana — nazwa użyta
wyłącznie opisowo, jako odniesienie do metody pracy.
