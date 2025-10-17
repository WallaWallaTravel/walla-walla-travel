import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Development-only endpoint for viewing application logs
 * GET /api/logs - Get recent logs
 * DELETE /api/logs - Clear log buffer
 */

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const level = searchParams.get('level') || undefined;
    const format = searchParams.get('format') || 'json';

    const logs = logger.getRecentLogs(limit, level);

    if (format === 'html') {
      // Return HTML view for browser
      const html = generateHtmlView(logs);
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Return JSON
    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
      filters: {
        limit,
        level: level || 'all',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  logger.clearLogs();
  
  return NextResponse.json({
    success: true,
    message: 'Log buffer cleared',
  });
}

function generateHtmlView(logs: any[]): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Logs</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      background: #0d1117;
      color: #c9d1d9;
      padding: 20px;
      line-height: 1.6;
    }
    
    .header {
      background: #161b22;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #30363d;
    }
    
    h1 {
      font-size: 24px;
      color: #58a6ff;
    }
    
    .controls {
      display: flex;
      gap: 10px;
    }
    
    button {
      background: #238636;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
    }
    
    button:hover {
      background: #2ea043;
    }
    
    select {
      background: #0d1117;
      color: #c9d1d9;
      border: 1px solid #30363d;
      padding: 8px;
      border-radius: 6px;
      font-family: inherit;
    }
    
    .log-entry {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
    }
    
    .log-entry.error {
      border-left: 3px solid #f85149;
    }
    
    .log-entry.warn {
      border-left: 3px solid #d29922;
    }
    
    .log-entry.info {
      border-left: 3px solid #58a6ff;
    }
    
    .log-entry.debug {
      border-left: 3px solid #a371f7;
    }
    
    .log-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    .log-level {
      font-weight: bold;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .log-level.error {
      background: #f85149;
      color: white;
    }
    
    .log-level.warn {
      background: #d29922;
      color: white;
    }
    
    .log-level.info {
      background: #58a6ff;
      color: white;
    }
    
    .log-level.debug {
      background: #a371f7;
      color: white;
    }
    
    .log-source {
      color: #58a6ff;
      font-weight: bold;
    }
    
    .log-timestamp {
      color: #8b949e;
      font-size: 12px;
    }
    
    .log-message {
      margin-bottom: 10px;
      font-size: 15px;
      color: #f0f6fc;
    }
    
    .log-sql {
      background: #0d1117;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      border: 1px solid #30363d;
      overflow-x: auto;
    }
    
    .log-details {
      background: #0d1117;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 13px;
      overflow-x: auto;
      border: 1px solid #30363d;
    }
    
    .log-stack {
      background: #0d1117;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 12px;
      color: #f85149;
      overflow-x: auto;
      border: 1px solid #30363d;
      max-height: 200px;
      overflow-y: auto;
    }
    
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .empty {
      text-align: center;
      padding: 40px;
      color: #8b949e;
    }
    
    .error-id {
      background: #1f2937;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: #fbbf24;
    }
  </style>
  <script>
    function refreshLogs() {
      window.location.reload();
    }
    
    function clearLogs() {
      fetch('/api/logs', { method: 'DELETE' })
        .then(() => window.location.reload());
    }
    
    function filterLogs(level) {
      const url = new URL(window.location);
      if (level === 'all') {
        url.searchParams.delete('level');
      } else {
        url.searchParams.set('level', level);
      }
      window.location = url;
    }
    
    // Auto-refresh every 5 seconds
    setInterval(refreshLogs, 5000);
  </script>
</head>
<body>
  <div class="header">
    <h1>🔍 Application Logs</h1>
    <div class="controls">
      <select onchange="filterLogs(this.value)">
        <option value="all">All Levels</option>
        <option value="error">Errors Only</option>
        <option value="warn">Warnings</option>
        <option value="info">Info</option>
        <option value="debug">Debug</option>
      </select>
      <button onclick="refreshLogs()">🔄 Refresh</button>
      <button onclick="clearLogs()">🗑️ Clear</button>
    </div>
  </div>
  
  <div class="logs">
    ${logs.length === 0 
      ? '<div class="empty">No logs to display</div>'
      : logs.map(log => `
        <div class="log-entry ${log.level}">
          <div class="log-header">
            <div>
              <span class="log-level ${log.level}">${log.level}</span>
              <span class="log-source">${log.source}</span>
              ${log.details?.errorId ? `<span class="error-id">${log.details.errorId}</span>` : ''}
            </div>
            <div class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
          </div>
          
          <div class="log-message">${escapeHtml(log.message)}</div>
          
          ${log.sql ? `
            <div class="log-sql">
              <strong>SQL:</strong>
              <pre>${escapeHtml(log.sql)}</pre>
              ${log.params?.length ? `<strong>Params:</strong> ${JSON.stringify(log.params)}` : ''}
            </div>
          ` : ''}
          
          ${log.details ? `
            <details>
              <summary style="cursor: pointer; color: #58a6ff;">Details</summary>
              <div class="log-details">
                <pre>${JSON.stringify(log.details, null, 2)}</pre>
              </div>
            </details>
          ` : ''}
          
          ${log.stack ? `
            <details>
              <summary style="cursor: pointer; color: #f85149;">Stack Trace</summary>
              <div class="log-stack">
                <pre>${escapeHtml(log.stack)}</pre>
              </div>
            </details>
          ` : ''}
        </div>
      `).join('')
    }
  </div>
</body>
</html>
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document?.createElement?.('div');
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}