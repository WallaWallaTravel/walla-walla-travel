/**
 * Edit AI Guidance Page
 *
 * Edit existing AI guidance entry.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { GuidanceEditor } from '../GuidanceEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface GuidanceData {
  id: number;
  guidance_type: string;
  title: string | null;
  content: string;
  priority: number | null;
  is_active: boolean | null;
}

async function getGuidance(id: number): Promise<GuidanceData | null> {
  try {
    return await prisma.geology_ai_guidance.findFirst({
      where: { id },
      select: { id: true, guidance_type: true, title: true, content: true, priority: true, is_active: true },
    });
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
