/**
 * State projection for the "DIY Web Search" settings section: derives the
 * editable slice of the `web-search-diy` namespace out of the shared describe
 * mirror's namespace views. Mirrors dsh-ui-settings-yaml's fact collection,
 * narrowed to one namespace.
 * @module @jay/dsh-web-search-diy/client-state
 */

/** Whether a value is a plain data object (not an array, null, or class instance). */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The editable slice of this provider's settings section. */
export interface DiySectionConfig {
  enabled?: boolean
  apiKeyEnv?: string
  baseURL?: string
  model?: string
  searchContextSize?: 'low' | 'medium' | 'high'
  maxOutputTokens?: number
}

/**
 * A namespace view: a structural subset of the describe mirror's
 * `SettingsNamespaceView` (ns + revision + the served value).
 */
export interface DiyNamespaceView {
  ns: string
  revision?: number
  value?: unknown
  user?: unknown
}

/** Page snapshot. */
export interface DiySettingsState {
  /** Whether the Host has answered; `unavailable` is the remote-browser state. */
  status: 'loading' | 'ready' | 'unavailable'
  /** Whether the settings provider accepts writes (false on a remote browser). */
  writable: boolean
  /** This plugin's section as currently committed, when present. */
  config: DiySectionConfig
  /** The section's current revision; fences writes when known. */
  revision?: number
}

/** A fresh empty snapshot (the loading/unavailable states share its shape). */
export function emptyDiyState(): DiySettingsState {
  return { status: 'loading', writable: false, config: {} }
}

/** Coerce loose record values into the editable slice; unknown leaves are dropped. */
function normalize(section: Record<string, unknown>): DiySectionConfig {
  return {
    ...(typeof section.enabled === 'boolean' ? { enabled: section.enabled } : {}),
    ...(typeof section.apiKeyEnv === 'string' ? { apiKeyEnv: section.apiKeyEnv } : {}),
    ...(typeof section.baseURL === 'string' ? { baseURL: section.baseURL } : {}),
    ...(typeof section.model === 'string' ? { model: section.model } : {}),
    ...section.searchContextSize === 'low' || section.searchContextSize === 'medium'
      || section.searchContextSize === 'high'
      ? { searchContextSize: section.searchContextSize } : {},
    ...(typeof section.maxOutputTokens === 'number' && Number.isInteger(section.maxOutputTokens)
      ? { maxOutputTokens: section.maxOutputTokens } : {}),
  }
}

/**
 * Project the describe answer's namespaces into this plugin's section config.
 * Reads the `web-search-diy` namespace's `user` layer first (the author's own
 * overrides), falling back to the fully resolved `value`. Non-conforming
 * entries yield an empty config rather than throwing.
 * @param views - per-namespace views currently held by the shared mirror.
 * @returns this plugin's projected state slice (config + revision fence).
 */
export function collectDiyConfig(
  views: readonly DiyNamespaceView[],
): { config: DiySectionConfig; revision?: number } {
  for (const view of views) {
    if (view.ns !== 'web-search-diy') continue
    const section = isObject(view.user)
      ? view.user
      : isObject(view.value) ? view.value : undefined
    return {
      config: section !== undefined ? normalize(section) : {},
      ...(typeof view.revision === 'number' ? { revision: view.revision } : {}),
    }
  }
  return { config: {} }
}

/** Page copy key set (shared by the section and the locale registry). */
export type DiySettingsKey = keyof typeof import('./locales.ts').en
