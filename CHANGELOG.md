# Changelog

Alle Änderungen an Bandsalat werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/)
und das Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/der-bandsalat/bandsalat/compare/v0.1.0-beta...HEAD
[0.1.0-beta]: https://github.com/der-bandsalat/bandsalat/releases/tag/v0.1.0-beta
