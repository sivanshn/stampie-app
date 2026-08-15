@echo off
setlocal
cd /d "%~dp0"
echo ==================================================
echo   Schritt 1: Bei Expo anmelden
echo ==================================================
echo.
echo Gleich wirst du nach E-Mail und Passwort gefragt.
echo Tippe deine Expo-Zugangsdaten ein (Passwort bleibt unsichtbar).
echo.
call eas login
echo.
echo --------------------------------------------------
echo Wenn oben "Logged in as ..." steht: super!
echo Schliesse dieses Fenster und starte 2-eas-build.bat
echo --------------------------------------------------
pause
