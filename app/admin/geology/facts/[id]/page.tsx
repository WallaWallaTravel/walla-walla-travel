/**
 * Edit Geology Fact Page
 *
 * Edit an existing geology fact.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
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
  display_order: number | null;
  is_featured: boolean | null;
}

async function getFact(id: number): Promise<FactData | null> {
  try {
    return await prisma.geology_facts.findFirst({
      where: { id },
      select: { id: true, fact_text: true, context: true, fact_type: true, topic_id: true, display_order: true, is_featured: true },
    });
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
