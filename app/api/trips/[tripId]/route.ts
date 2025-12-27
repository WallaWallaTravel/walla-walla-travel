import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  return NextResponse.json({ message: 'Trip endpoint - not yet implemented', tripId }, { status: 501 });
}
