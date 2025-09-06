import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    console.log('ENV OPENAI present:', !!process.env.OPENAI_API_KEY);
    const { prompt } = await req.json();
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt || 'Say hello' }],
      temperature: 0.7,
    });
    const text = completion.choices[0]?.message?.content ?? '';
    return NextResponse.json({ text });
  } catch (e: any) {
    console.error('openai-test error:', e);
    const status = typeof e?.status === 'number' ? e.status : 500;
    const body: any = { error: 'openai_test_failed' };
    if (e?.message) body.message = e.message;
    if (e?.code) body.code = e.code;
    if (e?.type) body.type = e.type;
    if (e?.response?.data) body.details = e.response.data;
    if (!process.env.OPENAI_API_KEY) body.missingEnv = 'OPENAI_API_KEY';
    return NextResponse.json(body, { status });
  }
}