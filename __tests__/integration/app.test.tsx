/**
 * @jest-environment node
 */
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

describe('Application Integration Tests', () => {
  let server: any
  let app: any
  const port = 3002

  beforeAll(async () => {
    // Create a real Next.js server
    app = next({ dev: false, dir: process.cwd() })
    const handle = app.getRequestHandler()
    
    await app.prepare()
    
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    }).listen(port)
  }, 30000)

  afterAll(async () => {
    if (server) {
      server.close()
    }
    if (app) {
      await app.close()
    }
  })

  it('should respond to health check', async () => {
    const response = await fetch(`http://localhost:${port}/api/health`)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.status).toBe('ok')
    expect(data.message).toBe('Travel Suite API is running')
  })

  it('should serve the home page', async () => {
    const response = await fetch(`http://localhost:${port}/`)
    expect(response.status).toBe(200)
    
    const html = await response.text()
    expect(html).toContain('Travel Suite')
  })

  it('should serve the test page', async () => {
    const response = await fetch(`http://localhost:${port}/test`)
    expect(response.status).toBe(200)
    
    const html = await response.text()
    expect(html).toContain('Test Page - Server is Working!')
  })

  it('should have security headers', async () => {
    const response = await fetch(`http://localhost:${port}/`)
    
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })
})