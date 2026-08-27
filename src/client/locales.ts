/** Page copy for the custom web-search settings section. */
export const en = {
  title: 'Custom Web Search',
  intro: 'Search through an OpenAI-compatible Responses API gateway using its native web_search tool. Changes apply to the next search without a restart.',
  enabled: 'Enabled',
  enabledDescription: 'Turn the custom search provider on or off.',
  model: 'Gateway model',
  modelPlaceholder: 'deepseek-v4-flash',
  baseURL: 'Gateway base URL',
  baseURLPlaceholder: 'https://your-gateway.example.com/v1',
  searchContextSize: 'Search context size',
  searchContextSizeDescription: 'low keeps responses short; high retrieves more sources.',
  maxOutputTokens: 'Max output tokens',
  modelCustom: 'Custom…',
  baseURLCustom: 'Custom…',
  writableHint: 'This connection is read-only; edits are disabled.',
} as const

/** Simplified-Chinese copy. */
export const zh = {
  title: '网页搜索（Custom）',
  intro: '通过 OpenAI 兼容的 Responses 网关接口执行其原生 web_search 工具。改动即时生效，无需重启。',
  enabled: '启用搜索',
  enabledDescription: '开启或关闭 Custom 搜索提供方。',
  model: '网关模型',
  modelPlaceholder: 'deepseek-v4-flash',
  baseURL: '网关地址',
  baseURLPlaceholder: 'https://your-gateway.example.com/v1',
  searchContextSize: '搜索上下文规模',
  searchContextSizeDescription: 'low 响应更短；high 抓取更多来源。',
  maxOutputTokens: '最大输出 token 数',
  modelCustom: '自定义…',
  baseURLCustom: '自定义…',
  writableHint: '当前连接为只读模式，无法编辑。',
} as const
