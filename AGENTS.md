# Project agent entrypoint: ShipLedger

Read .agents/AI_COLLABORATION_CHARTER.md and .agents/COLLABORATION_PROTOCOL.md.
These are generated policy snapshots; source provenance is .agents/policy-source.json.

At task intake run the workspace collaboration.py status command when available.
Offline, inspect .ai-collaboration/ACTIVE_TASKS and HANDOFFS/open manually.
Record task ownership before writes; inspect Git status and preserve prior changes.
Pin handoffs to commits, require receiver acknowledgement and independent verification.
Keep session evidence in Docs/Logs, one immutable file per material session.

---

## 🏛 Product Boundaries & Rules (기획서 필수 제약)
- **절대 금지 (Anti-goals):**
  - CRA 인증 서비스 표방 금지 (`CRA COMPLIANT ✓` 절대 사용 금지. 오직 `READY`, `REVIEW_REQUIRED`, `INCOMPLETE`만 사용)
  - 새로운 보안 스캐너 개발 금지 (기존 OSV, CycloneDX 등 결과 소비)
  - CI/CD 플랫폼 대체 금지 (GitHub Actions 결과 소비)
  - 프로젝트 관리 기능(Task, Sprint, Board, Roadmap) 구현 금지
  - Chat UI / AI 자의적 합격/불합격 판정 금지 (결정론적 규칙 + 인간 승인)
- **핵심 데이터 원칙:** 고객 소스코드 저장 금지 (메타데이터, 해시, SBOM, 결과만 저장)
- **모드 기본값:** `advisory` (기본 실행 시 빌드를 차단하지 않음. `enforce`일 때만 exit 1)

---

## 🛠 Build & Test Commands
- **Runtime:** Node 24 (`node@24.19.0`, `pnpm@10.5.2` via `mise`)
- **Typecheck:** `pnpm typecheck`
- **Tests:** `pnpm test` (Vitest)
- **Bundle / Build:** `pnpm build` (tsup -> `dist/action/index.js`, `dist/cli/index.js`)
- **CLI Run:** `pnpm cli run` (또는 `node dist/cli/index.js run`)
- **Digest Verify:** `pnpm cli verify <evidence.json>`

---

## 🎯 Current Stage & Next Steps
- **현재 상태:** Phase 0 프로토타입 구현 및 Vitest 15개 테스트 통과, 데모 앱 구축 완료 (Commit `d81ec63`)
- **다음 단계:**
  1. Oruvena Tovi 프로젝트 실전 연동 (`docs/INTEGRATION_TOVI.md` 기반 Dogfooding)
  2. Release Diff 모듈 구현 (`shipledger diff`)
  3. Phase 1 GitHub Marketplace 패키징
