# Wcisniecie globalnego skrotu Ctrl+Alt+<litera> przez keybd_event (realna sciezka
# globalShortcut Electrona — nie SendKeys do okna). Uzycie: hotkey-press.ps1 -Letter P
param([Parameter(Mandatory=$true)][string]$Letter)
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class HK { [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra); }
"@ -ErrorAction SilentlyContinue
$vk = [byte][char]$Letter.ToUpper()
[HK]::keybd_event(0x11, 0, 0, [UIntPtr]::Zero)   # Ctrl down
Start-Sleep -Milliseconds 40
[HK]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)   # Alt down
Start-Sleep -Milliseconds 40
[HK]::keybd_event($vk, 0, 0, [UIntPtr]::Zero)    # litera down
Start-Sleep -Milliseconds 60
[HK]::keybd_event($vk, 0, 2, [UIntPtr]::Zero)    # litera up
[HK]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)   # Alt up
[HK]::keybd_event(0x11, 0, 2, [UIntPtr]::Zero)   # Ctrl up
Write-Output "Ctrl+Alt+$($Letter.ToUpper()) wcisniety"
