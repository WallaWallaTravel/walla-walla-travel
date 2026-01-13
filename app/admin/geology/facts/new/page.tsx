/**
 * New Geology Fact Page
 *
 * Create a new geology fact.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { FactEditor } from '../FactEditor';

export default async function NewFactPage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  return <FactEditor />;
}
