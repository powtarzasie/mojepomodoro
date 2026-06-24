KATALOG: build  (zasoby do BUDOWANIA aplikacji)
=================================================

Tu trzymamy wszystko, co jest potrzebne do zbudowania aplikacji oraz do
ewentualnej dalszej rozbudowy projektu:

  - icon.ico  -> ikona aplikacji i instalatora (pomidor)
  - icon.png  -> ikona w formacie PNG

To jest "warsztat" - pliki stąd NIE trafiają bezpośrednio do uzytkownika.
Gotowe instalatory do udostepnienia powstaja w katalogu:  ..\release\

Konfiguracja budowania znajduje sie w package.json (sekcja "build").
Budowanie uruchamiasz przez build-installer.bat albo:  npm run build:win
