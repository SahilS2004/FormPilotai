import { NextResponse } from 'next/server';
import { indexOnboardingProfile } from '@/lib/onboarding-profile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await indexOnboardingProfile({
      name: body.name,
      email: body.email,
      phone: body.phone,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      address: body.address,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country,
      nationality: body.nationality,
      profession: body.profession,
      primaryUseCases: Array.isArray(body.primaryUseCases) ? body.primaryUseCases : [],
      tone: body.tone,
      referralSource: body.referralSource,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /api/profile]', error);
    return NextResponse.json({ error: 'Could not save the onboarding profile' }, { status: 500 });
  }
}
