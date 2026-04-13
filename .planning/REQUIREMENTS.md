# Requirements — v1.2.0 SentryBridge Open-Source Release

**Milestone:** v1.2.0 SentryBridge Open-Source Release
**Status:** Active
**Last updated:** 2026-04-13

---

## Active Requirements

### Security Audit

- [ ] **SEC-01:** Scan-Tool (gitleaks/truffleHog) bestätigt keine Secrets in der Git-History des aktuellen Repos
- [ ] **SEC-02:** Sourcecode enthält keine hardcodierten Credentials, persönlichen IPs oder API-Keys
- [ ] **SEC-03:** Freigabe-Checkliste liegt vor — Repo ist nachweislich secrets-frei

### Repo Setup

- [ ] **REPO-01:** Neues GitHub-Repo `reneleban/sentry-bridge` mit MIT LICENSE existiert
- [ ] **REPO-02:** Community-Dateien vorhanden: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- [ ] **REPO-03:** Issue-Templates für Bug-Report und Feature-Request vorhanden
- [ ] **REPO-04:** `.gitignore` korrekt konfiguriert — keine `.planning/`-Inhalte, keine internen GSD-Dateien

### Architektur-Dokumentation (arc42)

- [ ] **ARC-01:** arc42 Kapitel 1–3 vollständig: Einführung, Randbedingungen, Systemkontext
- [ ] **ARC-02:** arc42 Kapitel 4–5 vollständig: Lösungsstrategie, Bausteinsicht
- [ ] **ARC-03:** arc42 Kapitel 6–8 vollständig: Laufzeitsicht, Verteilungssicht, Querschnittskonzepte
- [ ] **ARC-04:** arc42 Kapitel 9–12 vollständig: Entscheidungen (ADRs), Qualitätsziele, Risiken, Glossar

### Systemspezifikation (ISO/IEC 29148)

- [ ] **SPEC-01:** Systemübersicht und Systemkontext dokumentiert
- [ ] **SPEC-02:** Funktionale Anforderungen vollständig und testbar formuliert
- [ ] **SPEC-03:** Nicht-funktionale Anforderungen dokumentiert (Performance, Security, Portability)
- [ ] **SPEC-04:** Schnittstellen dokumentiert: PrusaLink API, Obico WebSocket-Protokoll, eigene REST API

### Testing-Dokumentation (ISO/IEC 29119)

- [ ] **TEST-01:** Teststrategie dokumentiert: Testebenen, Werkzeuge, Coverage-Ziele
- [ ] **TEST-02:** Testkonzept dokumentiert: Unit, Integration, Hardware-UAT Vorgehen
- [ ] **TEST-03:** Wesentliche Testfälle repräsentativ dokumentiert

### User Guide (Diátaxis)

- [ ] **GUIDE-01:** Tutorial — Quickstart: von 0 zum laufenden Container in unter 10 Minuten
- [ ] **GUIDE-02:** How-To — Docker Compose Setup vollständig beschrieben
- [ ] **GUIDE-03:** How-To — Troubleshooting mit häufigen Fehlern und Lösungen
- [ ] **GUIDE-04:** Reference — Alle Konfigurationsparameter vollständig dokumentiert
- [ ] **GUIDE-05:** Reference — Alle REST API-Endpunkte dokumentiert
- [ ] **GUIDE-06:** Explanation — Architektur-Entscheidungen für Anwender verständlich erklärt

### GitHub & CI

- [ ] **CI-01:** GitHub Actions Workflow: `npm run test:all` läuft auf PR und Push to main
- [ ] **CI-02:** GitHub Actions Workflow: Docker-Build-Check (kein Push)
- [ ] **CI-03:** Release-Tag `v1.1.0` mit Release-Notes erstellt
- [ ] **CI-04:** README überarbeitet: CI-Badges, klares Intro, Quickstart-Link zu User Guide

### Release

- [ ] **REL-01:** Finaler gitleaks-Scan auf dem neuen Repo bestanden (keine Secrets)
- [ ] **REL-02:** Repo `reneleban/sentry-bridge` auf GitHub auf Public gesetzt

---

## Future Requirements

- Aktiver Contribution-Prozess (PR-Templates, Release-Automation) — nach erster Public-Phase
- Docker Hub Publish unter neuem Namen `sentry-bridge` — nach Public-Release
- GitHub Discussions aktivieren — nach erster Community-Resonanz

---

## Out of Scope

- Aktiver Community-Aufbau, Marketing, Social Media — kein Fokus dieses Milestones
- GSD-Workflow-Umstellung auf GitHub Issues — separate Initiative
- Multi-Printer, API-Authentifizierung, Layer-Count (#80), Obico Remote File Browser (#81) — eigene Milestones

---

## Traceability

| REQ-ID   | Phase    | Status  |
| -------- | -------- | ------- |
| SEC-01   | Phase 16 | Pending |
| SEC-02   | Phase 16 | Pending |
| SEC-03   | Phase 16 | Pending |
| REPO-01  | Phase 16 | Pending |
| REPO-02  | Phase 16 | Pending |
| REPO-03  | Phase 16 | Pending |
| REPO-04  | Phase 16 | Pending |
| ARC-01   | Phase 17 | Pending |
| ARC-02   | Phase 17 | Pending |
| SPEC-01  | Phase 17 | Pending |
| SPEC-02  | Phase 17 | Pending |
| ARC-03   | Phase 18 | Complete |
| ARC-04   | Phase 18 | Complete |
| SPEC-03  | Phase 18 | Complete |
| SPEC-04  | Phase 18 | Complete |
| TEST-01  | Phase 18 | Complete |
| TEST-02  | Phase 18 | Complete |
| TEST-03  | Phase 18 | Complete |
| GUIDE-01 | Phase 19 | Complete |
| GUIDE-02 | Phase 19 | Pending |
| GUIDE-03 | Phase 19 | Complete |
| GUIDE-04 | Phase 19 | Pending |
| GUIDE-05 | Phase 19 | Pending |
| GUIDE-06 | Phase 19 | Complete |
| CI-01    | Phase 20 | Pending |
| CI-02    | Phase 20 | Pending |
| CI-03    | Phase 20 | Pending |
| CI-04    | Phase 20 | Pending |
| REL-01   | Phase 20 | Pending |
| REL-02   | Phase 20 | Pending |
