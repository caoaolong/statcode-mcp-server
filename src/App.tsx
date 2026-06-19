import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import Mindmap from './Mindmap.tsx'

type StatCodeData = {
  name: string
  fileCount: number
  codeLines: number
  extensions: Record<string, { count: number; lines: number; percentage: number }>
}

type ProjectSummary = {
  name: string
  fileCount: number
  codeLines: number
}

// ========= 主页 =========
function HomePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const navigate = useNavigate()

  useEffect(() => { fetch('/api/projects').then(r => r.json()).then(setProjects) }, [])

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

  useEffect(() => {
    if (name) {
      fetch(`/api/projects/${encodeURIComponent(name)}`)
        .then(r => r.ok ? r.json() : null)
        .then(setProjectData)
    }
  }, [name])

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
