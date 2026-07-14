$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $projectDir "launch-grade-pocket-background-windows.ps1"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutName = (-join ([char[]](0x6210, 0x7EE9, 0x888B))) + ".lnk"
$shortcutPath = Join-Path $desktop $shortcutName
$powershell = Join-Path $PSHOME "powershell.exe"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershell
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
$shortcut.WorkingDirectory = $projectDir
$shortcut.Description = "Start Grade Pocket"
$shortcut.IconLocation = "${env:SystemRoot}\System32\shell32.dll,220"
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath"
