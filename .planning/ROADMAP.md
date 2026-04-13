# Roadmap: obico-prusalink-bridge

## Milestones

- [x] **Milestone 1: Working Bridge** — Phases 1-4 (shipped)
- [x] **Milestone 2: Production-Ready** — Phases 5-11 (shipped 2026-04-07) — [Archive](milestones/v1.0-ROADMAP.md)
- [x] **Milestone 3: Print & Files (v1.1.0)** — Phases 12-15 (shipped 2026-04-09) — [Archive](milestones/v1.1.0-ROADMAP.md)
- [ ] **Milestone 4: SentryBridge Open-Source Release (v1.2.0)** — Phases 16-20

---

## Phases

<details>
<summary>✅ Milestone 1: Working Bridge (Phases 1-4) — SHIPPED</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed
- [x] Phase 2: PrusaLink + Camera (3/3 plans) — completed
- [x] Phase 3: Obico Agent + Resilience (3/3 plans) — completed
- [x] Phase 4: Setup Wizard + Dashboard (3/3 plans) — completed

</details>

<details>
<summary>✅ Milestone 2: Production-Ready (Phases 5-11) — SHIPPED 2026-04-07</summary>

- [x] Phase 5: Bug Fixes (2/2 plans) — completed 2026-04-07
- [x] Phase 6: Bridge Lifecycle (3/3 plans) — completed 2026-04-07
- [x] Phase 7: Graceful Shutdown (2/2 plans) — completed 2026-04-07
- [x] Phase 8: Dashboard Health UI (3/3 plans) — completed 2026-04-07
- [x] Phase 9: Documentation (2/2 plans) — completed 2026-04-07
- [x] Phase 10: Resilience Completion (2/2 plans) — completed 2026-04-07
- [x] Phase 11: Documentation Cleanup (1/1 plan) — completed 2026-04-07

</details>

<details>
<summary>✅ Milestone 3: Print & Files v1.1.0 (Phases 12-15) — SHIPPED 2026-04-09</summary>

- [x] Phase 12: PrusaLink Client Extensions (1/1 plan) — completed 2026-04-07
- [x] Phase 13: Obico Agent Extension (2/2 plans) — completed 2026-04-07
- [x] Phase 14: Express File Routes (3/3 plans) — completed 2026-04-08
- [x] Phase 15: Dashboard File Browser + Bug Fixes (4/4 plans) — completed 2026-04-09

See [milestones/v1.1.0-ROADMAP.md](milestones/v1.1.0-ROADMAP.md) for full phase details.

</details>

### Milestone 4: SentryBridge Open-Source Release (v1.2.0) — Phases 16-20

- [x] **Phase 16: Security Audit + Repo Setup** — Codebase bereinigt, neues Repo aufgesetzt, Freigabe dokumentiert
- [x] **Phase 17: Architektur-Doku Teil 1 + Spec Grundlagen** — arc42 Kap. 1-5, Systemübersicht und funktionale Anforderungen
- [x] **Phase 18: Architektur-Doku Teil 2 + Spec + Testing** — arc42 Kap. 6-12, NFRs, Interfaces, Teststrategie und -konzept (completed 2026-04-13)
- [x] **Phase 19: User Guide (Diátaxis)** — Vollständiger User Guide: Tutorial, How-Tos, Reference, Explanation (completed 2026-04-13)
- [x] **Phase 20: CI, Badges + Public Release** — GitHub Actions, README-Überarbeitung, Release-Tag, Repo public (completed 2026-04-13)

---

## Phase Details

### Phase 16: Security Audit + Repo Setup

**Goal**: Codebase ist nachweislich secrets-frei und das neue public Repo ist aufgesetzt und korrekt konfiguriert
**Depends on**: Nothing (first phase of milestone)
**Requirements**: SEC-01, SEC-02, SEC-03, REPO-01, REPO-02, REPO-03, REPO-04
**Success Criteria** (what must be TRUE):

