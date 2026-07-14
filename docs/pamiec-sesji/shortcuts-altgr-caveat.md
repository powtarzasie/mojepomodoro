---
name: shortcuts-altgr-caveat
description: Globalne skróty Pomodoro Overlay i pułapka AltGr=Ctrl+Alt na Windows (polski układ)
metadata: 
  node_type: memory
  type: project
  originSessionId: 9563c4e8-d083-4bc5-bb55-75c206f1d0be
---

Na Windows **AltGr = lewy Ctrl + Alt**, więc każdy globalny skrót `CommandOrControl+Alt+<litera>` jest wyzwalany także przez **AltGr+<litera>**. Na polskim układzie (programisty) AltGr+litera tworzy diakrytyki: ą=a, ć=c, ę=e, ł=l, ń=n, ó=o, ś=s, ź=x, ż=z. Dlatego skróty na tych literach **kradną pisanie** tych znaków.

Pierwotnie było `Ctrl+Alt+S` (ś!) i `Ctrl+Alt+C` (ć!) — błąd. Naprawiono 2026-06-11. Aktualny zestaw (main.js, w `app.whenReady`, tablica `SHORTCUTS`, z `console.warn` gdy skrót zajęty):
- `Ctrl+Alt+P` → toggle (start/pauza) — P wolne
- `Ctrl+Alt+K` → skipPhase (pomiń fazę) — zamiast S
- `Ctrl+Alt+M` → toggleCollapse (zwiń/rozwiń, użytkownik chce AltGr+M) — zamiast C

**Reguła na przyszłość:** dobierając globalne skróty z Ctrl+Alt, używaj liter SPOZA zbioru {a,c,e,l,n,o,s,x,z}; bezpieczne: b,d,f,g,h,i,j,k,m,p,q,r,t,u,v,w,y. Opis skrótów jest też w pomocy w `manager.html`.

Osobno: w trybie zwiniętym (pasek `#taskbar-view` w `overlay.html`, pokazywany gdy `S.collapsedMode`) dodano przycisk `✕` (`id="tb-quit"` → `api.cmd('quit')`) — wcześniej nie było jak zamknąć apki po zwinięciu. Powiązane: [[tasklog-and-import-plan]].
