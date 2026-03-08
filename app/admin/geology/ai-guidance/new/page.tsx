/**
 * New AI Guidance Page
 *
 * Create new AI guidance entry.
 */

import { auth } from '@/auth';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { GuidanceEditor } from '../GuidanceEditor';

export default async function NewGuidancePage() {
  const session = await auth();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  return <GuidanceEditor />;
}