1. gitleaks und/oder truffleHog laufen fehlerfrei auf der Git-History und melden keine Secrets
2. Manuelle Code-Review bestätigt: keine hardcodierten IPs, Credentials oder API-Keys im Sourcecode
3. Eine Freigabe-Checkliste liegt ausgefüllt vor (SEC-03) und dokumentiert das Ergebnis
4. Das GitHub-Repo `reneleban/sentry-bridge` existiert mit MIT LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md und Issue-Templates für Bug und Feature
5. `.gitignore` schließt `.planning/` und GSD-interne Dateien korrekt aus
   **Plans**: TBD

### Phase 17: Architektur-Doku Teil 1 + Spec Grundlagen

**Goal**: Die ersten fünf arc42-Kapitel sind vollständig und die Systemspezifikation erfasst Kontext und funktionale Anforderungen
**Depends on**: Phase 16
**Requirements**: ARC-01, ARC-02, SPEC-01, SPEC-02
**Success Criteria** (what must be TRUE):

1. arc42 Kap. 1-3 (Einführung, Randbedingungen, Systemkontext) sind nachlesbar und decken alle bekannten Constraints ab
2. arc42 Kap. 4-5 (Lösungsstrategie, Bausteinsicht) beschreiben die vier Kernmodule und deren Zusammenspiel verständlich
3. Die Systemspezifikation (SPEC-01) enthält Systemübersicht und Systemkontext, sodass ein Leser ohne Vorwissen versteht, was SentryBridge ist
4. Die funktionalen Anforderungen (SPEC-02) sind testbar formuliert (jede REQ hat ein messbares Kriterium)

**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — arc42 index + Chapters 1–3 + spec index (ARC-01)
- [x] 17-02-PLAN.md — arc42 Chapters 4–5 + spec overview + functional requirements (ARC-02, SPEC-01, SPEC-02)

### Phase 18: Architektur-Doku Teil 2 + Spec komplett + Testing-Doku

**Goal**: arc42 ist vollständig, alle Schnittstellen und NFRs sind dokumentiert, und die Testing-Dokumentation beschreibt Strategie, Konzept und Testfälle
**Depends on**: Phase 17
**Requirements**: ARC-03, ARC-04, SPEC-03, SPEC-04, TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):

1. arc42 Kap. 6-8 (Laufzeitsicht, Verteilungssicht, Querschnittskonzepte) beschreiben relevante Szenarien (Pairing, Frame-Loop, Reconnect)
2. arc42 Kap. 9-12 (ADRs, Qualitätsziele, Risiken, Glossar) sind vollständig — alle bekannten Key Decisions aus PROJECT.md sind als ADRs erfasst
3. SPEC-03 dokumentiert NFRs (Performance: Frame-Latenz, Security: LAN-only, Portability: amd64/arm64)
4. SPEC-04 beschreibt alle drei Schnittstellen vollständig: PrusaLink HTTP Digest API, Obico WebSocket-Protokoll, eigene REST API
5. TEST-01 bis TEST-03 sind vorhanden und beschreiben Teststrategie, Unit/Integration/UAT-Konzept und wesentliche Testfälle
   **Plans**: TBD

### Phase 19: User Guide (Diátaxis)

**Goal**: Ein vollständiger User Guide nach dem Diátaxis-Framework ermöglicht es jemandem ohne Vorwissen, SentryBridge in unter 10 Minuten zum Laufen zu bringen
**Depends on**: Phase 18
**Requirements**: GUIDE-01, GUIDE-02, GUIDE-03, GUIDE-04, GUIDE-05, GUIDE-06
**Success Criteria** (what must be TRUE):

