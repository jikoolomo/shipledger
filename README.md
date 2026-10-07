# Oruvena ShipLedger

> **Every release leaves evidence.**

ShipLedger는 소프트웨어가 릴리즈될 때마다:
**무엇이 배포되었고 → 무엇으로 구성되었으며 → 어떤 테스트와 보안 상태를 통과했고 → 어떤 위험이 발견되었으며 → 어떤 판단을 거쳐 출시되었는지**
자동으로 수집하고 검증 가능한 **Release Evidence(릴리즈 증거)**로 남기는 인프라 시스템입니다.

CRA(EU Cyber Resilience Act)는 ShipLedger의 첫 번째 시장 진입점(Distribution Wedge)이며, 장기적으로는 AI Coding Agent 시대에 소프트웨어가 프로덕션으로 나가기 전 반드시 통과하는 **Evidence & Trust Layer**를 지향합니다.

---

## 📌 문서 및 연동 가이드
- **제품 전체 기획 및 사양서**: [docs/SPEC.md](docs/SPEC.md)
- **Phase 2 Cloud SaaS 설계서**: [docs/DESIGN_PHASE2_CLOUD.md](docs/DESIGN_PHASE2_CLOUD.md)
- **Tovi 릴리즈 연동 가이드 (Dogfooding)**: [docs/INTEGRATION_TOVI.md](docs/INTEGRATION_TOVI.md)
- **참조 데모 앱**: [examples/demo-node-app](examples/demo-node-app)

---

## 🏛 제품 개요
- **Product Type**: Developer Tool / Release Evidence Infrastructure / CRA Readiness Layer
- **Company**: Oruvena
- **Working URL**: `shipledger.oruvena.com`
- **Public GitHub**: `github.com/jikoolomo/shipledger`
- **Target Runtime**: Node 24 (`node24`), TypeScript, pnpm

---

## 🏗 아키텍처 (2-Layer)

```text
       Developer / CI Pipeline (GitHub Actions)
                          │
         ┌────────────────▼────────────────┐
         │   Layer A: ShipLedger Open      │  (무료 / 오픈소스 Engine)
         │   • GitHub Action / CLI         │
         │   • Deterministic Policy Engine │
         │   • RFC 8785 Digest Generator   │
         └────────────────┬────────────────┘
                          │ (OIDC 무패스워드 인증)
         ┌────────────────▼────────────────┐
         │   Layer B: ShipLedger Cloud     │  (상용 SaaS / On-Premise)
         │   • Next.js 16 App Router UI    │
         │   • PostgreSQL & Drizzle ORM    │
         │   • Continuous OSV Monitoring   │
         │   • CRA Article 14 Incident     │
         └─────────────────────────────────┘
```

1. **Layer A — ShipLedger Open Engine (오픈소스)**
   - GitHub Action (`action.yml`) 및 CLI (`shipledger`)
   - CycloneDX 1.5 & SPDX 2.3 SBOM 파싱, JUnit XML 테스트 결과 파싱, 아티팩트 SHA-256 해시 수집
   - OSV Batch API 기반 취약점 조회 및 Fail-safe 폴백
   - RFC 8785 Canonical JSON 직렬화 & SHA-256 무결성 Digest 계산
   - Release Diff 엔진 (`shipledger diff`)
   - GitHub Actions Step Summary 자동 렌더링

2. **Layer B — ShipLedger Cloud (SaaS & REST API)**
   - Next.js 16 App Router 5대 코어 화면 (`/`, `/repositories`, `/releases/:id`, `/findings`, `/settings`)
   - GitHub Actions OIDC JWT 기반 무패스워드 인제스천 파이프라인
   - Drizzle ORM PostgreSQL 코어 테이블 (20개 테이블 스키마)
   - 지속적 취약점 모니터링 엔진 (`shipledger monitor`)
   - CRA Article 14 Incident & Audit Dossier 생성기 (`shipledger export`)
   - GitHub App Webhook 보안 수신 파이프라인 (HMAC-SHA256 timing-safe 검증)

---

## 🏛 제품 원칙 및 필수 제약 (Anti-Goals)
- ❌ **CRA 인증 서비스 표방 절대 금지:** `CRA COMPLIANT ✓` 표기는 일체 사용하지 않으며, 오직 `READY`, `REVIEW_REQUIRED`, `INCOMPLETE`만 사용합니다.
- ❌ **보안 스캐너 개발 금지:** 독자 스캐너를 만들지 않고 OSV, CycloneDX 등 검증된 결과를 소비합니다.
- ❌ **CI/CD 플랫폼 대체 금지:** GitHub Actions 결과를 소비하며 파이프라인을 대체하지 않습니다.
- ❌ **고객 소스코드 저장 절대 금지:** 클라우드에는 메타데이터, 파일 해시, SBOM, 진단 결과만 저장합니다.
- ❌ **프로젝트 관리 기능 및 Chat UI 배제:** Task/Sprint 관리나 불필요한 AI 대화창 대신 정형 데이터와 검증 화면을 제공합니다.
- 🛡️ **모드 기본값:** `advisory` (기본 실행 시 빌드를 차단하지 않으며, 명시적으로 `enforce`일 때만 exit code 1로 차단).

