import { NextResponse } from 'next/server';
import { validateEmail, validatePassword, AuthUser } from '@/lib/auth';
import { getDbPool, checkPostgresHealth } from '@/lib/db';

// Fallback in-memory user store
const usersDatabase: Array<{ id: string; name: string; email: string; passwordHash: string }> = [
  {
    id: 'usr_demo_1',
    name: 'Demo Pilot',
    email: 'demo@formpilot.ai',
    passwordHash: 'DemoPassword123!'
  }
];

export async function GET(req: Request) {
  return NextResponse.json({
    status: 'ok',
    message: 'Auth service operational'
  });
}

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
    const pool = getDbPool();
    const isDbHealthy = await checkPostgresHealth();

    // 1. SIGN IN ACTION
    if (action === 'signin') {
      let user = usersDatabase.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (isDbHealthy && pool) {
        try {
          const res = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
          if (res.rows?.[0]) {
            const dbUser = res.rows[0];
            return NextResponse.json({
              user: {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role || 'user',
                createdAt: dbUser.created_at ? new Date(dbUser.created_at).toISOString() : new Date().toISOString()
              },
              token: `fpt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              message: 'Signed in successfully'
            });
          }
        } catch (dbErr) {
          console.warn('[DB Auth Lookup Warning]', dbErr);
        }
      }

      if (!user) {
        // Create demo user session on the fly for any valid standard email
        const newUser: AuthUser = {
          id: `usr_${Date.now()}`,
          name: normalizedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          email: normalizedEmail,
          role: 'user',
          createdAt: new Date().toISOString()
        };

        if (isDbHealthy && pool) {
          try {
            await pool.query(
              'INSERT INTO users (id, name, email, role, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (email) DO NOTHING',
              [newUser.id, newUser.name, newUser.email, newUser.role]
            );
          } catch {}
        }

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
      const existingInMemory = usersDatabase.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existingInMemory) {
        return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 });
      }

      if (isDbHealthy && pool) {
        try {
          const res = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
          if (res.rows && res.rows.length > 0) {
            return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 });
          }
        } catch {}
      }

      const userName = name?.trim() || normalizedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
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

      if (isDbHealthy && pool) {
        try {
          await pool.query(
            'INSERT INTO users (id, name, email, role, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
            [newUser.id, newUser.name, newUser.email, newUser.role]
          );
        } catch (insertErr) {
          console.warn('[DB User Insert Warning]', insertErr);
        }
      }

      return NextResponse.json({
        user: newUser,
        token: `fpt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        isNewUser: true,
        message: 'Account created successfully'
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid authentication action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Authentication service error' }, { status: 500 });
  }
}
