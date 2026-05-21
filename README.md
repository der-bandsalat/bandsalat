# Bandsalat

[![CI](https://github.com/der-bandsalat/bandsalat/actions/workflows/ci.yml/badge.svg)](https://github.com/der-bandsalat/bandsalat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Self-hosted Web-Katalog für deine private Hörspielkassetten-Sammlung — Die drei ???,
TKKG, Benjamin Blümchen, Europa/Maritim-Auflagen und was sonst noch im Flohmarkt-Karton
landet. **Mobil-first** (Erfassung am Handy, Pflege am Desktop), **deutsches UI**,
**Zwei-Wege-Sync mit Discogs**. Single-User-App, läuft als ein Docker-Container hinter
dem Reverse-Proxy deiner Wahl (Caddy, nginx, Traefik …).

Optional auch für LP/CD-Sammlungen aktivierbar; Spezial-Feature für „Die drei ???":
verschiedene Auflagen pro Folge tracken (Discogs-Pressungen + manuelle Einträge).

## Features

- 🟧 **Quick-Add** mobil-first, einhändig: Serie (mit Autocomplete) · Folge · Titel · Discogs-Suche
  · Zustand MC/Hülle · Originalhülle/vollständig Toggle · Foto-Capture (Kamera) · Kauf-Infos · Notiz.
  Speichern & nächste hält den Flow am Flohmarkt offen.
- 🟧 **Discogs-Live-Suche** mit Format-Filter (Cassette default), Trefferliste mit Cover/Catno/Land/Format.
  Auswahl füllt Label, Jahr, Release-ID, URL automatisch.
- 🟧 **Discogs-Zwei-Wege-Sync**: lokales Push → Collection-Folder erstellen/wählen,
  Release-Instanz anlegen, Media/Sleeve-Condition + Notes setzen. Bulk-Push mit Fortschrittsanzeige.
  Pull („Von Discogs übernehmen") füllt nur leere Felder; Override-Checkbox für vollständiges Refresh.
- 🟧 **Foto-Erkennung (Claude Vision)**: Kamera-Aufnahme → Modell extrahiert Serie, Folge,
  Titel, Label, Jahr aus dem Cover und schlägt passende Discogs-Releases vor. Duplikat-Check
  (exakt: Serie + Folge; oder gleiche Release-ID) verhindert versehentliches Doppelt-Erfassen.
- 🟧 **Bewertung & Hör-Protokoll**: 0,5–5 Sterne (iTunes-Halbsterne) + optionaler Review-Text.
  Sterne sind direkt aus Grid, Liste und Detailseite per Klick vergebbar (optimistisches UI).
  Pro Folge ein Hör-Protokoll mit Datum + Notiz, Zähler-Badge zeigt „N× gehört".
- 🟧 **Wantlist**: aktiv gesuchte Folgen/Editionen mit Maximalpreis, Priorität (Niedrig–Top)
  und optionaler Discogs-Verknüpfung über die Live-Suche. „Gefunden!"-Button konvertiert
  einen Wantlist-Eintrag direkt in eine vollwertige Kassette.
- 🟧 **Lückenanalyse + Sammelziele**: pro Serie min..max Folge oder explizites Ziel-Range setzen,
  Fortschrittsanzeige, Klick auf Lücke öffnet das Quick-Add mit vorausgewählter Serie+Folge.
- 🟧 **Ordner / Grabbelkiste**: nicht-serienzugehörige Kassetten in benannten Ordnern bündeln
  (z.B. „Maritim-Singles"), eigene Übersicht getrennt von Serien.
- 🟧 **Statistik-Dashboard**: Wachstum (Linie), Zustands-Verteilung (Donut), Top-Labels (Bar),
  Marktwert-Schätzung über Discogs `price_suggestions` mit Cache.
- 🟧 **Themes**: Hell · Dunkel · HiFi Schwarz-Gold (Marantz-Anmutung) · System (folgt OS-Setting).
- 🟧 **Übersicht** mit Volltextsuche, Filtern (Serie, Label, Originalhülle, Discogs-Link,
  Kaufzeitraum), Sortierung, Grid ⇄ Tabelle, Stats-Pills (Gesamtzahl, Kaufwert, pro Serie).
- 🟧 **Foto-Pipeline**: sharp re-encode + Auto-Rotate + 320er-Thumbnail, max 15 MiB pro Bild.
- 🟧 **Export/Import**: SQLite-Snapshot, JSON-Dump, Discogs-Collection-CSV; CSV-Import skippt
  bereits vorhandene `release_id`s.
- 🟧 **Backup-Skript** für cron (Host oder Docker-`exec`) mit WAL-Checkpoint + 30-Tage-Retention.
- 🟧 **Auth**: Single-User, argon2id-Passwort-Hash, HMAC-signiertes HttpOnly-Cookie,
  Rate-Limit auf Login (10/15min/IP), CSRF via SvelteKit-Origin-Check.

## Tech-Stack

| Schicht       | Wahl                                                   |
| ------------- | ------------------------------------------------------ |
| Framework     | SvelteKit (Svelte 5, TypeScript), `adapter-node`       |
| DB            | SQLite mit Drizzle ORM + `better-sqlite3` (WAL-Mode)   |
| Styling       | TailwindCSS v4, `@lucide/svelte` Icons                 |
| Bilder        | `sharp`                                                |
| Sicherheit    | `argon2` (Passwort), HMAC-SHA256 (Cookie), `zod` (Input) |
| Tests         | `vitest` (42 Tests: gaps, Discogs-Client, Mapping, CSV) |
| Runtime       | Node 22 LTS, pnpm                                      |

## Schnellstart (lokal)

```bash
pnpm install
cp .env.example .env
# .env editieren — mindestens APP_PASSWORD, SESSION_SECRET setzen
pnpm db:migrate
pnpm db:seed         # optional: 5 Beispieldatensätze
pnpm dev
```

Erreichbar auf <http://localhost:5173>. Health-Check: <http://localhost:5173/healthz>.

## Produktion (Docker)

```bash
cp .env.example .env
# Werte produktiv setzen — siehe Tabelle unten
docker compose up -d --build
```

Der Container hört auf `127.0.0.1:3000`. Stell deinen vorhandenen Reverse-Proxy davor.

### Caddy-Snippet

```caddy
bandsalat.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

### nginx-Snippet

```nginx
server {
    server_name bandsalat.example.com;
    listen 443 ssl http2;
    # ... TLS-Konfig ...

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> Wichtig: Setze `ORIGIN=https://bandsalat.example.com` in `.env`. Ohne das blockiert SvelteKit
> alle POST-Form-Requests mit „Cross-site POST forbidden".

## Discogs-Token besorgen

1. <https://www.discogs.com> einloggen
2. Settings → Developers → **Generate new token**
3. Token in `.env` als `DISCOGS_TOKEN` setzen, `DISCOGS_USERNAME` ist dein Discogs-Username
4. Im UI auf `/sync` → „Token testen" + Folder auswählen oder neu anlegen

## Foto-Erkennung (Claude Vision) aktivieren

Quick-Add hat einen Kamera-Knopf, der per Claude Vision Serie, Folge, Titel,
Label und Jahr direkt vom Cover liest und passende Discogs-Releases vorschlägt.
Das Feature ist optional: Ohne API-Key ist der Knopf ausgeblendet, der Rest
der App funktioniert ganz normal weiter.

1. <https://console.anthropic.com/settings/keys> öffnen und einen API-Key
   erzeugen (kostet bei Hobby-Nutzung nur ein paar Cent pro Monat).
2. Den Key in `.env` als `ANTHROPIC_API_KEY=sk-ant-…` setzen.
3. Optional das Vision-Modell über `SCAN_MODEL` anpassen:
   - `claude-haiku-4-5-20251001` (Default; ca. 0,001 € pro Scan, schnell)
   - `claude-sonnet-4-6` (ca. 0,01 € pro Scan; robuster bei schlecht
     ausgeleuchteten oder beschädigten Covern)
4. Container neu starten (`docker compose up -d`). Der Kamera-Knopf
   erscheint nun im Quick-Add unter `/kassetten/neu`.

Der Scan-Endpoint `/api/scan` ist auth-geschützt. Das Bild wird nur an
Anthropic geschickt und nicht persistiert. Bei Erfolg landest du in einem
vorbefüllten Quick-Add-Formular; eine Duplikat-Prüfung verhindert dabei
versehentliches Doppelt-Erfassen.

## Umgebungsvariablen

Siehe `.env.example`. Pflicht für den Start:

| Variable                             | Zweck                                                |
| ------------------------------------ | ---------------------------------------------------- |
| `APP_PASSWORD` / `APP_PASSWORD_HASH` | Login-Passwort (Hash bevorzugt, ≥8 Zeichen)          |
| `SESSION_SECRET`                     | Cookie-Signierung (≥32 Zeichen, `openssl rand -hex 32`) |
| `SESSION_DAYS`                       | Cookie-Laufzeit, Default 30                          |
| `DISCOGS_TOKEN`                      | Discogs Personal Access Token (optional ohne Sync)   |
| `DISCOGS_USERNAME`                   | Discogs-Username (optional ohne Sync)                |
| `ANTHROPIC_API_KEY`                  | Claude-Vision Foto-Scan (optional, sonst ausgeblendet) |
| `SCAN_MODEL`                         | Vision-Modell, Default `claude-haiku-4-5-20251001`   |
| `DATA_DIR`                           | Pfad für SQLite-Datei + uploads/, Default `./data`   |
| `PORT`                               | App-Port, Default 3000                               |
| `ORIGIN`                             | **Hinter Reverse-Proxy Pflicht**: öffentliche URL    |

## Datenmodell

- `cassettes` — Hauptobjekt: Serie, Folge, Titel, Label, Auflage-Variante, Jahr,
  Discogs-Release-ID, Seriennummer, Zustand MC/Hülle (Discogs-Grading-Enums), Originalhülle,
  Vollständigkeit, Kauf-Infos, Foto-Pfade, Sync-State, Bewertung (1–10 Halbsterne),
  Review-Text, optionaler Ordner („Grabbelkiste").
- `app_meta` — KV-Store für gecachte Discogs-Daten (Folder-ID, Field-Definitionen)
  und Sammelziele pro Serie (`serie_target:{name}`).
- `discogs_price_cache` — Preisvorschläge pro Release, TTL über `fetched_at`.
- `listen_log` — pro Anhören eine Zeile (Cassette-FK mit Cascade-Delete, Datum + Notiz).
- `wantlist` — aktuell gesuchte Folgen/Editionen (Serie, Folge, Discogs-Verknüpfung,
  Maximalpreis, Priorität, Notiz).

Drizzle-Migrationen liegen unter [`drizzle/`](drizzle/), Schema in
[`src/lib/server/db/schema.ts`](src/lib/server/db/schema.ts).

## Discogs-Sync-Details

- **Auth**: Personal Access Token via Header (`Authorization: Discogs token=...`) + `User-Agent: HoerspielKatalog/1.0`.
- **Rate-Limit**: sequentielle Queue mit 1100 ms Mindestabstand (≤ 60 req/min), Exponential-Backoff bei HTTP 429 mit Respekt vor `Retry-After`.
- **Folder**: bei Bedarf wird der bevorzugte Folder „Hörspielkassetten" angelegt; gewählte
  Folder-ID wird in `app_meta` gecacht.
- **Fields**: `/users/{u}/collection/fields` wird einmalig pro 24h gecacht; Media/Sleeve/Notes
  werden defensiv per Name (case-insensitive, mehrsprachig) gefunden — fehlt ein Feld oder eine
  Option, wird sauber übersprungen + geloggt, nie gecrasht.
- **Notes-Komposition**: `Seriennummer: ... · Auflage: ... · <freie Notiz>` — nur was gesetzt ist.
- **Konflikt-Policy**: Lokale DB ist Source of Truth. „Von Discogs übernehmen" füllt nur leere
  Felder; explizite Override-Checkbox vorhanden. Push schreibt lokale Werte nach Discogs.
- **Bulk-Push**: In-Memory-Job mit Live-Status (`/api/sync/status`), UI pollt im 1,5 s-Takt.

## Backup / Restore

**Backup** des Docker-Volumes (`bandsalat-data` → intern `/data`): SQLite-Datei + `uploads/`.

```bash
# Im Container (mit installiertem sqlite3):
./scripts/backup.sh /var/backups/bandsalat --container bandsalat
# Oder direkt auf dem Host wenn nicht-Docker:
DATA_DIR=/srv/bandsalat/data ./scripts/backup.sh /var/backups/bandsalat
```

Das Skript checkpointet WAL, kopiert SQLite + uploads/ in `<target>/<UTC-Timestamp>/` und
räumt Backups älter als 30 Tage weg. Geeignet für `cron`.

**Restore**: App stoppen, `bandsalat.sqlite` + `uploads/` ins Volume zurückspielen, App starten.

**Manuell aus dem UI**: `/einstellungen` → SQLite-Snapshot oder JSON-Dump downloaden;
Discogs-CSV-Export für Re-Upload zu Discogs.

## Update-Prozedur

```bash
git pull
docker compose build
docker compose up -d
# Migrationen laufen automatisch beim Start (siehe src/lib/server/init.ts)
```

## Routen-Übersicht

| Pfad                            | Zweck                                              |
| ------------------------------- | -------------------------------------------------- |
| `/login`, `/logout`             | Auth                                               |
| `/healthz`                      | Healthcheck (public)                               |
| `/serien`                       | Serien-Übersicht mit Vollständigkeit + Ordnern     |
| `/serien/[name]`                | Folgen einer Serie (Grid/Liste), Sammelziel        |
| `/kassetten`                    | Flache Übersicht, Suche, Filter, Grid ⇄ Tabelle    |
| `/kassetten/neu`                | Quick-Add (mobil-first) + Foto-Scan                |
| `/kassetten/[id]`               | Detail/Edit, Inline-Sterne, Hör-Protokoll, Discogs |
| `/kassetten/luecken`            | Lückenanalyse, klickbare fehlende Folgen           |
| `/wantlist`                     | Aktiv gesuchte Folgen, „Gefunden!" → Kassette      |
| `/statistik`                    | Wachstum, Zustand, Labels, Marktwert (Discogs)     |
| `/sync`                         | Token-Test, Folder-Picker, Bulk-Push, Fehler-Log   |
| `/einstellungen`                | Theme, Export (SQLite/JSON/CSV), CSV-Import        |
| `/api/cassettes/[id]/rating`    | Inline-Rating per fetch (JSON)                     |
| `/api/discogs/search`           | Live-Suche (für UI)                                |
| `/api/discogs/release/[id]`     | Release-Details + Cover-Cache                      |
| `/api/scan`                     | Claude-Vision Foto-Scan (optional)                 |
| `/api/sync/status`              | Sync-Polling                                       |
| `/uploads/[...path]`            | geschützter Static-Server für Fotos und Cover      |

## Mitwirken

Pull Requests willkommen. Setup, Konventionen und Tests siehe
[CONTRIBUTING.md](CONTRIBUTING.md). Sicherheitslücken bitte
nicht öffentlich melden — siehe [SECURITY.md](SECURITY.md).

## Autoren

- [@marschit](https://github.com/marschit)
- [@MarschMallow](https://github.com/MarschMallow)
- [Claude](https://claude.com/claude-code) (Anthropic) — paarprogrammiert, hat
  einen Großteil des Code-Bestands geschrieben, jeweils unter menschlicher
  Review. Co-Author-Trailer in den Commits dokumentiert das.

## Lizenz

[MIT](LICENSE) — © 2026 Malte Marschall
