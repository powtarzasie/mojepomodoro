Set-Location $PSScriptRoot
$log = Join-Path $PSScriptRoot 'start-log.txt'
"[$(Get-Date)] Start" | Set-Content $log

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    "[BLAD] Node.js nie znaleziony" | Add-Content $log
    $sh = New-Object -ComObject "WScript.Shell"
    $sh.Popup("Node.js nie znaleziony!`n`nPobierz i zainstaluj ze:`nhttps://nodejs.org", 0, "Pomodoro Overlay - Blad", 48)
    exit 1
}

$ver = & node --version
("[OK] Node.js " + $ver + " @ " + $node.Source) | Add-Content $log

if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules\electron'))) {
    "[INFO] npm install" | Add-Content $log
    & npm install 2>&1 | Tee-Object -Append $log
    if ($LASTEXITCODE -ne 0) {
        "[BLAD] npm install fail kod $LASTEXITCODE" | Add-Content $log
        $sh = New-Object -ComObject "WScript.Shell"
        $sh.Popup("Blad instalacji zaleznosci (npm install).`nSzczegoly w pliku:`n" + $log, 0, "Pomodoro Overlay - Blad", 48)
        notepad $log
        exit 1
    }
    "[OK] npm install" | Add-Content $log
}

"[INFO] npm start" | Add-Content $log
& npm start
if ($LASTEXITCODE -ne 0) {
    "[BLAD] npm start kod $LASTEXITCODE" | Add-Content $log
    $sh = New-Object -ComObject "WScript.Shell"
    $sh.Popup("Aplikacja zamknela sie z bledem: " + $LASTEXITCODE + "`nSzczegoly w pliku:`n" + $log, 0, "Pomodoro Overlay - Blad", 48)
    notepad $log
    exit 1
}
