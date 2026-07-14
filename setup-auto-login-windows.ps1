$ErrorActionPreference = "Stop"
$credentialDir = Join-Path $env:APPDATA "GradePocket"
$usernameFile = Join-Path $credentialDir "username.txt"
$passwordFile = Join-Path $credentialDir "password.dpapi"

Write-Host "Grade Pocket automatic login setup" -ForegroundColor Green
Write-Host "The password will be encrypted with Windows DPAPI."
Write-Host "Only this Windows user on this computer can decrypt it."
Write-Host ""

$username = Read-Host "Academic system username"
$securePassword = Read-Host "Academic system password" -AsSecureString

if ([string]::IsNullOrWhiteSpace($username) -or $securePassword.Length -eq 0) {
    Write-Host "The username or password is empty. Nothing was saved." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

New-Item -ItemType Directory -Force -Path $credentialDir | Out-Null
Set-Content -Path $usernameFile -Value $username.Trim() -Encoding UTF8
$securePassword | ConvertFrom-SecureString | Set-Content -Path $passwordFile -Encoding ASCII

Write-Host ""
Write-Host "Automatic login setup completed." -ForegroundColor Green
Write-Host "Credential folder: $credentialDir"
Read-Host "Press Enter to close"
