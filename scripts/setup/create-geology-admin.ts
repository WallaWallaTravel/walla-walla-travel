/**
 * Create Geology Admin (Kevin Pogue)
 *
 * Creates a geology_admin user for the geology expert.
 * This user can ONLY access the geology content management section.
 *
 * Usage: npx tsx scripts/setup/create-geology-admin.ts
 */

import { hashPassword } from '../../lib/auth/passwords';
import { query } from '../../lib/db';

async function createGeologyAdmin() {
  console.log('Creating geology admin account...\n');

  const email = 'kevin@wallawalla.travel';
  const name = 'Kevin Pogue';
  const password = 'GeologyRocks2026!';
  const role = 'geology_admin';

  try {
    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active
       RETURNING id, email, name, role`,
      [email, name, passwordHash, role, true]
    );

    console.log('Account created:', result.rows[0]);
    console.log('');
    console.log('Login credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role:     ${role}`);
    console.log('');
    console.log('This account can ONLY access:');
    console.log('  - /admin/geology (Dashboard)');
    console.log('  - /admin/geology/topics');
    console.log('  - /admin/geology/facts');
    console.log('  - /admin/geology/sites');
    console.log('  - /admin/geology/ai-guidance');
    console.log('');
    console.log('Login at: http://localhost:3000/login');

    process.exit(0);
  } catch (error) {
    console.error('Error creating geology admin:', error);
    process.exit(1);
  }
}

createGeologyAdmin();
