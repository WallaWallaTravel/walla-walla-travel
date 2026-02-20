'use client';

import { LodgingGrid } from './LodgingGrid';
import type { LodgingPropertySummary } from '@/lib/services/lodging.service';

interface LodgingDirectoryClientProps {
  properties: LodgingPropertySummary[];
}

export function LodgingDirectoryClient({ properties }: LodgingDirectoryClientProps) {
  return <LodgingGrid initialProperties={properties} />;
}
