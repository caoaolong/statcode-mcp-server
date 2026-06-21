import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import Mindmap from './Mindmap.tsx'

type StatCodeData = {
  name: string
  fileCount: number
  codeLines: number
  extensions: Record<string, { count: number; lines: number; percentage: number }>
  frameworks: string[]
  types: string[]
  description: string
}

const PROJECT_TYPES = [
  '应用客户端', '应用服务端', 'Web服务', 'Web应用', '移动端应用', '系统应用', '小程序应用',
]

type ProjectSummary = {
  name: string
  fileCount: number
  codeLines: number
}

type McpToolMeta = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

// ========= 主页 =========
function HomePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [tools, setTools] = useState<McpToolMeta[]>([])
  const navigate = useNavigate()

  useEffect(() => { fetch('/api/projects').then(r => r.json()).then(setProjects) }, [])
  useEffect(() => { fetch('/api/mcp-tools').then(r => r.json()).then(setTools) }, [])

  async function createProject() {
    const sourcePath = prompt('服务器上项目的绝对路径:')
    if (!sourcePath) return
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: sourcePath }),
    })
    if (res.ok) {
      const data: StatCodeData = await res.json()
      setProjects(prev => [...prev, { name: data.name, fileCount: data.fileCount, codeLines: data.codeLines }])
    } else {
      const err = await res.json()
      alert(err.error)
    }
  }

  async function deleteProject(name: string) {
    if (!confirm(`删除项目 "${name}"？`)) return
    const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (res.ok) setProjects(prev => prev.filter(p => p.name !== name))
  }

  return (
    <div className="home">
      <header className="home-header">
        <h1>StatCode</h1>
        <p className="subtitle">代码统计分析</p>
      </header>
      <section className="tools-section">
        <h2>MCP 工具</h2>
        <p className="subtitle">当前 MCP 服务提供的工具，可通过 <code>/mcp</code> 端点调用</p>
        <div className="tool-list">
          {tools.map(t => (
            <div key={t.name} className="tool-item">
              <span className="tool-name" title={t.description}>{t.name}</span>
              <code className="tool-schema">{JSON.stringify(t.inputSchema)}</code>
            </div>
          ))}
        </div>
      </section>

      <div className="project-grid">
        {projects.map(p => (
          <div key={p.name} className="project-card">
            <div className="card-body" onClick={() => navigate(`/project/${encodeURIComponent(p.name)}/overview`)}>
              <h3>{p.name}</h3>
              <div className="card-stats">
                <span>{p.fileCount} 文件</span>
                <span>{p.codeLines} 行</span>
              </div>
            </div>
            <button className="card-delete" onClick={e => { e.stopPropagation(); deleteProject(p.name) }} title="删除">✕</button>
          </div>
        ))}
        <div className="project-card add-card" onClick={createProject}>
          <span className="add-icon">+</span>
          <span>新建项目</span>
        </div>
      </div>
    </div>
  )
}

// ========= 项目详情 =========
const sidebarPages = [
  { key: 'overview', label: '概览', path: 'overview' },
  { key: 'structure', label: '项目架构', path: 'structure' },
] as const

