/**
 * New Geology Topic Page
 *
 * Create a new geology topic/article.
 */

import { auth } from '@/auth';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { TopicEditor } from '../TopicEditor';

export default async function NewTopicPage() {
  const session = await auth();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  return <TopicEditor />;
}
