@echo off
setlocal
cd /d "%~dp0"
echo ==================================================
echo   EAS-CLI installieren
echo ==================================================
echo.
call npm install -g eas-cli
echo.
echo Fertig. Naechster Schritt (musst DU tippen, dein Konto):
echo    eas login
pause
