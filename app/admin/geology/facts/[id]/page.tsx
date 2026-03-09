/**
 * Edit Geology Fact Page
 *
 * Edit an existing geology fact.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect, notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { FactEditor } from '../FactEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface FactData {
  id: number;
  fact_text: string;
  context: string | null;
  fact_type: string | null;
  topic_id: number | null;
  display_order: number;
  is_featured: boolean;
}

async function getFact(id: number): Promise<FactData | null> {
  try {
    const result = await query<FactData>(
      'SELECT id, fact_text, context, fact_type, topic_id, display_order, is_featured FROM geology_facts WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export default async function EditFactPage({ params }: PageProps) {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const { id } = await params;
  const factId = parseInt(id);

  if (isNaN(factId)) {
    notFound();
  }

  const fact = await getFact(factId);

  if (!fact) {
    notFound();
  }

  return <FactEditor initialData={fact} isEditing />;
}