function ProjectPage() {
  const { name, page } = useParams()
  const navigate = useNavigate()

  const [projectData, setProjectData] = useState<StatCodeData | null>(null)
  const [editing, setEditing] = useState(false)
  const [editFrameworks, setEditFrameworks] = useState('')
  const [editTypes, setEditTypes] = useState<string[]>([])
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    if (name) {
      fetch(`/api/projects/${encodeURIComponent(name)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          setProjectData(d)
          if (d) {
            setEditFrameworks((d.frameworks ?? []).join(', '))
            setEditTypes(d.types ?? [])
            setEditDescription(d.description ?? '')
          }
        })
    }
  }, [name])

  function startEdit() {
    if (!projectData) return
    setEditFrameworks((projectData.frameworks ?? []).join(', '))
    setEditTypes(projectData.types ?? [])
    setEditDescription(projectData.description ?? '')
    setEditing(true)
  }

  function toggleType(t: string) {
    setEditTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function saveEdit() {
    if (!projectData || !name) return
    const frameworks = editFrameworks.split(',').map(s => s.trim()).filter(Boolean)
    const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameworks, types: editTypes, description: editDescription }),
    })
    if (res.ok) {
      setProjectData(await res.json())
      setEditing(false)
    }
  }

  const validPages = sidebarPages.map(p => p.key)
  if (!page || !validPages.includes(page)) {
    return <Navigate to={`/project/${encodeURIComponent(name || '')}/overview`} replace />
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 className="sidebar-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>{name}</h1>
        <nav>
          {sidebarPages.map(p => (
            <button
              key={p.key}
              className={`nav-item${page === p.key ? ' active' : ''}`}
              onClick={() => navigate(`/project/${encodeURIComponent(name || '')}/${p.path}`)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="main">
        {page === 'overview' && projectData && (
          <>
            <section className="project-info-section">
              <div className="section-header">
                <h2>项目信息</h2>
                {!editing && <button className="btn-sm" onClick={startEdit}>编辑</button>}
              </div>
              {editing ? (
                <div className="info-editor">
                  <label>框架（多个用逗号分隔）</label>
                  <input value={editFrameworks} onChange={e => setEditFrameworks(e.target.value)} placeholder="如: React, Vue, Express" />
                  <label>项目类型（可多选）</label>
                  <div className="checkbox-group">
                    {PROJECT_TYPES.map(t => (
                      <label key={t} className="checkbox-label">
                        <input type="checkbox" checked={editTypes.includes(t)} onChange={() => toggleType(t)} />
                        {t}
                      </label>
                    ))}
                  </div>
                  <label>项目介绍</label>
                  <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} placeholder="简单介绍此项目..." />
                  <div className="info-editor-actions">
                    <button className="btn-sm btn-cancel" onClick={() => setEditing(false)}>取消</button>
                    <button className="btn-sm" onClick={saveEdit}>保存</button>
                  </div>
                </div>
              ) : (
                <div className="info-display">
                  <div className="info-row">
                    <span className="info-label">框架</span>
                    <span className="info-value">
                      {projectData.frameworks && projectData.frameworks.length > 0
                        ? projectData.frameworks.map(f => <span key={f} className="tag">{f}</span>)
                        : <span className="empty">未设置</span>}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">项目类型</span>
                    <span className="info-value">
                      {projectData.types && projectData.types.length > 0
                        ? projectData.types.map(t => <span key={t} className="tag">{t}</span>)
                        : <span className="empty">未设置</span>}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">项目介绍</span>
                    <span className="info-value">{projectData.description || <span className="empty">未设置</span>}</span>
                  </div>
                </div>
              )}
            </section>
            <section>
              <h2>概览</h2>
              <div className="overview-stats">
                <div className="stat-card">
                  <span className="stat-value">{projectData.fileCount}</span>
                  <span className="stat-label">文件数</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{projectData.codeLines}</span>
                  <span className="stat-label">代码行数</span>
                </div>
              </div>
            </section>
            <section>
              <h2>文件占比</h2>
              {Object.keys(projectData.extensions).length === 0 && (
                <p className="empty">暂无数据</p>
              )}
              {Object.entries(projectData.extensions).sort(([, a], [, b]) => b.percentage - a.percentage).map(([ext, info]) => (
                <div key={ext} className="ext-row">
                  <span className="ext-name">{ext}</span>
                  <div className="ext-bar-bg">
                    <div className="ext-bar-fill" style={{ width: `${info.percentage}%` }} />
                  </div>
                  <span className="ext-pct">{info.percentage.toFixed(1)}%</span>
                  <span className="ext-count">{info.count} 文件 / {info.lines} 行</span>
                </div>
              ))}
            </section>
          </>
        )}
        {page === 'structure' && (
          <section>
            <h2>项目架构</h2>
            <Mindmap />
          </section>
        )}
      </main>
    </div>
  )
}

// ========= 根组件 =========
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/project/:name/:page" element={<ProjectPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
