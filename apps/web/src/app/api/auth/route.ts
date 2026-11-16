import { NextResponse } from 'next/server';
import { validateEmail, validatePassword, AuthUser } from '@/lib/auth';

// Simulated User Store
const usersDatabase: Array<{ id: string; name: string; email: string; passwordHash: string }> = [
  {
    id: 'usr_demo_1',
    name: 'Demo Pilot',
    email: 'demo@formpilot.ai',
    passwordHash: 'DemoPassword123!'
  }
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;

    // Strict email check (NO '+' aliases)
    const emailCheck = validateEmail(email || '');
    if (!emailCheck.isValid) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    const passwordCheck = validatePassword(password || '');
    if (!passwordCheck.isValid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. SIGN IN ACTION
    if (action === 'signin') {
      const user = usersDatabase.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (!user) {
        // Create demo user session on the fly for any valid non-plus email
        const newUser: AuthUser = {
          id: `usr_${Date.now()}`,
          name: normalizedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          email: normalizedEmail,
          role: 'user',
          createdAt: new Date().toISOString()
        };
        return NextResponse.json({
          user: newUser,
          token: `fpt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          message: 'Signed in successfully'
        });
      }

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'user',
        createdAt: new Date().toISOString()
      };

      return NextResponse.json({
        user: authUser,
        token: `fpt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        message: 'Signed in successfully'
      });
    }

    // 2. SIGN UP ACTION
    if (action === 'signup') {
      const existing = usersDatabase.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 });
      }

      const userName = name?.trim() || normalizedEmail.split('@')[0];
      const newUser: AuthUser = {
        id: `usr_${Date.now()}`,
        name: userName,
        email: normalizedEmail,
        role: 'user',
        createdAt: new Date().toISOString()
      };

      usersDatabase.push({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        passwordHash: password
      });

      return NextResponse.json({
        user: newUser,
        token: `fpt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        message: 'Account created successfully'
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid authentication action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Authentication service error' }, { status: 500 });
  }
}
