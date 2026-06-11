# Changelog

Alle Änderungen an Bandsalat werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/)
und das Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Features

- **Folgen-Suche in der Serie**: Suchfeld auf der Serien-Detailseite
  filtert nach Folgennummer, Label oder Titel (ab 9 Folgen sichtbar).

### Fixes

- **Zurück-Button merkt sich den Zustand**: Bei In-App-Navigation geht
  Zurück per Browser-History — Scroll-Position, Sortierung und View der
  vorherigen Seite bleiben erhalten. Aus der Folgenansicht führt Zurück
  bei Direkteinstiegen jetzt zur Serienansicht statt zu allen Kassetten.

- **Scan-Limit Bulk-Erfassung**: Das Stunden-Limit für Vision-Scans ist
  jetzt per `SCAN_RATE_LIMIT_PER_HOUR` konfigurierbar und steigt von 30
  auf 120 Scans/h (IP-Limit: das Doppelte). Damit bricht die Erfassung
  ganzer Sammlungen nicht mehr nach ~30 Folgen ab.
- **Scan-Fehlermeldungen**: Beim Erreichen des Limits kam nur ein
  generisches „Scan fehlgeschlagen (429)" — jetzt wird die echte Meldung
  samt Wartezeit angezeigt. Zusätzlich bricht der Scan clientseitig nach
  90 s sauber ab statt endlos zu laden (hängende API / Funkloch).
- **Folgennummer vs. Seriennummer**: Der Scan-Prompt grenzt Folgennummer
  und Katalog-/Seriennummer jetzt explizit voneinander ab; zusätzlich
  verwirft eine Plausibilitätsprüfung Folgennummern > 999 sowie Werte,
  die exakt der erkannten Seriennummer entsprechen.

## [0.3.0] – 2026-06-08

### Features

- **Einheitliche Listenansicht**: `/kassetten` (Tabellen-Modus) und die
  Serien-Detailseite (Listen-Modus) teilen sich jetzt eine Komponente
  (`CassetteTable`) und sehen identisch aus — Cover + Folge-Badge +
  Titel, Label/Jahr als Desktop-Spalten bzw. Mobile-Subline.
- **Desktop-Bearbeitungsmodus** (Stift-Toggle in der Tabellen-/Listen-
  Ansicht, nur Desktop): Felder direkt in der Liste pflegen, ohne auf
  jede Kassette einzeln zu klicken.
  - **Inline-Spalten** mit frei wählbaren Feldern (Spalten-Picker, Auswahl
    bleibt im Browser gespeichert) — Zelle für Zelle die Liste runter via
    Tab/Enter. Gedacht zum Nachpflegen eines Felds über viele Kassetten
    (Zustand, Kaufpreis, Kaufort …).
  - **Zeilen-Panel** (Chevron je Zeile) klappt alle Felder einer Kassette
    auf, inkl. Review und Notiz — zum kompletten Erfassen einer Kassette.
  - **Auto-Speichern pro Feld** beim Verlassen der Zelle mit dezentem
    ✓-Feedback; kein Speichern-Knopf nötig.
- Neuer Endpoint **`PATCH /api/cassettes/[id]`** für feldweises Speichern
  (zod-Whitelist auf editierbare Felder, `ensureEditor`-Guard).

### Fixes

- **Listen auf iOS Safari**: Virtual-Scrolling entfernt (sticky `thead`
  im Fensterfluss + JS-Scroll-Handling war auf dem iPhone kaputt). Alle
  Zeilen werden normal gerendert — ein Seiten-Scrollbalken, robust.
- Bearbeiten: getippter Wert bleibt beim Verlassen der Zelle erhalten,
  auch wenn das Speichern fehlschlägt (Entwurf wurde vorher kurz auf den
  alten Wert zurückgesetzt).
