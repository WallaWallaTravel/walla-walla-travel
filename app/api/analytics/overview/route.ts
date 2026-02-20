import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

export const GET = withErrorHandling(async () => {
  return NextResponse.json({ message: 'Analytics overview endpoint - not yet implemented' }, { status: 501 });
});
