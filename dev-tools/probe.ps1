# Sonda z-order: okna Electron (overlay/tray/manager) vs pasek zadan (Shell_TrayWnd)
# Akcje: snapshot | collapse | expand | monitor -Seconds N -IntervalMs M | disturb
param(
  [string]$Action = 'snapshot',
  [int]$Seconds = 30,
  [int]$IntervalMs = 1000
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class ZP {
  [DllImport("user32.dll")] public static extern IntPtr GetTopWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
}
"@ -ErrorAction SilentlyContinue

function Press-VK([byte]$vk, [int]$holdMs = 60) {
  [ZP]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds $holdMs
  [ZP]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)   # KEYEVENTF_KEYUP
}

$eids = @(Get-Process electron, MojePomodoro, 'Pomodoro Overlay' -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })

function Get-ZOrder {
  $list = New-Object System.Collections.Generic.List[object]
  $h = [ZP]::GetTopWindow([IntPtr]::Zero)
  $i = 0
  while ($h -ne [IntPtr]::Zero) {
    $wpid = [uint32]0
    [void][ZP]::GetWindowThreadProcessId($h, [ref]$wpid)
    $sb = New-Object System.Text.StringBuilder 256
    [void][ZP]::GetClassName($h, $sb, 256); $cls = $sb.ToString()
    $sb2 = New-Object System.Text.StringBuilder 256
    [void][ZP]::GetWindowText($h, $sb2, 256); $title = $sb2.ToString()
    $r = New-Object ZP+RECT
    [void][ZP]::GetWindowRect($h, [ref]$r)
    $ex = [ZP]::GetWindowLong($h, -20)
    $list.Add([PSCustomObject]@{
      Z = $i; H = $h; WPid = $wpid; Class = $cls; Title = $title
      Vis = [ZP]::IsWindowVisible($h)
      Top = (($ex -band 8) -ne 0)
      W = ($r.R - $r.L); Ht = ($r.B - $r.T)
      Rect = "$($r.L),$($r.T)-$($r.R),$($r.B)"
    })
    $h = [ZP]::GetWindow($h, 2)   # GW_HWNDNEXT
    $i++
    if ($i -gt 2000) { break }
  }
  return $list
}

# Klasyfikacja naszych okien: overlay = pelnoekranowe (wys > 900), tray = niskie i szerokie
# przy dolnej krawedzi, manager = tytul z 'Zadania'
function Classify($zl) {
  $mine    = $zl | Where-Object { $eids -contains [int]$_.WPid -and $_.Class -match 'Chrome_WidgetWin' }
  $taskbar = $zl | Where-Object { $_.Class -eq 'Shell_TrayWnd' } | Select-Object -First 1
  $overlay = $mine | Where-Object { $_.Ht -gt 900 -and $_.Title -notmatch 'Zadania|Jak to' } | Select-Object -First 1
  $tray    = $mine | Where-Object { $_.Ht -gt 10 -and $_.Ht -lt 200 -and $_.W -ge 300 } | Select-Object -First 1
  return @{ Mine = $mine; Taskbar = $taskbar; Overlay = $overlay; Tray = $tray }
}

function StatusLine($t) {
  $zl = Get-ZOrder
  $c  = Classify $zl
  $tb = $c.Taskbar; $tr = $c.Tray; $ov = $c.Overlay
  $trZ = if ($tr) { $tr.Z } else { -1 }
  $tbZ = if ($tb) { $tb.Z } else { -1 }
  $ovZ = if ($ov) { $ov.Z } else { -1 }
  $trVis = if ($tr) { $tr.Vis } else { $false }
  $above = ($tr -and $tb -and $tr.Vis -and ($trZ -lt $tbZ))
  "t={0,4}s trayVis={1,-5} trayZ={2,4} taskbarZ={3,4} overlayZ={4,4} trayNADpaskiem={5}" -f $t, $trVis, $trZ, $tbZ, $ovZ, $above
}

