# Stampie – Checkliste für die Apple-Abgabe

Diese Punkte müssen erledigt und geprüft sein, bevor der Produktionsbuild an App Review geht.

## Vor dem Build

- [x] Eindeutige iOS-Bundle-ID: `de.stampie.app`
- [x] Kamera-Zweckbeschreibung für iOS eingerichtet
- [x] Eigene 1024×1024-App-Icon-Datei eingebunden
- [x] iPad-Unterstützung deaktiviert, weil die Betriebs-App derzeit für iPhone ausgelegt ist
- [ ] Die Routen `/datenschutz` und `/support` auf `https://stemply-xi.vercel.app` veröffentlichen und ohne Login testen.
- [ ] In `src/appLinks.ts` die endgültigen öffentlichen URLs bestätigen oder anpassen.
- [ ] Alle Expo-Abhängigkeiten aktualisieren und danach einen iOS-Release-Build erstellen.
- [ ] Den Release-Build auf mindestens einem echten iPhone mit aktueller iOS-Version testen: Start, Login, Passwortwechsel, Kamera erlauben/ablehnen, Scan, Stempelbuchung, Ausgabe-QR, Abmelden, Datenschutzlinks.

## App Store Connect

- [ ] App-Datensatz mit exakt der Bundle-ID `de.stampie.app` anlegen.
- [ ] Datenschutz-URL und Support-URL eintragen; beide müssen öffentlich erreichbar sein.
- [ ] App Privacy vollständig nach den realen Datenflüssen des Backends ausfüllen. Nicht „keine Daten“ wählen: Anmeldedaten, QR-/Kartenkennung und Backend-Verarbeitung prüfen.
- [ ] Kategorie, Altersfreigabe, Preis (kostenlos), Verfügbarkeit, Name, Untertitel und Beschreibung eintragen.
- [ ] Mindestens einen echten iPhone-Screenshot hochladen; keine realen Kunden- oder Mitarbeiterdaten zeigen.
- [ ] Review-Notizen schreiben: Die App ist eine Betriebs-App, benötigt einen vorhandenen Betriebszugang und die Kamera zum QR-Scan.
- [ ] Einen Demo-Betriebszugang einrichten, bei dem kein erzwungener Passwortwechsel den Review unterbricht, sowie einen gültigen Beispiel-QR-Code bereitstellen.
- [ ] Sicherstellen, dass Backend und Demo-Daten während der gesamten Prüfung erreichbar bleiben.

## Nicht ohne Entscheidung veröffentlichen

Die Datenschutzerklärungsvorlage enthält notwendige Rechtsangaben, die nur der Betreiber
bestätigen kann (Firma/Anschrift, Kontakt, Aufbewahrungsfristen und Auftragsverarbeiter).
Keine Platzhalter veröffentlichen.
