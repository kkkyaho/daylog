# 검증 결과

검증일: 2026-09-04

## 완료한 검증

| 검사 | 결과 | 범위 |
|---|---|---|
| `npm test` | 7개 테스트 통과 | 도메인 6개 + DB 통합 테스트 1개(다수 권한/제약 assertion) |
| `npm run typecheck` | 통과 | TypeScript strict 검사 |
| `npm run build` | 통과 | Next.js 16.3.4 프로덕션 빌드, 최종 코드 기준 |
| DB migration | 통과 | PGlite PostgreSQL 엔진에 001_initial.sql 적용 |
| DB 소유권 | 통과 | A가 생성/수정한 7개 테이블 데이터에 B가 조회/수정/삭제 불가 |
| DB 비로그인 | 통과 | anon 역할은 7개 테이블 조회 불가 |
| DB 불법 입력 | 통과 | user_id 변경, 타인 루틴 완료, 과거 완료 삽입, 중복 요일, 역전 일정, javascript URL, 빈 위젯 설정 차단 |
| 루틴 일관성 | 통과 | 당일 중복 완료 1행 유지, 루틴 삭제 시 이력 cascade |
| 서울 날짜 | 통과 | UTC 15시에서 날짜 전환, 요일·조회 구간·편집 시간 변환 |

로컬 검증 환경은 Node.js 24.19.0, TypeScript 5.9.3이며 GitHub Actions는 Node 22로 구성했다. Node 22 환경에서 CI가 실제 실행된 것은 아니다. 정확한 패키지 버전은 package-lock.json을 기준으로 한다.

최초 테스트 명령은 tsx CLI의 IPC 소켓이 현재 환경에서 허용되지 않아 실행되지 않았다. 테스트 명령을 `node --import tsx --test`로 수정해 동일한 테스트를 정상 실행했다. 앱 설계·기능에는 영향이 없다.

## 아직 검증하지 못한 범위

- 실제 Supabase 프로젝트: 스키마 적용, PostgREST 관계 조회, publishable key 설정, 이메일 인증/복구, 쿠키 갱신과 만료 세션
- 실제 브라우저: 클릭·키보드·모바일 레이아웃·200% 확대·화면 이동·저장 후 UI 갱신
- Vercel 운영 배포, GitHub 원격 저장소 연결 및 실제 CI 실행
- 다른 기기에서 재로그인했을 때 데이터/위젯 설정 유지

RLS 테스트는 실제 PostgreSQL 엔진에서 실행했지만 Supabase Auth 스키마와 역할은 테스트에서 최소 형태로 재현했다. 운영 Supabase와 HTTP API 통합이 검증된 것으로 해석하지 않는다. Wireframe PNG는 설계 배치도이며 브라우저 검증 결과가 아니다.

## 구현 상태

| 요구사항 | 소스 구현 | 실서비스 검증 |
|---|---|---|
| Auth 로그인/가입/복구 | 완료 | 계정 연결 후 필요 |
| Dashboard / 일정 / Todo | 완료 | DB·브라우저 통합 확인 필요 |
| Routine / Memo / Bookmark | 완료 | DB·브라우저 통합 확인 필요 |
| 위젯 표시/순서 | 완료 | 실제 저장/재조회 확인 필요 |
| 반응형 UI | CSS 구현 완료 | 실기기/브라우저 확인 필요 |
| 확장 구조·개발 계획 | 설계 문서 완료 | 기능 추가 시 migration/결정 기록 유지 |

## 이어서 진행할 작업

1. 사용할 Supabase 프로젝트를 만들고 README대로 migration·Auth·환경변수를 설정한다.
2. 실제 계정 두 개로 데이터 격리와 CRUD를 검증한다.
3. GitHub 저장소에 push하고 CI를 확인한다.
4. Vercel에서 Import 후 환경변수와 Supabase 인증 주소를 맞추고 배포한다.
5. 배포된 주소에서 인증·전체 CRUD·반응형 화면을 확인한다.

운영 연결 전까지 이 결과물은 **검증된 로컬 소스와 설계 패키지**이며 배포 완료된 서비스가 아니다.