---

## 🚀 빠른 시작 (GitHub Actions)

저장소의 릴리즈 또는 CI 워크플로우에 다음 단계를 추가합니다:

```yaml
name: Release Pipeline
on:
  release:
    types: [published]

permissions:
  contents: read
  id-token: write  # ShipLedger Cloud OIDC 무패스워드 업로드에 필요

jobs:
  shipledger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build & Generate SBOM
        run: |
          pnpm build
          pnpm cdxgen -o ./sbom.cdx.json

      - name: Run ShipLedger Gatekeeper
        uses: jikoolomo/shipledger@v1
        with:
          config: .shipledger.yml
```

### `.shipledger.yml` 설정 예시

```yaml
schema: 1

product:
  id: tobi
  name: Tobi
  version: "0.8.3"
  manufacturer: Oruvena

profile:
  type: cra-readiness # baseline 또는 cra-readiness

mode: advisory        # 기본 advisory (권고), enforce (게이트 차단)

evidence:
  sbom:
    path: ./sbom.cdx.json
  tests:
    junit:
      - ./reports/**/*.xml
  artifacts:
    - ./dist/**/*.zip
    - ./dist/**/*.dmg

policy:
  vulnerability:
    block_critical: true
    review_high: true
    review_known_exploited: true
  risk_acceptance:
    max_expiry_days: 30

cra:
  applicability: IN_SCOPE
  security_contact: security@oruvena.com

cloud:
  upload: true
```

---

## 💻 로컬 CLI 사용법

```bash
# 1. 의존성 설치 및 번들 빌드
pnpm install
pnpm build

# 2. 증거 수집 및 정책 평가 실행
pnpm cli run -c .shipledger.yml

# 3. 증거 번들 암호학적 무결성 검증 (Digest 확인)
pnpm cli verify shipledger-evidence.json

# 4. 이전 릴리즈 대비 변경사항 비교 (Release Diff)
pnpm cli diff prev-evidence.json curr-evidence.json

# 5. 지속적 취약점 모니터링 (SBOM 컴포넌트 재스캔)
pnpm cli monitor shipledger-evidence.json

# 6. EU CRA Article 14 사건 감사 서류 내보내기 (24h/72h 타이머 계산)
pnpm cli export shipledger-evidence.json \
  --finding CVE-2024-38526 \
  --type ACTIVELY_EXPLOITED_VULNERABILITY \
  --awareness 2026-10-07T10:00:00Z \
  --confirmed-by sec-lead@oruvena.com
```

---

## 🐳 로컬 Cloud & Docker 개발 환경

ShipLedger Cloud(Next.js App Router + PostgreSQL)를 로컬에서 즉시 구동할 수 있습니다:

```bash
# 1. 환경변수 템플릿 복사
cp .env.example .env

# 2. PostgreSQL 16 컨테이너 구동
docker compose up -d postgres

# 3. 데이터베이스 DDL 마이그레이션 푸시 (Drizzle Kit)
pnpm db:push

# 4. Cloud 프론트엔드 개발 서버 시작 (http://localhost:3000)
pnpm web:dev

# 또는 전체 Docker 스택 실행:
docker compose up --build
```

---

## 🧪 테스트 및 품질 검증

```bash
# Vitest 테스트 스위트 (11개 파일, 59개 테스트 전수 통과)
pnpm test

# TypeScript 엄격 모드 타입체크
pnpm typecheck

# Open Engine & Action 단일 번들 빌드 (tsup)
pnpm build

# Next.js 16 App Router 프로덕션 빌드
pnpm web:build
```

---

## 📅 Roadmap & 진행 현황
- [x] **Phase 0 — Open Engine Prototype**
  - Canonical JSON 무결성 엔진, CycloneDX/SPDX 파서, JUnit 파서, OSV 배치 클라이언트, Action CJS 번들
- [x] **Phase 1 — Release Diff & Dogfooding & Packaging**
  - Release Diff CLI, Tovi 실제 994개 컴포넌트 Dogfooding 검증, GitHub Marketplace 패키징 (`SECURITY.md`, Issue Forms, PR Template)
- [x] **Phase 2 — Cloud SaaS Foundation & Ingestion API**
  - Drizzle ORM PostgreSQL 20개 테이블 스키마, Next.js 16 App Router 5대 화면 UI, OIDC JWT 무패스워드 인제스천, REST API 엔드포인트
- [x] **Phase 3 — Continuous Monitoring & CRA Incident Workspace**
  - SBOM 컴포넌트 지속 재스캔 모니터링 엔진, CRA Article 14 24h/72h 규제 타이머 계산, SRP 감사 Dossier 생성기, GitHub Webhook 보안 수신부, Docker Compose 인프라
- [ ] **Phase 4 — Enterprise Multi-Tenant & SLA Monitoring**
  - 조직별 RBAC 권한 분리, S3 객체 스토리지 연동, 상용 Webhook 알림(Slack/PagerDuty) 연계

---

## 📄 License

Apache-2.0 &copy; Oruvena
