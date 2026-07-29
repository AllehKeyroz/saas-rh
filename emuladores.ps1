param([switch]$Seed)

$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"

if (-not (Test-Path $javaHome)) {
  Write-Host "Java 21 nao encontrado em $javaHome" -ForegroundColor Red
  exit 1
}

$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

$emulatorData = "C:\rhdtalia-emulator-data"

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   EMULADORES FIREBASE - RHDTALIA       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "Java: $((java -version 2>&1 | Select-Object -First 1))" -ForegroundColor Gray
Write-Host "Projeto: rhdtalia" -ForegroundColor Gray

if ($Seed) {
  Write-Host "Modo: seed (dados frescos, sem persistencia)" -ForegroundColor Yellow
  firebase emulators:start --project rhdtalia
} else {
  if (-not (Test-Path $emulatorData)) {
    New-Item -ItemType Directory -Path $emulatorData -Force | Out-Null
    Write-Host "Diretorio de dados criado em $emulatorData" -ForegroundColor Gray
  }
  Write-Host "Modo: persistente (dados salvos em $emulatorData)" -ForegroundColor Green
  firebase emulators:start --project rhdtalia --import="$emulatorData" --export-on-exit
}
