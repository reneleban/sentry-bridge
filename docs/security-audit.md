# Security Audit Report — SentryBridge

**Datum:** 2026-04-13
**Durchgeführt von:** René Leban
**Scope:** SentryBridge v1.1.0 — Pre-public-release Audit (vor Erstellung von reneleban/sentry-bridge)

---

## Tool

- **Tool:** gitleaks v8.30.1
- **Scan-Datum:** 2026-04-13

---

## Scan-Ergebnisse

### 1. Working Tree Scan (`gitleaks detect --source . --no-git`)

**Findings gesamt:** 9

| Datei                         | Secret            | Einschätzung                               | Aktion                                                                                       |
| ----------------------------- | ----------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `.planning/phases/09-*/` (2x) | `<username>:<password>`  | Dokumentationsbeispiel, gitignored         | Verzeichnis gitignored, wird nicht in neues Repo übertragen                                  |
| `.claude/worktrees/` (3x)     | `<username>:<password>`  | Worktree-Kopie, gitignored                 | Verzeichnis gitignored, wird nicht in neues Repo übertragen                                  |
| `config/config.json`          | `9BG7fD4ab5wyigj` | Echtes PrusaLink-Passwort — lokale Instanz | **Gitignored** — niemals committet, nicht in Git-History. Kein Risiko für öffentliches Repo. |
| `README.md`                   | `<username>:<password>`  | Dokumentationsbeispiel in curl-Befehl      | **Bereinigt** — ersetzt durch `<username>:<password>`                                        |
| `.planning/phases/16-*/` (2x) | `<username>:<password>`  | Dokumentationsbeispiel in Plan-Dateien     | Verzeichnis gitignored, wird nicht in neues Repo übertragen                                  |

**Findings im öffentlichen Scope (Sourcecode .ts/.tsx/.js):** 0

**Findings in README.md nach Bereinigung:** 0

### 2. Git-History Scan (`gitleaks detect`)

**Commits gescannt:** 283
**Findings gesamt:** 12

| Datei                                                         | Secret           | Commits | Einschätzung                                  | Disposition                                                              |
| ------------------------------------------------------------- | ---------------- | ------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `.planning/phases/09-documentation/09-01-PLAN.md`             | `<username>:<password>` | mehrere | Dokumentationsbeispiel in GSD-Workspace-Datei | Entfernt durch git-filter-repo (`.planning/` wird aus History gefiltert) |
| `.planning/phases/09-documentation/09-VERIFICATION.md`        | `<username>:<password>` | mehrere | Dokumentationsbeispiel in GSD-Workspace-Datei | Entfernt durch git-filter-repo                                           |
| `.planning/phases/16-security-audit-repo-setup/16-01-PLAN.md` | `<username>:<password>` | 1       | Dokumentationsbeispiel in Plan-Datei          | Entfernt durch git-filter-repo                                           |
| `.planning/phases/16-security-audit-repo-setup/16-PLAN-01.md` | `<username>:<password>` | 1       | Dokumentationsbeispiel in Plan-Datei          | Entfernt durch git-filter-repo                                           |
| `README.md` (Commits 75eea, 13c6f)                            | `<username>:<password>` | 2       | Alte README-Version mit curl-Beispiel         | Entfernt durch git-filter-repo (alte Commits werden umgeschrieben)       |

**Findings in Sourcecode (.ts, .tsx, .js, .json nicht-gitignored):** 0

---

## Manuelle Code-Review

Geprüfte Bereiche: `src/`, `frontend/src/`, `config/config.example.json`, `docker-compose.yml`, `Dockerfile`

| Kategorie                | Geprüfte Dateien             | Befund                                            | Bewertung                                                                                      |
| ------------------------ | ---------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Hardcoded IPs            | `src/__tests__/`             | `192.168.x.x`, `192.168.1.100`, `192.168.178.65` | **Testdaten** — RFC-1918-Adressen in Test-Fixtures, keine echten Netzwerkadressen, kein Risiko |
| Hardcoded IPs            | `frontend/src/` i18n-Dateien | `192.168.1.x`                                     | **Platzhalter-Text** in Hilfetexten, kein echtes Credential                                    |
| Credentials / Passwörter | `src/`, `frontend/src/`      | Keine gefunden                                    | Sauber                                                                                         |
| API-Keys / Tokens        | Alle TypeScript-Quellen      | Keine gefunden                                    | Sauber                                                                                         |
| Private URLs / Pfade     | Alle Quellen                 | Keine privaten Endpunkte oder internen Dienste    | Sauber                                                                                         |

---

## Scope-Abgrenzung (was NICHT geprüft wurde)

- **Runtime-Verhalten:** Laufzeitdaten, Netzwerkkommunikation zur Printer-IP
- **Docker-Image-Inhalt:** Kein Secret wird per Dockerfile baked in — by design
- **config/config.json:** Ausdrücklich gitignored, enthält lokale Testinstanz-Credentials, wird niemals in die Git-History oder das neue Repo gelangen
- **CI-Secret-Scanning:** Kommt in Phase 20 (gitleaks in GitHub Actions)

---

## Ergebnis

**FREIGEGEBEN**

Alle Findings in der Git-History befinden sich ausschließlich in `.planning/`-Dateien (GSD-Workspace) und alten README-Versionen. Diese werden vollständig durch `git-filter-repo` aus der gefilterten History entfernt, bevor das neue Repo `reneleban/sentry-bridge` befüllt wird.

Der Sourcecode (`.ts`, `.tsx`, `.js`, Config-Beispiele) enthält keine echten Credentials, API-Keys oder persönlichen Netzwerkadressen.

Das neue Repo `reneleban/sentry-bridge` erhält eine bereinigte Git-History ohne die gefilterten Pfade (`.planning/`, `.claude/`, `docs/superpowers/`).
