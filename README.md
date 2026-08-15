# Stampie — Betriebs-App (Expo / React Native)

Native App für iOS + Android: Firma meldet sich an, scannt Kunden-QRs, +1 auf die Karte.
Nutzt die API des Stampie-Backends (`/api/app/*`).

## Einmal einrichten

1. **Node** ist installiert (hast du schon).
2. Im Ordner `stampie-app`:
   ```
   npm install
   ```
   Falls Versionswarnungen kommen:
   ```
   npx expo install --fix
   ```
3. **PC-IP eintragen:** In `src/api.ts` die Zeile `API_BASE_URL` auf die LAN-IP deines PCs
   setzen (die, die der Server beim Start als `Network: http://X.X.X.X:3000` anzeigt).
   Handy und PC müssen im **gleichen WLAN** sein.

## Starten (zum Testen auf dem Handy)

1. Auf dem Handy die App **„Expo Go"** installieren (App Store / Play Store).
2. Sicherstellen, dass das **Backend läuft** (im `stemply`-Ordner `neu-start.bat`).
3. Im `stampie-app`-Ordner:
   ```
   npx expo start
   ```
4. Den angezeigten **QR-Code mit Expo Go** scannen (Android) bzw. mit der Kamera (iPhone → öffnet Expo Go).
5. Die App öffnet sich auf dem Handy.

## Ablauf in der App

1. **Anmelden** mit Benutzername + Start-Passwort (im Stampie-Admin unter „Kunden" per
   Schlüssel-Symbol erzeugt).
2. **Passwort ändern** (beim ersten Mal erzwungen).
3. **Scannen:** Kunden-QR in den Rahmen halten → grüne Rückmeldung „Gestempelt 4/10"
   oder rote Meldung (fremde Karte / gerade eben schon gestempelt / …).

## Später (Veröffentlichung)

Für eine echte App im Store (statt Expo Go) baut man mit **EAS Build** eigene Builds und
lädt sie in App Store / Play Store. Braucht Apple Developer (99 €/Jahr) und Google Play
(25 € einmalig).
