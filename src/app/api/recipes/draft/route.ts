import { NextResponse } from 'next/server';
import { aiRecipeSchema, recipeSchema } from '@/lib/recipes';
import { createReviewToken } from '@/lib/recipe-import';

export async function POST(request: Request) {
  const expected = process.env.DAYLOG_IMPORT_API_KEY;
  if (!expected || request.headers.get('authorization') !== 'Bearer ' + expected) return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
  try {
    const body = await request.json();
    const content = aiRecipeSchema.parse(body);
    const draft = recipeSchema.parse({ ...content, source_url: body.source_url || null, source_type: body.source_type || 'webpage', analysis_status: 'needs_review' });
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) throw new Error('서비스 주소 설정이 없습니다.');
    return NextResponse.json({ review_url: origin + '/recipes?draft=' + encodeURIComponent(createReviewToken(draft)), message: '검토 링크를 열어 저장을 완료해 주세요.' });
  } catch { return NextResponse.json({ error: '레시피 형식을 확인해 주세요.' }, { status: 400 }); }
}
