/**
 * New AI Guidance Page
 *
 * Create new AI guidance entry.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { GuidanceEditor } from '../GuidanceEditor';

export default async function NewGuidancePage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  return <GuidanceEditor />;
}
