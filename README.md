# Daylog · 개인생활 대시보드

Next.js App Router + React + TypeScript + Supabase PostgreSQL/Auth. Vercel 배포를 전제로 한 개인생활 관리 MVP입니다. 별도 Spring Boot 서버는 없습니다.

## 먼저 읽기

1. [1~10단계 설계서](docs/DESIGN.md)
2. [화면 Wireframe](docs/dashboard-wireframe.svg)
3. [검증 결과 및 남은 작업](docs/VALIDATION.md)

설계 → 구현 순으로 작성했습니다. 설계 변경은 `docs/DESIGN.md`의 결정 변경 기록에 사유·영향을 남깁니다. 모든 기본 기능의 소스가 포함되어 있지만 사용자 소유 Supabase 연결·이메일 인증·GitHub 원격 저장소·Vercel 실배포는 별도로 완료해야 합니다.

## 구현 기능

- 이메일·비밀번호 가입/로그인/로그아웃, 이메일 인증, 비밀번호 재설정
- 일정 CRUD와 오늘 구간 조회, Todo 우선순위·마감일·완료 관리
- 반복 요일과 시작일을 가진 Routine, 날짜별 완료/취소
- 일반 텍스트 Memo와 HTTP(S) Bookmark CRUD
- Dashboard 5개 위젯, 전체 건수, 당일 루틴 완료율, 표시·순서 저장
- 기능별 30개 페이지 조회, Todo/일정 필터
- 반응형 탐색과 화면, 로딩/빈 상태/오류 처리
- 데이터 소유권 RLS, migration, 자동 검증, GitHub Actions CI

Google Calendar/Gmail/Weather/Expense/AI Briefing/Monthly Report/PWA는 설계의 확장 항목이며 아직 구현하지 않았습니다.

## 로컬 실행

Node.js 22 이상과 npm이 필요합니다. Windows PowerShell/터미널에서 프로젝트 폴더로 이동한 뒤:

```bash
npm ci
```

`.env.example`을 `.env.local`로 복사해 아래 값을 설정합니다. `.env.local`은 Git에 포함하지 않습니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Publishable key는 브라우저 사용을 전제로 하는 키이며 데이터 권한은 RLS가 제어합니다. **service_role 또는 secret key를 넣지 마세요.** 앱은 서비스 역할 키를 필요로 하지 않습니다. 환경변수가 없으면 `/setup` 안내가 표시되며 데이터를 가짜로 저장하지 않습니다.

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 앱 전체 시간대는 **Asia/Seoul**입니다. 일정 입력도 한국 시간 기준입니다.

## Supabase 초기 설정

1. 본인 Supabase 계정에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/migrations/001_initial.sql` 전체를 한 번 실행합니다. 초기 스키마 전용이므로 같은 SQL을 두 번 실행하지 않습니다. 이후 변경은 새 migration 파일로 관리합니다.
3. Auth의 Email 로그인 제공자를 활성화하고 **Confirm email**을 켭니다.
4. Authentication → URL Configuration에서 로컬 개발 Site URL은 `http://localhost:3000`으로 설정합니다. 운영 시 Vercel의 실제 운영 URL로 변경합니다. 로컬 및 운영의 `/auth/confirm` 경로를 Redirect URLs 허용 목록에 넣습니다.
5. Authentication → Email Templates에서 아래 템플릿 링크를 적용합니다. 기본 템플릿의 fragment 기반 흐름과 이 프로젝트의 token_hash 기반 흐름을 혼합하지 않습니다.

Confirm signup 링크:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">이메일 인증</a>
```

Reset password 링크:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">비밀번호 재설정</a>
```

이 앱은 `token_hash`를 서버에서 검증한 뒤 signup은 `/dashboard`, recovery는 `/reset-password`로 이동합니다. 외부 URL을 이동 대상으로 받지 않습니다. 이메일 인증 토큰이나 비밀번호를 저장소·로그에 남기지 마세요.

