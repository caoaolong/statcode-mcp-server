import { useState } from 'react'

type ToolResult = {
  tool: string
  args: string
  result: string
}

function App() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [slugInput, setSlugInput] = useState('')
  const [results, setResults] = useState<ToolResult[]>([])

  async function callTool(name: string, args: Record<string, unknown>) {
    const res = await fetch('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    })
    const body = await res.json()
    const text = body.result?.content?.[0]?.text ?? JSON.stringify(body)
    setResults(prev => [{ tool: name, args: JSON.stringify(args), result: text }, ...prev])
  }

  return (
    <div className="app">
      <h1>StatCode MCP Server</h1>
      <p className="subtitle">Web + MCP 同端口演示</p>

      <section>
        <h2>🧮 add — 两数相加</h2>
        <div className="row">
          <input type="number" value={a} onChange={e => setA(e.target.value)} placeholder="a" />
          <span>+</span>
          <input type="number" value={b} onChange={e => setB(e.target.value)} placeholder="b" />
          <button onClick={() => callTool('add', { a: Number(a), b: Number(b) })}>调用</button>
        </div>
      </section>

      <section>
        <h2>🔗 toSlug — 字符串转 slug</h2>
        <div className="row">
          <input type="text" value={slugInput} onChange={e => setSlugInput(e.target.value)} placeholder="Hello World" />
          <button onClick={() => callTool('toSlug', { text: slugInput })}>调用</button>
        </div>
      </section>

      <section>
        <h2>📋 调用记录</h2>
        {results.length === 0 && <p className="empty">暂无调用，试试上面的工具</p>}
        {results.map((r, i) => (
          <div key={i} className="log-entry">
            <strong>{r.tool}</strong>
            <code>{r.args}</code>
            <span>→</span>
            <code>{r.result}</code>
          </div>
        ))}
      </section>
    </div>
  )
}

export default App
