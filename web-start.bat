@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo    Stampie-App — Web-Vorschau starten
echo ============================================
echo.
echo [1/3] Installiere Abhaengigkeiten ^(beim ersten Mal einige Minuten^)...
call npm install
if errorlevel 1 goto :error

echo [2/3] Ergaenze fehlende Expo-Pakete ^(SDK-korrekt^)...
call npx expo install expo-asset expo-font expo-constants
if errorlevel 1 goto :error

echo [3/3] Starte Web-Vorschau ^(oeffnet den Browser^)...
call npx expo start --web

echo.
echo Fenster offen lassen, solange du die Vorschau nutzt.
pause
exit /b 0

:error
echo.
echo FEHLER beim Installieren. Bitte den obigen Text kopieren und schicken.
pause
exit /b 1
