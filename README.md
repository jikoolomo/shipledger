# Oruvena ShipLedger

> **Every release leaves evidence.**

ShipLedger는 소프트웨어가 릴리즈될 때마다
**무엇이 배포되었고 → 무엇으로 구성되었으며 → 어떤 테스트와 보안 상태를 통과했고 → 어떤 위험이 발견되었으며 → 어떤 판단을 거쳐 출시되었는지**
자동으로 수집하고 검증 가능한 Release Evidence로 남기는 시스템입니다.

---

## 📌 문서 링크
- **제품 전체 기획 및 사양서**: [docs/SPEC.md](docs/SPEC.md)

---

## 🏛 제품 개요
- **Product Type**: Developer Tool / Release Evidence Infrastructure / CRA Readiness Layer
- **Company**: Oruvena
- **Working URL**: `shipledger.oruvena.com`
- **Public GitHub**: `github.com/oruvena/shipledger`
- **First Market Wedge**: EU Cyber Resilience Act (CRA)

---

## 🏗 핵심 구조 (2-Layer)
1. **Layer A — ShipLedger Open Engine (무료/오픈소스)**
   - GitHub Action & CLI (`TypeScript`, `Node 24`, `pnpm`)
   - Evidence 수집, 유효성 검증, Policy 평가, Canonical JSON/Digest 생성, GitHub Summary 출력
2. **Layer B — ShipLedger Cloud (유료 SaaS)**
   - Next.js, PostgreSQL, Drizzle ORM
   - 증거 장기 보관(Vault), Release Diff, 취약점 상시 모니터링, CRA 인시던트 워크스페이스

---

## 🎯 Phase 0 (현재 단계)
- Cloud/대시보드/결제 제외
- 단일 Oruvena 저장소(예: Tovi)에서 실행되는 GitHub Action 프로토타입 구현
- `shipledger-evidence.json` 및 GitHub Summary 생성 검증
