import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { StreamableHTTPTransport } from '@hono/mcp'
import { createMcpServer, add, toSlug, echo } from './mcp.ts'
import { readdir, readFile, writeFile, mkdir, stat, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = isProd ? 3000 : 3001
const PROJECTS_DIR = join(__dirname, '..', 'projects')

const app = new Hono()
const mcpServer = createMcpServer()
const transport = new StreamableHTTPTransport({ enableJsonResponse: true })

let connected = false

app.all('/mcp', async (c) => {
  if (!connected) {
    await mcpServer.connect(transport)
    connected = true
  }
  return transport.handleRequest(c)
})

// REST API — 供 Web UI 调用
app.post('/api/add', async (c) => {
  const { a, b } = await c.req.json()
  const result = add(a, b)
  return c.json({ result })
})

app.post('/api/toSlug', async (c) => {
  const { text } = await c.req.json()
  const result = toSlug(text)
  return c.json({ result })
})

app.post('/api/echo', async (c) => {
  const { message } = await c.req.json()
  const result = echo(message)
  return c.json({ result })
})

// 项目 API
type StatCodeData = {
  name: string
  fileCount: number
  codeLines: number
  extensions: Record<string, { count: number; lines: number; percentage: number }>
}

app.get('/api/projects', async (c) => {
  if (!existsSync(PROJECTS_DIR)) return c.json([])
  const entries = await readdir(PROJECTS_DIR, { withFileTypes: true })
  const projects: { name: string; fileCount: number; codeLines: number }[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const statcodePath = join(PROJECTS_DIR, entry.name, '.statcode')
    if (!existsSync(statcodePath)) continue
    try {
      const data: StatCodeData = JSON.parse(await readFile(statcodePath, 'utf-8'))
      projects.push({ name: data.name, fileCount: data.fileCount, codeLines: data.codeLines })
    } catch { /* skip corrupt */ }
  }
  return c.json(projects)
})

app.get('/api/projects/:name', async (c) => {
  const name = c.req.param('name')
  const statcodePath = join(PROJECTS_DIR, name, '.statcode')
  if (!existsSync(statcodePath)) return c.json({ error: 'not found' }, 404)
  try {
    const data: StatCodeData = JSON.parse(await readFile(statcodePath, 'utf-8'))
    return c.json(data)
  } catch {
    return c.json({ error: 'corrupt' }, 500)
  }
})

app.delete('/api/projects/:name', async (c) => {
  const name = c.req.param('name')
  const dir = join(PROJECTS_DIR, name)
  if (!existsSync(dir)) return c.json({ error: 'not found' }, 404)
  await rm(dir, { recursive: true, force: true })
  return c.json({ ok: true })
})

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.cache', 'build', '.svn', '.hg'])

async function scanDir(dirPath: string): Promise<{ fileCount: number; codeLines: number; extensions: StatCodeData['extensions'] }> {
  const extMap: Record<string, { count: number; lines: number }> = {}
  let totalLines = 0
  let totalFiles = 0

  async function walk(p: string) {
    const entries = await readdir(p, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(join(p, entry.name))
      } else if (entry.isFile()) {
        totalFiles++
        const ext = extname(entry.name) || '(no ext)'
        if (!extMap[ext]) extMap[ext] = { count: 0, lines: 0 }
        extMap[ext].count++
        const content = await readFile(join(p, entry.name), 'utf-8').catch(() => '')
        const lines = content.split('\n').length - 1
        extMap[ext].lines += lines
        totalLines += lines
      }
    }
  }

  await walk(dirPath)

  const extensions: StatCodeData['extensions'] = {}
  for (const [ext, info] of Object.entries(extMap)) {
    extensions[ext] = {
      count: info.count,
      lines: info.lines,
      percentage: totalFiles > 0 ? parseFloat(((info.count / totalFiles) * 100).toFixed(1)) : 0,
    }
  }

  return { fileCount: totalFiles, codeLines: totalLines, extensions }
}

app.post('/api/projects', async (c) => {
  const { path: sourcePath } = await c.req.json()
  if (!sourcePath) return c.json({ error: 'path required' }, 400)
  if (!existsSync(sourcePath)) return c.json({ error: 'path not found' }, 404)
  const name = basename(sourcePath)
  const dir = join(PROJECTS_DIR, name)
  if (existsSync(dir)) return c.json({ error: 'project already exists' }, 409)
  const { fileCount, codeLines, extensions } = await scanDir(sourcePath)
  const data: StatCodeData = { name, fileCount, codeLines, extensions }
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, '.statcode'), JSON.stringify(data, null, 2))
  return c.json(data, 201)
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
