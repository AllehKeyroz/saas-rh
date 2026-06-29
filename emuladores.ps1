param([switch]$Seed)

$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"

if (-not (Test-Path $javaHome)) {
  Write-Host "Java 21 nao encontrado em $javaHome" -ForegroundColor Red
  exit 1
}

$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   EMULADORES FIREBASE - RHDTALIA       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "Java: $((java -version 2>&1 | Select-Object -First 1))" -ForegroundColor Gray
Write-Host "Projeto: demo-rhdtalia`n" -ForegroundColor Gray

firebase emulators:start --project demo-rhdtalia
