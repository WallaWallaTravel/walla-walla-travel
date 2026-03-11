/**
 * Edit Geology Site Page
 *
 * Edit an existing geological site.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SiteEditor } from '../SiteEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface SiteData {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  site_type: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  directions: string | null;
  is_public_access: boolean | null;
  requires_appointment: boolean | null;
  best_time_to_visit: string | null;
  photos: string[] | null;
  related_topic_ids: number[] | null;
  nearby_winery_ids: number[] | null;
  is_published: boolean | null;
}

async function getSite(id: number): Promise<SiteData | null> {
  try {
    return await prisma.geology_sites.findFirst({
      where: { id },
    }) as unknown as SiteData | null;
  } catch {
    return null;
  }
}

export default async function EditSitePage({ params }: PageProps) {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const { id } = await params;
  const siteId = parseInt(id);

  if (isNaN(siteId)) {
    notFound();
  }

  const site = await getSite(siteId);

  if (!site) {
    notFound();
  }

  return <SiteEditor initialData={site} isEditing />;
}
