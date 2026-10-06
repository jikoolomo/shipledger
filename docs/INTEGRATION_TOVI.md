# Tovi (Tovi-socialplans) ShipLedger 연동 가이드

Oruvena의 첫 번째 내부 적용 프로젝트인 **Tovi (`Tovi-socialplans`)**에 ShipLedger Release Evidence Action을 연동하기 위한 가이드입니다.

---

## 1. `.shipledger.yml` 설정 생성

Tovi 저장소 루트(`/Users/jikoolomo/Developer/Tovi-socialplans/.shipledger.yml`)에 다음 설정을 배치합니다:

```yaml
schema: 1

product:
  id: tovi
  name: Tovi
  version: "1.0.0"
  manufacturer: Oruvena

profile:
  type: baseline

mode: advisory

evidence:
  sbom:
    path: ./sbom.cdx.json

  tests:
    junit:
      - ./reports/**/*.xml

  artifacts:
    - ./dist/**/*.ipa
    - ./dist/**/*.zip

policy:
  vulnerability:
    block_critical: true
    review_high: true
    review_known_exploited: true

  risk_acceptance:
    max_expiry_days: 30

cloud:
  upload: false
```

---

## 2. GitHub Actions 워크플로우 추가

Tovi 저장소의 `.github/workflows/shipledger-evidence.yml`로 추가합니다:

```yaml
name: Tovi Release Evidence

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:

jobs:
  evidence:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write

    steps:
      - name: Checkout Source
        uses: actions/checkout@v4

      - name: Setup Node 24 & pnpm
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          run_install: false

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Tests (JUnit output)
        run: pnpm test || true

      - name: Generate CycloneDX SBOM
        run: npx @cyclonedx/cyclonedx-npm --output-file ./sbom.cdx.json

      # ShipLedger Release Evidence Action 실행
      - name: ShipLedger Evidence Gate
        uses: oruvena/shipledger@v1
        with:
          config: .shipledger.yml

      # 산출된 증거 번들 보관
      - name: Upload Evidence Bundle
        uses: actions/upload-artifact@v4
        with:
          name: tovi-release-evidence
          path: |
            shipledger-evidence.json
            shipledger-evidence.md
```

---

## 3. 로컬 사전 점검 (CLI)

Tovi 디렉토리에서 ShipLedger CLI를 통해 CI 실행 전 미리 증거 번들 생성을 시뮬레이션할 수 있습니다:

```bash
# 1. Tovi SBOM 추출
npx @cyclonedx/cyclonedx-npm --output-file ./sbom.cdx.json

# 2. ShipLedger 증거 수집 및 정책 평가 실행
node /Users/jikoolomo/Developer/ShipLedger/dist/cli/index.js run

# 3. 생성된 증거 다이제스트 무결성 검증
node /Users/jikoolomo/Developer/ShipLedger/dist/cli/index.js verify shipledger-evidence.json
```
