import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareCode: string }> }
) {
  const { shareCode } = await params;
  return NextResponse.json({ message: 'Share trip endpoint - not yet implemented', shareCode }, { status: 501 });
}
