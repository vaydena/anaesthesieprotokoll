# Korbinians Bär – Schatzsuche durch Freising

Ein Standort-Spiel im Stil von Pokémon Go für Freising: Der Bär aus der Korbinian-Legende hat das
Gepäck des Heiligen in der ganzen Stadt verloren. Die Spieler gehen zu echten Orten, beantworten
eine Frage, bergen den Schatz und erfahren nebenbei etwas über die Stadtgeschichte.

Es ist eine Web-App (PWA): Sie läuft im Handy-Browser, lässt sich zum Startbildschirm hinzufügen,
braucht keinen App Store und keinen Server.

## Spielinhalte

| Kapitel | Orte |
|---|---|
| 1 Innenstadt | Obere Hauptstraße (Moosach), Marienplatz, Asamgebäude, St. Georg, Untere Hauptstraße (Heiliggeist) |
| 2 Domberg | Domberg-Aufgang, Dom, Diözesanmuseum, Bahnhof |
| 3 Weihenstephan | Lindenkeller, Brauerei, Hofgarten, Sichtungsgarten |
| 4 Isar | Luitpoldanlage, Isar |

- **Schätze** (🎁) liegen fest an echten Orten. Einsammeln geht nur im Umkreis von ca. 45 m und nach einer richtig beantworteten Frage.
- **Kleine Funde** (Brezn, Hopfen, Bärenspuren, Silberpfennige, Edelsteine …) tauchen überall rund um den Spieler auf und wechseln alle 15 Minuten.
- **Kapitel** werden der Reihe nach freigeschaltet. Punkte ergeben Stufen, alles landet im Album.
- **Testmodus** (unter „Info"): Die Figur lässt sich per Tipp auf die Karte bewegen, zum Ausprobieren von zu Hause.

Standort und Spielstand bleiben auf dem Gerät (localStorage), es werden keine Daten verschickt.

## Dateien

- `data.js`: alle Inhalte (Orte, Fragen, Texte, Funde). Neue Orte werden hier ergänzt.
- `game.js`: Spiellogik
- `index.html`, `style.css`: Oberfläche
- `sw.js`, `manifest.webmanifest`, `icons/`: PWA (offline-fähig, installierbar)
- `vendor/leaflet/`: Kartenbibliothek Leaflet 1.9.4 (BSD-2-Lizenz), lokal eingebunden

## Koordinaten vor Ort prüfen (wichtig)

Nur Dom, Bahnhof, Brauerei Weihenstephan und Sichtungsgarten haben geprüfte Koordinaten
(`geprueft: true`). Die übrigen Orte sind geschätzt. So werden sie korrigiert:

1. `index.html?editor` auf dem Handy öffnen.
2. Die Marker an die richtige Stelle ziehen. Die Änderung wird sofort auf diesem Gerät gespeichert.
3. Auf **Export** tippen. Die Koordinaten werden in die Zwischenablage kopiert und dann in `data.js` eingetragen.

## Lokal starten

```sh
cd korbinians-baer
python3 -m http.server 8000
# Browser: http://localhost:8000
```

Die Standortbestimmung funktioniert im Browser nur über **HTTPS** (oder `localhost`).

## Veröffentlichen

Das Spiel wird automatisch auf Hostinger veröffentlicht, sobald Änderungen an diesem Ordner auf
`main` landen (Workflow `.github/workflows/deploy-korbinians-baer.yml`, nutzt dasselbe
`FTP_PASSWORD`-Secret wie die übrige Seite). Ziel ist der FTP-Ordner `/korbinians-baer/`,
auf den die Subdomain im Hostinger-Panel zeigen muss. Manuell geht es über den Actions-Tab
(„Deploy Korbinians Bär zu Hostinger“ → „Run workflow“).

Adresse: **https://korbinians-baer.vaydena.de/**

Alternativ reicht jedes andere Hosting für statische Dateien mit HTTPS: den kompletten Ordner hochladen, fertig.

Die Kartenbilder kommen von den OpenStreetMap-Servern. Für ein kleines Projekt ist das in Ordnung.
Bei sehr vielen Nutzern sollte ein eigener Kachel-Anbieter eingetragen werden (`game.js`, `L.tileLayer`).
