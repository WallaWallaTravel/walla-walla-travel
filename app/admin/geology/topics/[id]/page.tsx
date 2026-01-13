/**
 * Edit Geology Topic Page
 *
 * Edit an existing geology topic/article.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect, notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { TopicEditor } from '../TopicEditor';
import type { GeologyTopic } from '@/lib/types/geology';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getTopic(id: number): Promise<GeologyTopic | null> {
  try {
    const result = await query<GeologyTopic>(
      'SELECT * FROM geology_topics WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export default async function EditTopicPage({ params }: PageProps) {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const { id } = await params;
  const topicId = parseInt(id);

  if (isNaN(topicId)) {
    notFound();
  }

  const topic = await getTopic(topicId);

  if (!topic) {
    notFound();
  }

  return <TopicEditor initialData={topic} isEditing />;
}
