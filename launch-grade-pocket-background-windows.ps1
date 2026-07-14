$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDir = Join-Path $projectDir ".runtime"

if (-not (Test-Path (Join-Path $projectDir "node_modules"))) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "成绩袋尚未安装，请先双击 install-grade-pocket.bat。",
        "成绩袋启动失败",
        "OK",
        "Error"
    ) | Out-Null
    exit 1
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

function Test-LocalPort([int]$Port) {
    return $null -ne (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Start-GradePocketProcess([string]$Name, [string]$ScriptName) {
    Start-Process `
        -FilePath $npm `
        -ArgumentList @("run", $ScriptName) `
        -WorkingDirectory $projectDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $runtimeDir "$Name.out.log") `
        -RedirectStandardError (Join-Path $runtimeDir "$Name.err.log")
}

if (-not (Test-LocalPort 3100)) {
    Start-GradePocketProcess "connector" "connector"
}

if (-not (Test-LocalPort 3000)) {
    Start-GradePocketProcess "web" "dev"
}

for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if ((Test-LocalPort 3000) -and (Test-LocalPort 3100)) {
        Start-Process "http://localhost:3000"
        exit 0
    }
    Start-Sleep -Seconds 1
}

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(
    "成绩袋启动超时，请查看项目 .runtime 文件夹中的日志。",
    "成绩袋启动失败",
    "OK",
    "Error"
) | Out-Null
exit 1
