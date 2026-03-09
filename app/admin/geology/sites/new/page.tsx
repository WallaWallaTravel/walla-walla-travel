/**
 * New Geology Site Page
 *
 * Create a new geological site.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { SiteEditor } from '../SiteEditor';

export default async function NewSitePage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  return <SiteEditor />;
}
