# Google Calendar와 Microsoft 365 연결

Daylog 일정 화면은 Google Calendar와 Microsoft 365 기본 캘린더를 읽어 같은 목록에 표시합니다. Microsoft 일정에 Teams 온라인 회의가 있으면 참가 링크도 표시합니다.

## Google Cloud 설정

1. Google Cloud 프로젝트에서 Google Calendar API를 활성화합니다.
2. OAuth 동의 화면을 구성하고 웹 애플리케이션 OAuth 클라이언트를 만듭니다.
3. 승인된 리디렉션 URI에 아래 주소를 등록합니다.

```text
https://daylog-six-pi.vercel.app/api/calendar/google/callback
http://localhost:3000/api/calendar/google/callback
```

4. Client ID와 Client Secret을 `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`에 설정합니다.

요청 권한은 사용자 이메일 확인과 Calendar 읽기 전용입니다. 오프라인 동기화를 위한 refresh token도 요청합니다.

## Microsoft Entra 설정

1. Microsoft Entra 관리 센터의 App registrations에서 앱을 등록합니다. 지원 계정 유형은 조직 계정과 개인 Microsoft 계정을 포함하도록 선택할 수 있습니다.
2. Web 플랫폼 리디렉션 URI에 아래 주소를 등록합니다.

```text
https://daylog-six-pi.vercel.app/api/calendar/microsoft/callback
http://localhost:3000/api/calendar/microsoft/callback
```

3. Delegated permissions에 `User.Read`, `Calendars.Read`, `offline_access`, `openid`, `email`을 설정합니다.
4. Client secret을 만들고 Application (client) ID와 함께 `MICROSOFT_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_SECRET`에 설정합니다.

Teams 일정은 Microsoft Graph 캘린더 이벤트의 `onlineMeeting.joinUrl`을 사용합니다.

## 보안과 동기화

`CALENDAR_TOKEN_ENCRYPTION_KEY`는 32자 이상의 임의 비밀값이어야 합니다. OAuth access token과 refresh token은 AES-256-GCM으로 암호화되어 사용자 소유 행에 저장됩니다. 두 테이블 모두 RLS가 활성화되어 있습니다.

현재 버전은 연결된 계정의 기본 캘린더에서 과거 3개월부터 앞으로 1년까지 읽습니다. 일정 화면의 `지금 동기화` 버튼으로 갱신합니다. 외부 일정은 원본 서비스에서 수정하고 Daylog에서 다시 동기화합니다.