- Kaufpreis-Fehlermeldung jetzt auf Deutsch und mit Beispiel
  („Preis muss eine Zahl sein, z. B. 12,50.").

## [0.2.1] – 2026-05-28

### Features

- **Multi-Photo pro Kassette**: neue Tabelle `cassette_photos` mit Rollen
  Front / Rückseite / Extra. Migration 0014 backfilled existierende
  `cover_foto_path` als Front. API für CRUD + Reorder unter
  `/api/cassettes/[id]/photos`.
- **Crop-Editor beim Upload**: Cropper.js v2 Modal mit freier
  Aspect-Ratio + Presets 1:1 und 4:3, 90°-Drehung und Fein-Rotation
  (-15° bis +15° in 0.1°-Schritten) zum Geraderücken schiefer Scans.
- **Cover-Slider** auf der Detail-Seite: blättert durch eigene Fotos +
  gecachten Discogs-Cover + Dreimetadaten-Cover via Pfeile, Swipe,
  Pager-Dots. Default-Slide respektiert die aktive Cover-Quelle.
- **Re-Crop** existierender Fotos in der Galerie (lädt das Original,
  ersetzt nach Bestätigung).
- **Foto-Sheet beim Cover-Tap**: zentralisierte Foto-Verwaltung mit
  read-only Anzeige der externen Quellen (Discogs / Dreimetadaten) plus
  X-Button zum Räumen.
- **Foto-Count-Badge** in der Kassetten-Liste für Kassetten mit >1
  eigenem Foto.

### Fixes

- **Settings-Form** löscht keinen gespeicherten Token mehr beim
  Speichern mit leerem Feld — leeres Feld behält den Wert, Entfernen
  geht weiter explizit über den jeweiligen Clear-Button.
- **CSP** erlaubt `blob:` in `img-src`, damit der Crop-Editor das vom
  User ausgewählte Foto anzeigen kann.
- Dockerfile pinnt pnpm auf 11.1.3 (analog CI), sonst bricht
  `--frozen-lockfile` an Tarball-URLs ohne integrity-Hash ab.
- Cover-Quelle-Picker um redundante `+Foto hochladen` /
  `Foto entfernen` Buttons entschlackt — der Gallery-Pfad mit Crop ist
  jetzt der einzige Weg eigene Fotos zu pflegen.

## [0.1.0-beta] – 2026-05-21

Erste öffentliche Beta-Version. Funktional vollständig genug für den Eigenbedarf.
API und Datenbankschema können sich bis 1.0 noch ändern.

### Features

- Quick-Add (mobil-first) mit Serie/Folge/Titel/Discogs-Suche, Foto-Capture,
  Zustand MC + Hülle, Originalhülle-Toggle, Kauf-Infos, Notiz.
- Discogs-Zwei-Wege-Sync: Push in Collection-Folder, Pull (nur leere Felder
  oder Override), Bulk-Push mit Fortschritt.
- Foto-Erkennung über Claude Vision (Quick-Add-Kamera).
- 0,5–5 Sterne Bewertung + Review-Text, Hör-Protokoll pro Folge.
- Wantlist mit Maximalpreis, Priorität, Discogs-Verknüpfung.
- Lückenanalyse + Sammelziele pro Serie.
- Ordner / Grabbelkiste für Nicht-Serien-Kassetten.
- Statistik-Dashboard (Wachstum, Zustand, Top-Labels, Marktwert).
- Hell/Dunkel/HiFi-Theme + System-Modus.
- Volltextsuche, Filter, Grid ⇄ Tabelle.
- Foto-Pipeline mit sharp (re-encode, Auto-Rotate, 320er-Thumbnail).
- Export/Import: SQLite-Snapshot, JSON, Discogs-CSV.
- Backup-Skript mit WAL-Checkpoint + 30-Tage-Retention.
- Multi-User-Auth (admin/editor/viewer) mit argon2id-Passwort,
  HMAC-Session-Cookie, Login-Rate-Limit, CSRF-Origin-Check.
- Drei-???-Spezial: Auflagen-Tracker pro Folge (Discogs-Pressungen +
  manuelle Einträge), Folge-Cover/Synopsis aus dreimetadaten.de.
- App-Brand-Logo in Einstellungen wählbar (7 Varianten + Custom-Upload).
- Self-hosted Webfonts (Inter Variable + JetBrains Mono Variable).
- Animierte Login-Kassette mit rotierender Drei-???-Top-Folge.

### Security

- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
  via `hooks.server.ts`.
- argon2id-Passwort-Hashes mit per-User-Salt.
- HMAC-signierte HttpOnly-Session-Cookies, SameSite=Lax, Secure in Prod.
- Rate-Limit auf Login (10 / 15 min / IP).
- Role-Guards (`ensureAdmin`, `ensureEditor`) auf allen state-ändernden
  Actions in Einstellungen + Kassetten-Detail.

### Bekannte Lücken

- N+1-Queries in Serien-Übersicht (große Sammlungen >1000 Kassetten
  spürbar langsamer).
- `/api/scan` und `/api/discogs/search` haben noch keine Rate-Limits.
- `/uploads/*` ohne immutable Cache-Control.
- Touch-Targets der Inline-Rating-Komponente knapp unter 44 px.

[Unreleased]: https://github.com/der-bandsalat/bandsalat/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/der-bandsalat/bandsalat/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/der-bandsalat/bandsalat/compare/v0.1.0-beta...v0.2.1
[0.1.0-beta]: https://github.com/der-bandsalat/bandsalat/releases/tag/v0.1.0-beta
