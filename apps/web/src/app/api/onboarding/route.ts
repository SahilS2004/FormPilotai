import { NextResponse } from 'next/server';
import { fetchOnboardingProgress, saveOnboardingStep } from '@/lib/db';

export async function GET() {
  const data = await fetchOnboardingProgress();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const { stepKey } = await req.json();
    if (!stepKey) {
      return NextResponse.json({ error: 'Missing stepKey' }, { status: 400 });
    }
    const completedSteps = await saveOnboardingStep(stepKey);
    return NextResponse.json({ completedSteps });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update onboarding step' }, { status: 500 });
  }
}
