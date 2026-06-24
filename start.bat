@echo off
echo [%date% %time%] BAT uruchomiony > "%~dp0start-log.txt"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
echo [%date% %time%] PS1 zakonczony, kod=%errorlevel% >> "%~dp0start-log.txt"
pause
