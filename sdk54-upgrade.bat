@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo   Stampie-App: SDK-54-Pakete installieren
echo ==================================================
echo.
echo Installiere (mit --legacy-peer-deps, das umgeht die npm-Peer-Warnungen)...
call npm install --legacy-peer-deps
if errorlevel 1 goto :error

echo.
echo ==================================================
echo  Fertig. Jetzt im Projekt-Ordner "alles-starten.bat"
echo  ausfuehren und den QR-Code neu mit Expo Go scannen.
echo ==================================================
pause
exit /b 0

:error
echo.
echo FEHLER aufgetreten. Bitte den obigen Text kopieren und schicken.
pause
exit /b 1
