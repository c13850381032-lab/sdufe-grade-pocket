$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$credentialDir = Join-Path $env:APPDATA "GradePocket"
$usernameFile = Join-Path $credentialDir "username.txt"
$passwordFile = Join-Path $credentialDir "password.dpapi"

if (-not (Test-Path $usernameFile) -or -not (Test-Path $passwordFile)) {
    exit 2
}

$username = (Get-Content -Raw -Path $usernameFile).Trim()
$encryptedPassword = (Get-Content -Raw -Path $passwordFile).Trim()
$securePassword = ConvertTo-SecureString $encryptedPassword
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    @{ username = $username; password = $plainPassword } | ConvertTo-Json -Compress
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $plainPassword = $null
}
