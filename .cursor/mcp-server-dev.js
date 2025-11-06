#!/usr/bin/env node

/**
 * MCP Server for Development Environment Control
 * Allows AI agent to start/stop/monitor the Next.js dev server
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import { readFileSync } from 'fs';

const execAsync = promisify(exec);

class DevServerMCP {
  constructor() {
    this.serverProcess = null;
    this.serverLog = [];
    this.serverReady = false;
  }

  // MCP Protocol: Handle incoming requests
  async handleRequest(method, params) {
    switch (method) {
      case 'server.start':
        return await this.startServer(params);
      case 'server.stop':
        return await this.stopServer();
      case 'server.status':
        return await this.getStatus();
      case 'server.logs':
        return this.getLogs(params);
      case 'server.restart':
        return await this.restartServer();
      case 'server.check':
        return await this.checkServer();
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // Start the Next.js dev server
  async startServer(params = {}) {
    const cwd = params.cwd || '/Users/temp/walla-walla-final';
    
    // Check if already running
    if (this.serverProcess) {
      return { success: false, message: 'Server already running', pid: this.serverProcess.pid };
    }

    // Check if port is in use
    const portInUse = await this.isPortInUse(3000);
    if (portInUse) {
      // Try to kill existing process
      try {
        await execAsync('lsof -ti:3000 | xargs kill -9');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        // Ignore if no process to kill
      }
    }

    return new Promise((resolve) => {
      this.serverLog = [];
      this.serverReady = false;

      // Start the server
      this.serverProcess = spawn('npm', ['run', 'dev'], {
        cwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Capture stdout
      this.serverProcess.stdout.on('data', (data) => {
        const line = data.toString();
        this.serverLog.push({ time: new Date().toISOString(), type: 'stdout', message: line });
        
        // Check if server is ready
        if (line.includes('ready') || line.includes('started server')) {
          this.serverReady = true;
          resolve({
            success: true,
            message: 'Server started successfully',
            pid: this.serverProcess.pid,
            url: 'http://localhost:3000'
          });
        }
      });

      // Capture stderr
      this.serverProcess.stderr.on('data', (data) => {
        const line = data.toString();
        this.serverLog.push({ time: new Date().toISOString(), type: 'stderr', message: line });
      });

      // Handle process exit
      this.serverProcess.on('exit', (code) => {
        this.serverLog.push({ time: new Date().toISOString(), type: 'exit', message: `Process exited with code ${code}` });
        this.serverProcess = null;
        this.serverReady = false;
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.serverReady) {
          resolve({
            success: false,
            message: 'Server failed to start within 30 seconds',
            logs: this.serverLog.slice(-10)
          });
        }
      }, 30000);
    });
  }

  // Stop the server
  async stopServer() {
    if (!this.serverProcess) {
      return { success: false, message: 'Server not running' };
    }

    return new Promise((resolve) => {
      this.serverProcess.once('exit', () => {
        this.serverProcess = null;
        this.serverReady = false;
        resolve({ success: true, message: 'Server stopped' });
      });

      this.serverProcess.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.serverProcess) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  // Get server status
  async getStatus() {
    const isRunning = this.serverProcess !== null;
    const isResponding = await this.checkServer();

    return {
      running: isRunning,
      ready: this.serverReady,
      responding: isResponding.success,
      pid: this.serverProcess?.pid || null,
      url: 'http://localhost:3000',
      uptime: isRunning ? process.uptime() : 0
    };
  }

  // Get server logs
  getLogs(params = {}) {
    const limit = params.limit || 50;
    return {
      success: true,
      logs: this.serverLog.slice(-limit)
    };
  }

  // Restart server
  async restartServer() {
    await this.stopServer();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await this.startServer();
  }

  // Check if server is responding
  async checkServer() {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:3000', (res) => {
        resolve({ success: true, status: res.statusCode });
      });
      req.on('error', () => {
        resolve({ success: false, error: 'Not responding' });
      });
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ success: false, error: 'Timeout' });
      });
    });
  }

  // Check if port is in use
  async isPortInUse(port) {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      return stdout.trim().length > 0;
    } catch (e) {
      return false;
    }
  }
}

// MCP Protocol Implementation
const server = new DevServerMCP();

// Handle stdin (MCP requests)
let buffer = '';
process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString();
  
  // Process complete JSON messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const request = JSON.parse(line);
      const result = await server.handleRequest(request.method, request.params);
      
      // Send response
      process.stdout.write(JSON.stringify({
        id: request.id,
        result
      }) + '\n');
    } catch (error) {
      process.stdout.write(JSON.stringify({
        id: request.id,
        error: {
          code: -32603,
          message: error.message
        }
      }) + '\n');
    }
  }
});

// Handle process signals
process.on('SIGTERM', async () => {
  if (server.serverProcess) {
    await server.stopServer();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (server.serverProcess) {
    await server.stopServer();
  }
  process.exit(0);
});

console.error('MCP Dev Server started');


