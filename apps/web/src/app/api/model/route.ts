import { NextResponse } from 'next/server';
import { geminiConfig } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = geminiConfig();
  return NextResponse.json({
    provider: config.provider,
    model: config.primaryModel,
    fallbackModel: config.fallbackModel,
    embeddingModel: config.embeddingModel,
    embeddingDimensions: config.embeddingDimensions,
    configured: config.configured,
  });
}