1. Das Quickstart-Tutorial (GUIDE-01) führt von 0 zum laufenden Container in unter 10 Minuten — alle Schritte sind reproduzierbar
2. Die Docker Compose How-To (GUIDE-02) deckt alle notwendigen Konfigurationsschritte vollständig ab
3. Die Troubleshooting How-To (GUIDE-03) enthält die häufigsten Fehler aus v1.0/v1.1.0 Hardware-UAT mit Lösungen
4. Die Konfigurationsreferenz (GUIDE-04) dokumentiert jeden Parameter aus `config.json` mit Typ, Default und Beispiel
5. Die API-Referenz (GUIDE-05) listet alle REST-Endpunkte mit Methode, Pfad, Request/Response-Beispiel
6. Die Explanation (GUIDE-06) erklärt, warum SentryBridge so gebaut ist wie es ist — für Nutzer, die mehr verstehen wollen
   **Plans**: TBD
   **UI hint**: yes

### Phase 20: CI, Badges + Public Release

**Goal**: Das neue Repo hat funktionierende CI-Workflows, ein professionelles README und ist öffentlich erreichbar
**Depends on**: Phase 19
**Requirements**: CI-01, CI-02, CI-03, CI-04, REL-01, REL-02
**Success Criteria** (what must be TRUE):

1. GitHub Actions führt `npm run test:all` auf PR und Push to main aus und zeigt den Status korrekt an
2. GitHub Actions prüft den Docker-Build (kein Push) und schlägt an bei Build-Fehlern
3. Release-Tag `v1.1.0` mit Release-Notes existiert auf dem neuen Repo
4. Das README enthält CI-Badges, ein klares Intro und einen direkten Link zum Quickstart-Tutorial
5. Ein finaler gitleaks-Scan auf dem neuen Repo besteht ohne Findings
6. Das Repo `reneleban/sentry-bridge` ist auf GitHub auf Public gesetzt und erreichbar
   **Plans**: TBD

---

## Progress

| Phase                                         | Milestone | Plans Complete | Status      | Completed  |
| --------------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Foundation                                 | M1        | 3/3            | Complete    | shipped    |
| 2. PrusaLink + Camera                         | M1        | 3/3            | Complete    | shipped    |
| 3. Obico Agent                                | M1        | 3/3            | Complete    | shipped    |
| 4. Setup Wizard                               | M1        | 3/3            | Complete    | shipped    |
| 5. Bug Fixes                                  | M2        | 2/2            | Complete    | 2026-04-07 |
| 6. Bridge Lifecycle                           | M2        | 3/3            | Complete    | 2026-04-07 |
| 7. Graceful Shutdown                          | M2        | 2/2            | Complete    | 2026-04-07 |
| 8. Dashboard Health UI                        | M2        | 3/3            | Complete    | 2026-04-07 |
| 9. Documentation                              | M2        | 2/2            | Complete    | 2026-04-07 |
| 10. Resilience Completion                     | M2        | 2/2            | Complete    | 2026-04-07 |
| 11. Documentation Cleanup                     | M2        | 1/1            | Complete    | 2026-04-07 |
| 12. PrusaLink Client Ext.                     | M3        | 1/1            | Complete    | 2026-04-07 |
| 13. Obico Agent Extension                     | M3        | 2/2            | Complete    | 2026-04-07 |
| 14. Express File Routes                       | M3        | 3/3            | Complete    | 2026-04-08 |
| 15. Dashboard File Browser                    | M3        | 4/4            | Complete    | 2026-04-09 |
| 16. Security Audit + Repo Setup               | M4        | 1/1            | Complete    | 2026-04-13 |
| 17. Architektur-Doku Teil 1 + Spec Grundlagen | M4        | 2/2            | Complete    | 2026-04-13 |
| 18. Architektur-Doku Teil 2 + Spec + Testing  | M4        | 3/3 | Complete   | 2026-04-13 |
| 19. User Guide (Diátaxis)                     | M4        | 3/3 | Complete   | 2026-04-13 |
| 20. CI, Badges + Public Release               | M4        | 2/2 | Complete   | 2026-04-13 |
