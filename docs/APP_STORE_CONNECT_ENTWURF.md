# App Store Connect – vorbereiteter Entwurf für Stampie

Diese Angaben passen zum aktuellen Funktionsumfang der Betriebs-App. Vor dem Eintragen
bitte Name, rechtliche Angaben und die echten Testdaten bestätigen.

## Produktseite (Deutsch)

| Feld | Vorschlag |
| --- | --- |
| Name | Stampie |
| Untertitel | Kundenkarten stempeln |
| Kategorie | Wirtschaft |
| Preis | Kostenlos |
| Support-URL | `https://stemply-xi.vercel.app/support` – erst nach Veröffentlichung verwenden |
| Datenschutz-URL | `https://stemply-xi.vercel.app/datenschutz` – erst nach Veröffentlichung verwenden |

### Beschreibung

Stampie ist die Betriebs-App für digitale Kundenkarten. Berechtigte Mitarbeitende geben
Kundenkarten aus und stempeln sie direkt an der Kasse per QR-Code.

Mit Stampie kannst du Kundenkarten-Programme auswählen, Ausgabe-QR-Codes anzeigen und
Karten sicher stempeln. Die App zeigt sofort an, ob eine Buchung erfolgreich war oder
warum eine Karte nicht gestempelt werden konnte.

Stampie ist für Betriebe bestimmt, die bereits einen Stampie-Zugang besitzen.

### Keywords

`kundenkarte,treuekarte,stempelkarte,bonuskarte,kasse,qr-code,loyalität`

## Review-Notizen – Vorlage zum Einfügen

```text
Stampie ist eine Betriebs-App für Mitarbeitende von angeschlossenen Betrieben.
Ein öffentlicher Account kann nicht in der App erstellt werden, weil der Zugang von
einem Betrieb eingerichtet wird.

Demo-Zugang
Benutzername: [DEMO-BENUTZERNAME]
Passwort: [DEMO-PASSWORT]

Der Demo-Zugang ist vollständig funktionsfähig und verlangt keinen Passwortwechsel.
Beispiel-QR-Code zum Stempeln: [LINK ODER ANHANG]

Testablauf:
1. Mit dem Demo-Zugang anmelden.
2. „Karte stempeln“ wählen und den Beispiel-QR-Code scannen.
3. Alternativ „Karte ausgeben“ wählen und einen Ausgabe-QR-Code anzeigen.

Die Kamera wird ausschließlich zum Lesen von QR-Codes verwendet. Das Produktions-Backend
und die Demo-Daten bleiben während der gesamten Prüfung aktiv.
```

## App Privacy – vor dem Ausfüllen mit dem Backend abgleichen

| Datenfluss | Im App-Code erkennbar | Vor Einreichung bestätigen |
| --- | --- | --- |
| Betriebs-Benutzername und Zugangsdaten | Anmeldung sendet Benutzername/Passwort an den API-Endpunkt | Ob und wie lange das Backend diese Daten speichert |
| Anmelde-Token | Auf dem iPhone mit Secure Store gespeichert und als Bearer-Token verwendet | Ablaufzeit, Widerruf und Serverprotokollierung |
| QR-/Kartenkennung und Stempelbuchung | Nach dem Scan an den API-Endpunkt übertragen | Ob die Kennung einer Person zugeordnet werden kann und Aufbewahrungsfrist |
| Kameradaten | Die Kamera liest QR-Codes; keine Bild-/Videodatei wird im Code gespeichert | Dass keine Drittanbieter-SDKs Kamerabilder erhalten |
| Hosting-/Protokolldaten | Nicht aus diesem Repository ableitbar | Hostinganbieter, IP-/Logdaten, Analyse- oder Fehlertracking |

Erst danach die Datenarten in App Store Connect wahrheitsgemäß beantworten. Insbesondere
bei Kundenkarten darf nicht pauschal „keine Daten werden erhoben“ gewählt werden, solange
der Backend-Datenfluss nicht bestätigt ist.