switch ($Action) {
  'snapshot' {
    $zl = Get-ZOrder
    $c  = Classify $zl
    Write-Output "=== Nasze okna (Electron) + pasek zadan, w kolejnosci z-order (Z=0 najwyzej) ==="
    ($zl | Where-Object { ($eids -contains [int]$_.WPid -and $_.Class -match 'Chrome_WidgetWin') -or $_.Class -eq 'Shell_TrayWnd' }) |
      Format-Table Z, WPid, Class, Title, Vis, Top, W, Ht, Rect -AutoSize | Out-String -Width 200
    Write-Output "=== Interpretacja ==="
    Write-Output (StatusLine 0)
  }
  'collapse' {
    $ws = New-Object -ComObject WScript.Shell
    $ws.SendKeys('^%m')   # Ctrl+Alt+M = AltGr+M -> toggleCollapse
    Start-Sleep -Milliseconds 700
    Write-Output (StatusLine 0)
  }
  'monitor' {
    $n = [Math]::Max(1, [int]($Seconds * 1000 / $IntervalMs))
    for ($k = 0; $k -le $n; $k++) {
      Write-Output (StatusLine ([int]($k * $IntervalMs / 1000)))
      Start-Sleep -Milliseconds $IntervalMs
    }
  }
  'prtsc' {
    Write-Output "PRZED: $(StatusLine 0)"
    Press-VK 0x2C          # VK_SNAPSHOT
    Start-Sleep -Seconds 1;  Write-Output "PO +1s: $(StatusLine 1)"
    Start-Sleep -Seconds 2;  Write-Output "PO +3s: $(StatusLine 3)"
    Start-Sleep -Seconds 3;  Write-Output "PO +6s: $(StatusLine 6)"
  }
  'alttab' {
    Write-Output "PRZED: $(StatusLine 0)"
    [ZP]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)   # Alt down
    Start-Sleep -Milliseconds 80
    [ZP]::keybd_event(0x09, 0, 0, [UIntPtr]::Zero)   # Tab down
    Start-Sleep -Milliseconds 80
    [ZP]::keybd_event(0x09, 0, 2, [UIntPtr]::Zero)   # Tab up
    Start-Sleep -Milliseconds 200
    [ZP]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)   # Alt up
    Start-Sleep -Seconds 1;  Write-Output "PO +1s: $(StatusLine 1)"
    Start-Sleep -Seconds 2;  Write-Output "PO +3s: $(StatusLine 3)"
    Start-Sleep -Seconds 3;  Write-Output "PO +6s: $(StatusLine 6)"
  }
  'toast' {
    Write-Output "PRZED: $(StatusLine 0)"
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml('<toast duration="short"><visual><binding template="ToastGeneric"><text>Test sondy z-order</text><text>MojePomodoro - diagnoza listwy</text></binding></visual></toast>')
    $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
    $appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
    Start-Sleep -Seconds 1;  Write-Output "PO +1s: $(StatusLine 1)"
    Start-Sleep -Seconds 3;  Write-Output "PO +4s: $(StatusLine 4)"
    Start-Sleep -Seconds 4;  Write-Output "PO +8s: $(StatusLine 8)"
    Start-Sleep -Seconds 4;  Write-Output "PO +12s: $(StatusLine 12)"
  }
  'alttabsnap' {
    Write-Output "PRZED: $(StatusLine 0)"
    [ZP]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 80
    [ZP]::keybd_event(0x09, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 80
    [ZP]::keybd_event(0x09, 0, 2, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 200
    [ZP]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
    Start-Sleep -Seconds 3
    Write-Output "PO +3s: $(StatusLine 3)"
    $zl = Get-ZOrder
    $c  = Classify $zl
    $maxZ = 60
    if ($c.Tray) { $maxZ = [Math]::Max($maxZ, $c.Tray.Z + 3) }
    Write-Output "--- pasmo topmost (Z 0..$maxZ, tylko widoczne lub nasze/pasek) ---"
    ($zl | Where-Object { $_.Z -le $maxZ -and ($_.Vis -or ($eids -contains [int]$_.WPid) -or $_.Class -eq 'Shell_TrayWnd') } |
      ForEach-Object {
        $pn = try { (Get-Process -Id $_.WPid -ErrorAction Stop).ProcessName } catch { '?' }
        "{0,4} pid={1,-6} {2,-22} vis={3,-5} top={4,-5} {5,4}x{6,-4} {7,-28} [{8}]" -f $_.Z, $_.WPid, $pn, $_.Vis, $_.Top, $_.W, $_.Ht, $_.Rect, $_.Title
      })
  }
  'disturb' {
    # Typowe zaburzenie z-order: nowe okno pierwszoplanowe (Notatnik), chwila, zamkniecie
    $p = Start-Process notepad -PassThru
    Start-Sleep -Seconds 3
    Write-Output (StatusLine 3)
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Output (StatusLine 5)
  }
}
