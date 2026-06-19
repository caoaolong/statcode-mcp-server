import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function add(a: number, b: number) {
  return String(a + b)
}

export function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function echo(message: string) {
  return `Echo: ${message}`
}

export function createMcpServer() {
  return new McpServer({
    name: 'statcode-mcp-server',
    version: '0.0.1',
  })
}
