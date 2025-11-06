import { NextResponse } from 'next/server';
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * POST /api/log-error
 * Logs client-side errors to a file for debugging
 */
export async function POST(request: Request) {
  try {
    const error = await request.json();
    
    // Log to file
    const logPath = join(process.cwd(), 'logs', 'client-errors.log');
    const logEntry = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[${error.timestamp}] ${error.type}
URL: ${error.url}
Message: ${error.message}
${error.stack ? `Stack: ${error.stack}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Create logs directory if it doesn't exist
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(logsDir, { recursive: true });
    }

    appendFileSync(logPath, logEntry);

    // Also log to console so it appears in terminal
    console.error('🔴 CLIENT ERROR:', error);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to log error:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}


