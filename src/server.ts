import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { StreamableHTTPTransport } from '@hono/mcp'
import { createMcpServer } from './mcp.ts'

const isProd = process.env.NODE_ENV === 'production'
const PORT = isProd ? 3000 : 3001

const app = new Hono()
const mcpServer = createMcpServer()
const transport = new StreamableHTTPTransport()

let connected = false

app.all('/mcp', async (c) => {
  if (!connected) {
    await mcpServer.connect(transport)
    connected = true
  }
  return transport.handleRequest(c)
})

if (isProd) {
  app.use('/*', serveStatic({ root: './dist' }))
}

serve(
  { fetch: app.fetch, port: PORT },
  (info) => {
    console.log(`🚀  Server:  http://localhost:${info.port}`)
    console.log(`   MCP:     http://localhost:${info.port}/mcp`)
    if (isProd) {
      console.log(`   Web UI:  http://localhost:${info.port}/`)
    } else {
      console.log(`   Web UI:  http://localhost:5173/ (Vite dev — proxy /mcp → :${info.port})`)
    }
  },
)
