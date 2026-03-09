/**
 * Edit AI Guidance Page
 *
 * Edit existing AI guidance entry.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect, notFound } from 'next/navigation';
import { query } from '@/lib/db';
import { GuidanceEditor } from '../GuidanceEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface GuidanceData {
  id: number;
  guidance_type: string;
  title: string | null;
  content: string;
  priority: number;
  is_active: boolean;
}

async function getGuidance(id: number): Promise<GuidanceData | null> {
  try {
    const result = await query<GuidanceData>(
      'SELECT id, guidance_type, title, content, priority, is_active FROM geology_ai_guidance WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export default async function EditGuidancePage({ params }: PageProps) {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const { id } = await params;
  const guidanceId = parseInt(id);

  if (isNaN(guidanceId)) {
    notFound();
  }

  const guidance = await getGuidance(guidanceId);

  if (!guidance) {
    notFound();
  }

  return <GuidanceEditor initialData={guidance} isEditing />;
}
