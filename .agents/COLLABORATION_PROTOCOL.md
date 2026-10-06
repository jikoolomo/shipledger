<!-- Generated from Developer/.agents/COLLABORATION_PROTOCOL.md at 771155f3e9a1353dbf289748664aecdd9d9368e1; edit the committed shared source, then sync. -->

# Collaboration protocol

이 문서가 공통 작업 소유권·수신확인·lease·TTL·severity의 정본이다. 프로젝트
AGENTS.md는 제품 권한, 게이트, 검증 명령과 기존 기록 위치를 정의한다.

## 시작과 새 프로젝트

Developer 루트 AGENTS.md를 읽은 에이전트는 프로젝트의 첫 실제 작업 전에
python3 /Users/jikoolomo/Developer/.agents/scripts/collaboration.py status <repo>를
실행한다. 이 점검은 읽기 전용이며 실제 Git 루트, 상속 진입점, 유효 claim,
만료 lease, 미수신 handoff와 정본 사본의 변경을 보여 준다.

새 Git 저장소에 AGENTS.md와 기존 협업 기록 방식이 모두 없으면
python3 /Users/jikoolomo/Developer/.agents/scripts/collaboration.py init <repo>로
작은 프로젝트 진입점·manifest·빈 coordination 폴더를 만든다. 승인된 프로젝트
작업에 포함되는 초기화다. 기존 프로젝트 지침·단일 handoff·작업 원장을 덮어쓰거나
이전하지 않는다. 프로젝트 생성 작업은 이 초기화 또는 기존 방식 확인까지 끝낸다.
진입점을 읽고 명령을 실행하는 것이 적용 경로이며, 별도 daemon이 실행되는 것은 아니다.

## 소유권과 인계

- 로컬 lease owner는 codex/claude/antigravity/human, 역할은 think/build/verify다.
  quota의 존재만으로 이 세 actor를 제외하지 않는다. Jules/Manus는 로컬 claim을 만들지 않는다.
- 프로젝트의 task 원장 또는 ACTIVE_TASKS/<task-id>.md로 쓰기 경로를 먼저 예약한다.
  lease 기본값은 4시간이다. 장기 작업자는 만료 전에 갱신한다.
- 만료된 lease는 새 쓰기를 승인하지 않는다. 승계자는 dirty diff와 열린 패킷을
  확인하고 별도 새 claim을 만든다. 만료 기록이 있어도 무관한 경로의 작업은 진행한다.
- 기록 정리는 기존 owner 또는 명시적으로 승계한 에이전트가 수행하고 새 로그에
  사유를 남긴다. 만료 시간만으로 코드를 되돌리거나 완료·검증 성공을 기록하지 않는다.
- 새 handoff의 status는 requested → accepted/rejected → closed다. ack는 수신자가
  actor/at/decision/reason을 기록한다. 미수신 상태에서 sender가 작업을 소유한다.
- 미수신 TTL 기본값은 24시간이다. 시작 점검이 초과 건을 표시한다. sender가 경로와
  SHA를 확인해 재발송·재인계 또는 차단 기록을 만든다. 권한 문제·해결 불가 충돌만
  사용자에게 올린다. accepted 작업에는 미수신 TTL로 자동 종료를 적용하지 않는다.
- 수신 전 패킷은 HANDOFFS/open/, 종료 패킷은 HANDOFFS/done/에 둔다. legacy open
  status와 closed/ 폴더는 읽을 수 있지만 새 directory 프로토콜 기록에는 위 값을 쓴다.
  Legacy 날짜에 정확한 시각·시간대가 없으면 TTL을 추측하지 않고 경고만 기록한다.
  기존 프로젝트별 원장 방식에는 별도 파일을 강제로 추가하지 않는다.
- design→build는 base_sha를 고정하고 head_sha는 null일 수 있다. build→verify는
  base_sha와 head_sha 모두 필요하다. 아직 커밋되지 않은 diff를 완료된 SHA 검증으로
  부르지 않는다. independent VERIFY를 준비해도 실제 발송 수단이 없으면 ready,
  not dispatched라고 기록한다.

## 결과와 심각도

outcome: COMPLETED | BLOCKED | HANDED_OFF | VERIFICATION_FAILED.
근거에는 actor/role, repository, SHA 범위, 정확한 검증 명령·종료코드, 남은 위험과
다음 작업을 포함한다. 미실행·중단·환경 실패를 통과로 기록하지 않는다.

| Review | Relay | 처리 |
|---|---|---|
| P0/P1 | blocker | 데이터 손실·권한 위반·계약 파기·중대한 기능/보안 결함. 수정·재검증 전 수용 차단 |
| P2 | major | 구체적인 일반 결함. 수용기준 실패면 수정·재검증, 범위 밖이면 owner가 있는 후속 작업 |
| P3 | minor | 유지보수·가독성 문제. 근거와 필요 조치 기록 |

심각도 표기는 자동 merge 권한을 주지 않는다. 검증자는 기본적으로 보고하고,
수정으로 역할을 바꾸면 그 결과는 다른 검증자가 확인한다.

## 정본과 격리 실행

공통 정본은 Developer/.agents의 Git에 있다. workspace의 AGENTS.md, CLAUDE.md,
GEMINI.md는 이 저장소 entrypoints/의 연결 파일이다. 원격·격리 프로젝트는
scripts/sync_policy.py <repo>가 생성한 charter/protocol 사본과 policy-source.json을
Git에 보관한다. 사본에는 정본 commit과 SHA-256이 고정되며 status 점검이 drift를
검사한다. 로컬 프로젝트 정책은 별도 supplement로 유지한다.
