import { NextResponse } from 'next/server';

export function GET() {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://daylog-six-pi.vercel.app';
  return NextResponse.json({
    openapi: '3.1.0',
    info: { title: 'Daylog Recipe Import', description: '분석한 레시피를 Daylog 검토 화면으로 전송합니다.', version: '1.0.1' },
    servers: [{ url: origin }],
    paths: {
      '/api/recipes/draft': {
        post: {
          operationId: 'createRecipeReview',
          summary: '분석한 레시피의 Daylog 검토 링크 생성',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RecipeDraft' } } } },
          responses: {
            '200': { description: 'Daylog 검토 링크 생성 성공', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewResponse' } } } },
            '400': { description: '레시피 형식 오류' },
            '401': { description: '인증 오류' }
          }
        }
      }
    },
    components: {
      schemas: {
        RecipeDraft: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'servings', 'prep_minutes', 'cook_minutes', 'ingredients', 'steps', 'tips', 'tags'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 120 },
            source_url: { type: ['string', 'null'], format: 'uri' },
            source_type: { type: 'string', enum: ['webpage', 'video', 'manual'] },
            servings: { type: 'string', maxLength: 80 },
            prep_minutes: { type: ['integer', 'null'], minimum: 0 },
            cook_minutes: { type: ['integer', 'null'], minimum: 0 },
            ingredients: { type: 'array', items: { type: 'string' } },
            steps: { type: 'array', items: { type: 'string' } },
            tips: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        },
        ReviewResponse: {
          type: 'object',
          required: ['review_url', 'message'],
          properties: { review_url: { type: 'string', format: 'uri' }, message: { type: 'string' } }
        }
      },
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } }
    }
  });
}
