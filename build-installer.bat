@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ===================================================
echo   Pomodoro Overlay — budowanie instalatora Windows
echo  ===================================================
echo.

:: Sprawdź Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [BLAD] Node.js nie jest zainstalowany^^!
    echo  Pobierz ze strony: https://nodejs.org  ^(wersja LTS^)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  Node.js %NODE_VER% — OK
echo.

:: Krok 1: Instalacja zaleznosci
echo  [1/3]  Instalowanie zaleznosci ^(pierwsze uruchomienie pobiera ~200MB^)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  [BLAD] npm install nie powiodl sie.
    echo  Sprawdz polaczenie z internetem i sprobuj ponownie.
    pause
    exit /b 1
)
echo  Zaleznosci — OK
echo.

:: Krok 2: Budowanie instalatora
echo  [2/3]  Budowanie instalatora .exe ...
call npm run build:win
if %errorlevel% neq 0 (
    echo.
    echo  [BLAD] Budowanie nie powiodlo sie.
    pause
    exit /b 1
)
echo  Budowanie — OK
echo.

:: Krok 3: Gotowe
echo  [3/3]  Gotowe^^!
echo.
echo  Instalator znajduje sie w folderze:
echo.
echo    %~dp0release\
echo.
echo  Plik: "Pomodoro Overlay Setup 1.1.0.exe"
echo.

if exist "%~dp0release" (
    start explorer "%~dp0release"
)

pause
