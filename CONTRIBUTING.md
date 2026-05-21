# Mitwirken

Bandsalat ist eine kleine Privat-App, die als OSS bereitsteht. Beiträge
sind willkommen — schick einfach einen Pull Request gegen `main`.

## Lokales Setup

```bash
git clone https://github.com/der-bandsalat/bandsalat.git
cd bandsalat
pnpm install
cp .env.example .env
# .env editieren (mindestens APP_PASSWORD + SESSION_SECRET)
pnpm db:migrate
pnpm dev
```

Erreichbar auf <http://localhost:5173>.

## Pull Requests

- **Klein halten.** Eine Änderung pro PR.
- **Tests** sollten grün bleiben:
  ```bash
  pnpm check        # svelte-check (TypeScript)
  pnpm test         # vitest
  pnpm format:check # prettier
  pnpm build        # Production-Build
  ```
- **Format**: Prettier ist konfiguriert (Tabs, single quotes, no trailing
  comma, print-width 100). `pnpm format` macht das automatisch.
- **Commit-Stil**: erste Zeile <72 Zeichen, ggf. Body in Stichworten.
  Beispiele aus dem History: `Feature: Wantlist mit Discogs-Auto-Search`,
  `Logo-Farbextraktion: transparente Pixel ignorieren`.

## Schemata & Migrationen

Wenn du die DB-Spalten änderst:

```bash
# 1. src/lib/server/db/schema.ts anpassen
pnpm drizzle-kit generate  # erzeugt drizzle/000X_*.sql
# 2. commit beide Files (schema.ts + neue Migration)
```

Migrationen laufen automatisch beim App-Start (`src/lib/server/init.ts`).

## Sprache

Deutsche UI, deutsche Inline-Kommentare. Variablen-/Funktionsnamen und
Schema-Felder dürfen englisch sein (`createCassette`, `discogsReleaseId`),
aber UI-Strings und JSDoc bleiben deutsch.

## Bugs & Vorschläge

GitHub-Issues für reproduzierbare Bugs und Feature-Ideen. Vor dem Aufmachen
gerne kurz im bestehenden Issue-Tracker suchen, ob's das schon gibt.

## Sicherheitslücken

Siehe [SECURITY.md](SECURITY.md) — nicht öffentlich melden.
