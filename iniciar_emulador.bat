@echo off
setlocal enabledelayedexpansion
title RHDTalia - Emuladores + Aplicacao

cd /d "%~dp0"

set "DATA_DIR=C:\rhdtalia-emulator-data"
set "PORTA_APP=5173"

echo ========================================
echo   RHDTALIA - EMULADORES + APP
echo ========================================
echo.

REM ---------- 1. Java 21 ----------
REM Detecta o JDK automaticamente (a versao instalada muda a cada update)
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" goto java_ok
set "JAVA_HOME="
for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk-21*") do set "JAVA_HOME=%%~fD"
if not defined JAVA_HOME for /d %%D in ("C:\Program Files\Eclipse Adoptium\jdk*") do set "JAVA_HOME=%%~fD"
if not defined JAVA_HOME for /d %%D in ("C:\Program Files\Java\jdk-21*") do set "JAVA_HOME=%%~fD"
if not defined JAVA_HOME for /d %%D in ("C:\Program Files\Java\jdk*") do set "JAVA_HOME=%%~fD"
:java_ok
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"

java -version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Java nao encontrado.
  echo        Instale o JDK 21:  winget install EclipseAdoptium.Temurin.21.JDK
  echo.
  pause
  exit /b 1
)
echo Java: %JAVA_HOME%
for /f "delims=" %%V in ('java -version 2^>^&1 ^| findstr /i "version"') do echo       %%V

REM ---------- 2. Firebase CLI ----------
where firebase >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Firebase CLI nao encontrado.
  echo        Instale com:  npm install -g firebase-tools
  echo.
  pause
  exit /b 1
)

REM ---------- 3. Pasta de dados (sessoes salvas) ----------
if not exist "%DATA_DIR%" (
  mkdir "%DATA_DIR%" 2>nul
  echo Dados: pasta criada em %DATA_DIR%
) else (
  echo Dados: %DATA_DIR%
)
echo.

REM ---------- 4. Emuladores ----------
netstat -ano | findstr /C:":9099" | findstr /C:"LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo Emuladores: ja estao rodando - reaproveitando.
  goto aguardar_app
)

echo Emuladores: iniciando em nova janela ^(auth 9099 / firestore 8080 / storage 9199^)...
start "RHDTalia - Emuladores" cmd /c "firebase emulators:start --project rhdtalia --only auth,firestore,storage --import="%DATA_DIR%" --export-on-exit="%DATA_DIR%""

echo Aguardando os emuladores ficarem prontos...
set /a TENT=0
:wait_emulador
powershell -NoProfile -Command "$c = New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 9099); $c.Close(); exit 0 } catch { exit 1 }"
if not errorlevel 1 goto emulador_pronto
set /a TENT+=1
if !TENT! GEQ 90 goto timeout
ping -n 3 127.0.0.1 >nul
goto wait_emulador

:timeout
echo.
echo [ERRO] Os emuladores nao responderam em 3 minutos.
echo        Veja a janela "RHDTalia - Emuladores" para o erro.
echo.
pause
exit /b 1

:emulador_pronto
echo Emuladores: prontos.
echo Painel:     http://localhost:4000
echo.

:aguardar_app
REM ---------- 5. Aplicacao ----------
if not exist "node_modules" (
  echo Dependencias: instalando ^(primeira vez^)...
  call npm install --no-audit --no-fund
)

REM Evita abrir duas instancias do Vite
netstat -ano | findstr /C:":%PORTA_APP%" | findstr /C:"LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo App: ja esta rodando em http://localhost:%PORTA_APP%
  start "" "http://localhost:%PORTA_APP%"
  goto fim
)

echo App: iniciando em http://localhost:%PORTA_APP%
echo.
echo ========================================
echo   Feche esta janela com Ctrl+C para parar o app.
echo   Os emuladores ficam abertos na outra janela:
echo   pare-os com Ctrl+C la para EXPORTAR as sessoes.
echo ========================================
echo.

call npm run dev -- --open

:fim
echo.
echo App encerrado. Emuladores continuam abertos na janela "RHDTalia - Emuladores".
echo Use Ctrl+C nela para parar e salvar os dados em %DATA_DIR%
pause
