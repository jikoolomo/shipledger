# Oruvena ShipLedger

> **Every release leaves evidence.**

ShipLedger는 소프트웨어가 릴리즈될 때마다
**무엇이 배포되었고 → 무엇으로 구성되었으며 → 어떤 테스트와 보안 상태를 통과했고 → 어떤 위험이 발견되었으며 → 어떤 판단을 거쳐 출시되었는지**
자동으로 수집하고 검증 가능한 Release Evidence로 남기는 시스템입니다.

---

## 📌 문서 및 연동 가이드
- **제품 전체 기획 및 사양서**: [docs/SPEC.md](docs/SPEC.md)
- **Tovi 릴리즈 연동 가이드**: [docs/INTEGRATION_TOVI.md](docs/INTEGRATION_TOVI.md)
- **데모 예제 앱**: [examples/demo-node-app](examples/demo-node-app)

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
   - Evidence 수집, 유효성 검증, Deterministic Policy 평가, Canonical JSON/Digest 생성, GitHub Summary 출력
2. **Layer B — ShipLedger Cloud (유료 SaaS)**
   - Next.js, PostgreSQL, Drizzle ORM
   - 증거 장기 보관(Vault), Release Diff, 취약점 상시 모니터링, CRA 인시던트 워크스페이스

---

## 🚀 빠른 시작 (GitHub Action)

저장소의 릴리즈 워크플로우에 다음 단계를 추가합니다:

```yaml
- uses: oruvena/shipledger@v1
  with:
    config: .shipledger.yml
```

### `.shipledger.yml` 예시

```yaml
schema: 1

product:
  id: my-product
  name: My Product
  version: "1.0.0"

profile:
  type: baseline # baseline 또는 cra-readiness

mode: advisory   # 기본 advisory (빌드 차단 안 함), enforce (게이트 차단)

evidence:
  sbom:
    path: ./sbom.cdx.json
  tests:
    junit:
      - ./reports/**/*.xml
  artifacts:
    - ./dist/**/*.zip

policy:
  vulnerability:
    block_critical: true
    review_high: true
```

---

## 💻 로컬 CLI 사용법

```bash
# 의존성 설치 및 빌드
pnpm install
pnpm build

# 증거 수집 및 정책 평가 실행
pnpm cli run

# 증거 번들 암호학적 무결성 검증 (Digest 검증)
pnpm cli verify shipledger-evidence.json

# 테스트 슈트 실행 (Vitest)
pnpm test
```

---

## 🎯 Phase 0 (완료) & 다음 단계
- [x] Schema & Canonical JSON SHA-256 Digest 엔진 구현
- [x] CycloneDX & SPDX SBOM, JUnit XML, Artifact 수집기 구현
- [x] Deterministic Policy Engine (5대 시나리오 검증, `COMPLIANT` 상태 배제)
- [x] OSV Batch 쿼리 및 Fail-safe 폴백 구현
- [x] GitHub Step Summary Markdown 생성기 구현
- [x] GitHub Action (`action.yml`) 및 CLI (`shipledger`) 단일 번들 패키징
- [x] 로컬 Project OS (`projects.toml`) 등록 및 연계 확인
- [ ] Oruvena Tovi 저장소 실전 배포 및 Dogfooding
