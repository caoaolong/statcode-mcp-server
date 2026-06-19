import { useEffect, useRef } from 'react'
import { Graph, treeToGraphData } from '@antv/g6'

const sampleData = {
  id: 'root',
  children: [
    {
      id: 'src',
      children: [
        { id: 'App.tsx', children: [{ id: 'App()' }, { id: 'callTool()' }] },
        { id: 'App.css' },
        { id: 'index.tsx' },
        { id: 'mcp.ts', children: [{ id: 'createMcpServer()' }] },
        { id: 'server.ts', children: [{ id: "app.all('/mcp')" }, { id: 'POST /api/projects' }] },
      ],
    },
    {
      id: 'public',
      children: [
        { id: 'index.html' },
        { id: 'favicon.svg' },
      ],
    },
    {
      id: 'config',
      children: [
        { id: 'vite.config.ts' },
        { id: 'tsconfig.json' },
        { id: 'package.json' },
      ],
    },
  ],
}

export default function Mindmap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)

  useEffect(() => {
    if (!containerRef.current || graphRef.current) return

    const graph = new Graph({
      container: containerRef.current,
      autoFit: 'view',
      data: treeToGraphData(sampleData),
      node: {
        style: {
          labelText: (d) => d.id,
          labelBackground: true,
          labelPlacement: (d) => {
            const parentData = graph.getParentData(d.id, 'tree')
            if (!parentData) return 'right'
            return (d.style!.x! as number) > (parentData.style!.x! as number) ? 'right' : 'left'
          },
          ports: [{ placement: 'right' }, { placement: 'left' }],
        },
        animation: { enter: false },
      },
      edge: {
        type: 'cubic-horizontal',
        animation: { enter: false },
      },
      layout: {
        type: 'mindmap',
        direction: 'H',
        getHeight: () => 32,
        getWidth: () => 32,
        getVGap: () => 4,
        getHGap: () => 64,
      },
      behaviors: ['collapse-expand', 'drag-canvas', 'zoom-canvas'],
      plugins: [
        {
          type: 'toolbar',
          position: 'top-left',
          onClick: (item: string, e: MouseEvent) => {
            switch (item) {
              case 'zoom-in':
                graph.zoomIn()
                break
              case 'zoom-out':
                graph.zoomOut()
                break
              case 'auto-fit':
                graph.fitView()
                break
              case 'reset':
                graph.fitView({ padding: 48 })
                break
              case 'export':
                graph.toDataURL().then(url => {
                  const a = document.createElement('a')
                  a.download = 'graph.png'
                  a.href = url
                  a.click()
                })
                break
            }
          },
          getItems: () => [
            { id: 'zoom-in', value: 'zoom-in' },
            { id: 'zoom-out', value: 'zoom-out' },
            { id: 'redo', value: 'redo' },
            { id: 'undo', value: 'undo' },
            { id: 'edit', value: 'edit' },
            { id: 'delete', value: 'delete' },
            { id: 'auto-fit', value: 'auto-fit' },
            { id: 'export', value: 'export' },
            { id: 'reset', value: 'reset' },
          ],
        },
      ],
    })

    graph.render()
    graphRef.current = graph

    return () => { graph.destroy(); graphRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
