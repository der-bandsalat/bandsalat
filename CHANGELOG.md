# Changelog

Alle Änderungen an Bandsalat werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/)
und das Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/der-bandsalat/bandsalat/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/der-bandsalat/bandsalat/compare/v0.1.0-beta...v0.2.1
[0.1.0-beta]: https://github.com/der-bandsalat/bandsalat/releases/tag/v0.1.0-beta
