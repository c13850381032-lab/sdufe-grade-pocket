$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDir = Join-Path $projectDir ".runtime"

function Show-GradePocketError([string]$Message) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        $Message,
        "Grade Pocket",
        "OK",
        "Error"
    ) | Out-Null
}

if (-not (Test-Path (Join-Path $projectDir "node_modules"))) {
    Show-GradePocketError "Grade Pocket is not installed. Run install-grade-pocket.bat first."
    exit 1
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

try {
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
}
catch {
    Show-GradePocketError "Node.js was not found. Install Node.js 22.13 or newer."
    exit 1
}

function Test-LocalPort([int]$Port) {
    return $null -ne (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Start-GradePocketProcess([string]$Name, [string]$ScriptName) {
    $options = @{
        FilePath = $env:ComSpec
        ArgumentList = @("/d", "/c", "npm.cmd run $ScriptName")
        WorkingDirectory = $projectDir
        WindowStyle = "Hidden"
        RedirectStandardOutput = Join-Path $runtimeDir "$Name.out.log"
        RedirectStandardError = Join-Path $runtimeDir "$Name.err.log"
    }
    Start-Process @options
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

Show-GradePocketError "Startup timed out. Check the log files in the project .runtime folder."
exit 1
