import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function createMcpServer() {
  const server = new McpServer({
    name: 'statcode-mcp-server',
    version: '0.0.1',
  })

  server.tool(
    'add',
    { a: z.number(), b: z.number() },
    async ({ a, b }) => ({
      content: [{ type: 'text' as const, text: String(a + b) }],
    }),
  )

  server.tool(
    'toSlug',
    { text: z.string() },
    async ({ text }) => ({
      content: [{
        type: 'text' as const,
        text: text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      }],
    }),
  )

  server.tool(
    'echo',
    { message: z.string() },
    async ({ message }) => ({
      content: [{ type: 'text' as const, text: `Echo: ${message}` }],
    }),
  )

  return server
}
