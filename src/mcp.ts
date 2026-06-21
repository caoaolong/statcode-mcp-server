import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export type McpToolMeta = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const toolMetas: McpToolMeta[] = [
  {
    name: 'statcode_create_project',
    description: '创建或获取 Statcode 项目，扫描指定目录的代码统计数据',
    inputSchema: { path: 'string' },
  },
  {
    name: 'statcode_base_analysis',
    description: '对项目进行基础分析，补全类型、框架、介绍信息',
    inputSchema: { id: 'string', description: 'string', frameworks: 'string[]', types: 'string[]' },
  },
]

export function createMcpServer() {
  return new McpServer({
    name: 'statcode-mcp-server',
    version: '0.0.1',
  })
}
