@echo off
title Firebase Emulator - rhdtalia

set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

echo ========================================
echo   EMULADORES FIREBASE - RHDTALIA
echo ========================================
echo.
echo Java: 
java -version
echo.
echo Iniciando emuladores...
echo Aguarde abrir http://localhost:4000
echo Feche esta janela para PARAR.
echo ========================================
echo.

cd /d "%~dp0"
firebase emulators:start --project rhdtalia --import=C:\rhdtalia-emulator-data --export-on-exit

pause
