@echo off
setlocal
cd /d "%~dp0"
echo ==================================================
echo   Schritt 2: iOS-App bauen (fuer TestFlight)
echo ==================================================
echo.
echo Du wirst nach deinem Apple-Developer-Login gefragt.
echo Tippe deine Apple-ID + Passwort selbst ein.
echo Der Build laeuft danach in der Cloud (dauert ein paar Minuten).
echo.
call eas build --platform ios --profile production
echo.
pause
