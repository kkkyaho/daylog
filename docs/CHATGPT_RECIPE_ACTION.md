# ChatGPT 레시피 연결

Daylog는 외부 GPT가 분석한 레시피를 곧바로 저장하지 않습니다. GPT는 서명된 검토 링크를 만들고, 로그인한 사용자가 내용을 확인한 뒤 저장합니다.

## GPT Action 설정

1. ChatGPT에서 GPT 만들기 화면을 열고 Action을 추가합니다.
2. 스키마 가져오기 주소에 `https://daylog-six-pi.vercel.app/api/recipes/openapi`를 입력합니다.
3. 인증은 API Key, 인증 방식은 Bearer를 선택합니다.
4. API Key 값에는 Daylog의 `DAYLOG_IMPORT_API_KEY`와 같은 값을 입력합니다. 이 값은 대화, GPT 지침, 공개 문서에 적지 않습니다.
5. GPT 지침에 아래 내용을 추가합니다.

```text
사용자가 음식 레시피가 있는 글이나 영상의 링크를 주면 접근 가능한 내용을 분석한다.
제목, 분량, 준비 시간, 조리 시간, 재료, 순서, 팁, 태그와 원본 URL을 한국어로 정리한다.
확인할 수 없는 값은 추측하지 말고 빈 문자열, 빈 배열 또는 null을 사용한다.
createRecipeReview Action을 호출하고, 반환된 review_url을 사용자에게 Daylog 검토 링크로 제공한다.
레시피 저장이 완료됐다고 말하지 말고, 사용자가 링크에서 검토 후 저장해야 한다고 안내한다.
```

## 요청 형식

Action은 `title`, `servings`, `prep_minutes`, `cook_minutes`, `ingredients`, `steps`, `tips`, `tags`를 받습니다. 원본 주소는 `source_url`, 종류는 `source_type`에 `webpage`, `video`, `manual` 중 하나로 전달합니다.

검토 링크의 유효기간은 24시간입니다. 링크에는 레시피 초안과 위조 방지 서명이 포함되므로 공개 게시하지 않습니다. 저장할 때는 로그인한 사용자의 Supabase 세션과 RLS가 적용됩니다.

웹페이지를 Daylog 화면에서 직접 분석할 때는 먼저 Recipe JSON-LD를 사용하고, 구조화 데이터가 없으면 Vercel AI Gateway의 `openai/gpt-5.6-luna`로 본문을 보완 분석합니다. 영상의 음성·프레임 분석은 ChatGPT가 접근할 수 있는 내용 범위에서 수행하며 Daylog 서버가 영상을 다운로드하지는 않습니다.
