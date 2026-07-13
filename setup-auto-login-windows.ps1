$ErrorActionPreference = "Stop"
$credentialDir = Join-Path $env:APPDATA "GradePocket"
$usernameFile = Join-Path $credentialDir "username.txt"
$passwordFile = Join-Path $credentialDir "password.dpapi"

Write-Host "成绩袋 Windows 自动登录设置" -ForegroundColor Green
Write-Host "密码将由 Windows DPAPI 加密，只能由当前 Windows 用户在这台电脑上解密。"
Write-Host ""

$username = Read-Host "教务系统账号"
$securePassword = Read-Host "教务系统密码" -AsSecureString

if ([string]::IsNullOrWhiteSpace($username) -or $securePassword.Length -eq 0) {
    Write-Host "账号或密码为空，未进行保存。" -ForegroundColor Red
    Read-Host "按回车键关闭"
    exit 1
}

New-Item -ItemType Directory -Force -Path $credentialDir | Out-Null
Set-Content -Path $usernameFile -Value $username.Trim() -Encoding UTF8
$securePassword | ConvertFrom-SecureString | Set-Content -Path $passwordFile -Encoding ASCII

Write-Host ""
Write-Host "设置完成。以后登录过期时，成绩袋会自动在后台重新登录。" -ForegroundColor Green
Write-Host "凭据保存在：$credentialDir"
Read-Host "按回车键关闭"