6. 프로젝트 URL과 publishable key를 환경변수에 설정합니다.
7. 앱에서 테스트 계정을 가입하고 이메일 인증 후 로그인합니다. Supabase 기본 메일 제공 기능의 수신자 제한/발송 한도는 프로젝트 설정에서 확인하고, 실제 사용할 이메일로 발송이 안 되면 Supabase에 SMTP를 연결합니다.
8. 별도 두 번째 계정으로 로그인해 첫 번째 계정의 데이터가 보이지 않는지 확인합니다.

## GitHub + Vercel

현재 ZIP에는 GitHub 원격 저장소 연결 정보나 자격증명이 없습니다. GitHub에서 본인 계정의 새 **private** 저장소를 만든 뒤 프로젝트 루트에서 다음을 실행합니다.

```bash
git init -b main
git add .
git commit -m "feat: implement personal life dashboard MVP"
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

Vercel에서 Add New Project → 해당 GitHub 저장소 Import → Framework Preset **Next.js** 선택. 루트 폴더는 `package.json`이 있는 폴더입니다. Node 22 이상을 선택하고 아래 환경변수를 설정합니다.

| 환경변수 | 값 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | publishable key |
| NEXT_PUBLIC_APP_URL | 실제 운영 주소, 마지막 `/` 없이 |

Build Command는 `npm run build`, Install Command는 `npm ci`, Output Directory는 Next.js 기본 설정입니다. 별도 `vercel.json`은 필요하지 않습니다.

배포 주소가 정해지면 Supabase Site URL/Redirect URLs와 `NEXT_PUBLIC_APP_URL`을 맞추고 다시 배포합니다. `NEXT_PUBLIC_*` 값은 빌드에 반영되므로 환경변수 변경 후 **재배포**가 필요합니다. Preview 배포를 실제 개인 데이터로 시험하기 전 해당 주소의 인증 redirect 허용 범위를 명시적으로 설정합니다.

## 검증

```bash
npm test
npm run typecheck
npm run build
```

`npm test`는 날짜 경계·입력 검증과 함께 PGlite(PostgreSQL 엔진)에서 실제 migration을 실행합니다. DB 테스트에서만 Supabase Auth 스키마와 authenticated/anon 역할을 최소 형태로 재현합니다. 테스트용 엔진은 개발 의존성이며 앱 런타임에는 사용하지 않습니다. 실제 Supabase Auth와 PostgREST 통합 검증을 대신하지 않습니다.

CI는 push/PR마다 설치 → 테스트 → 타입 검사 → 빌드를 수행합니다. CI에는 실제 Supabase 키가 필요 없습니다. 브라우저 자동화 테스트와 실제 이메일 전달 확인은 아직 수행하지 않았습니다.

## 운영 전 확인

- 두 계정의 데이터 격리, 가입/인증/로그아웃/비밀번호 복구
- 만료된 인증 세션, 잘못된 비밀번호, 이메일 링크 만료
- 5개 도메인 추가/수정/삭제·새로고침 후 유지
- 오늘 자정을 걸친 일정, 서울 자정 전후 루틴 완료
- 위젯 전체 숨김/순서 변경·다른 기기 재로그인 후 유지
- 좁은 화면과 키보드, 긴 제목/메모, 저장 실패 시 안내

## 주요 파일

| 위치 | 내용 |
|---|---|
| src/app/actions | 서버 변경 처리 |
| src/lib/queries.ts | 조회·개수·페이지 처리 |
| src/lib/validation.ts | 도메인 입력 검증 |
| src/lib/domain.ts | 테이블 매핑·위젯 키·타입 |
| src/lib/dates.ts | 서울 날짜·시간 처리 |
| src/lib/supabase | 쿠키 기반 서버 클라이언트 |
| src/proxy.ts | 세션 갱신 |
| src/components | 공통 UI·관리 폼 |
| supabase/migrations | 데이터베이스 DDL·RLS |
| tests | 날짜/입력/DB 권한 검증 |

저장소에는 사용자 데이터, 실제 키, node_modules, 빌드 산출물을 포함하지 않습니다.
