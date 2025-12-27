import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Analytics overview endpoint - not yet implemented' }, { status: 501 });
}
