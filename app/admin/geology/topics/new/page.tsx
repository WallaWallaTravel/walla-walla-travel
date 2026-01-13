/**
 * New Geology Topic Page
 *
 * Create a new geology topic/article.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { TopicEditor } from '../TopicEditor';

export default async function NewTopicPage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  return <TopicEditor />;
}
