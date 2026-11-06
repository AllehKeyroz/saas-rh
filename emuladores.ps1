param([switch]$Seed)

# Detecta o JDK automaticamente (a versao muda a cada update do Adoptium)
$javaHome = $env:JAVA_HOME
if (-not $javaHome -or -not (Test-Path "$javaHome\bin\java.exe")) {
  $candidatos = @(
    (Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue | Sort-Object Name -Descending),
    (Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk*" -ErrorAction SilentlyContinue | Sort-Object Name -Descending),
    (Get-ChildItem "C:\Program Files\Java" -Directory -Filter "jdk*" -ErrorAction SilentlyContinue | Sort-Object Name -Descending)
  ) | Select-Object -First 1
  if ($candidatos) { $javaHome = $candidatos.FullName }
}

if (-not $javaHome -or -not (Test-Path "$javaHome\bin\java.exe")) {
  Write-Host "Java nao encontrado. Instale o JDK 21:" -ForegroundColor Red
  Write-Host "  winget install EclipseAdoptium.Temurin.21.JDK" -ForegroundColor Yellow
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
