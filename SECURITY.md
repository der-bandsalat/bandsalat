# Security Policy

## Reporting a Vulnerability

Wenn du eine Sicherheitslücke in Bandsalat findest, melde sie bitte
**nicht** öffentlich (kein GitHub-Issue, kein Forum-Post). Stattdessen:

- E-Mail an den Maintainer (siehe Repo-Profil) mit Betreff
  `[security] Bandsalat – <kurze Beschreibung>`
- Oder GitHub Private Vulnerability Reporting:
  https://github.com/der-bandsalat/bandsalat/security/advisories/new

Gib im Report bitte an:

- Welche Version (Commit-SHA oder Tag) du getestet hast
- Reproduktions-Schritte
- Erwartetes vs. tatsächliches Verhalten
- Wenn möglich: PoC-Code oder Logs

Ich antworte in der Regel innerhalb von 72 Stunden. Nach dem Fix gibt's
einen koordinierten Disclosure-Termin.

## Scope

Bandsalat ist eine **Single-User-Anwendung** mit Argon2id-Passwort,
HMAC-signierter Session-Cookie, Rate-Limit auf Login und CSRF-Origin-
Check via SvelteKit. Trotzdem interessant zu hören:

- Auth-Bypass / Privilege Escalation
- Injection (SQL, XSS, Path-Traversal, SSRF)
- Geleakte Secrets in Logs oder Responses
- Schwachstellen in der Docker-Container-Konfiguration
- Probleme mit den Foto-/Cover-Upload-Pipelines (sharp, SVG-Sanitization)

Out of scope:

- DoS gegen den eigenen Container (Single-User, hinter Auth)
- Social Engineering, Phishing
- Schwachstellen in unsupported Setups (selbst gebauter Reverse-Proxy
  ohne TLS, exposed Port 3000 ohne Auth davor etc.)

## Unterstützte Versionen

Aktuell nur `main`. Fixe Versions-Tags gibt es noch nicht — sobald
es ein erstes `v1.0.0` gibt, wird hier eine Tabelle ergänzt.
