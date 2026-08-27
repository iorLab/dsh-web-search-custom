/**
 * Register a bbg-gateway-backed provider in `ctx.web`. It calls the gateway's
 * OpenAI-compatible Responses API with the native `web_search` tool, which the
 * gateway executes server-side, so no dedicated search API or third-party
 * search key is needed. The provider resolves the same `BBG_AI_MIX_API_KEY`
 * credential reference the chat LLM adapter uses, at each search.
 *
 * A settings section (`web-search-diy`) carries an `enabled` switch and the
 * gateway route (model, base URL, context size, token bound). The section is
 * installed through `installSettingsSection` and projected per search, so a
 * committed change — including toggling `enabled` off/on — reaches the next
 * search without a restart. While disabled the provider reports unavailable;
 * if it was the seam's selected provider the tool surfaces that as a search
 * failure rather than silently falling back.
 * @module @jay/dsh-web-search-diy
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-web'
import {
  DiySearchProvider,
  BBG_DEFAULT_BASE_URL,
  BBG_DEFAULT_MAX_OUTPUT_TOKENS,
  BBG_DEFAULT_MODEL,
  BBG_DEFAULT_SEARCH_CONTEXT_SIZE,
} from './provider.js'
import type { DiySearchProviderOptions } from './provider.js'

export {
  BBG_DEFAULT_BASE_URL,
  BBG_DEFAULT_MAX_OUTPUT_TOKENS,
  BBG_DEFAULT_MODEL,
  BBG_DEFAULT_SEARCH_CONTEXT_SIZE,
  BBG_PROVIDER_ID,
  DiySearchProvider,
} from './provider.js'
export type { DiySearchProviderOptions } from './provider.js'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-diy'

/** The web seam this provider registers into. */
export const inject = ['web']

const DEFAULT_API_KEY_ENV = 'BBG_AI_MIX_API_KEY'

/** Plugin config (all optional — defaults make the provider usable out of the box). */
export interface Config {
  /**
   * Master switch for this search provider. When false the provider reports
   * unavailable and the web seam routes searches elsewhere (or fails as
   * `WEB_PROVIDER_CONFIGURED_UNAVAILABLE` / `WEB_PROVIDER_UNAVAILABLE`).
   */
  enabled?: boolean
  /** Literal gateway API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey?: string
  /** Credential reference resolved for each search; defaults to `BBG_AI_MIX_API_KEY`. */
  apiKeyEnv?: string
  /** OpenAI-compatible endpoint base; `/responses` is appended. */
  baseURL?: string
  /** Gateway model name. Defaults to `deepseek-v4-flash`. */
  model?: string
  /** `search_context_size` for the native `web_search` tool. Defaults to `low`. */
  searchContextSize?: 'low' | 'medium' | 'high'
  /** Upper bound on generated tokens for the Responses request. Defaults to 1024. */
  maxOutputTokens?: number
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  apiKey: z.string().role('secret'),
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
  baseURL: z.string(),
  // Defaults are declared here rather than only at the use site: a
  // configuration surface renders the resolved section, so a default the
  // schema does not carry reads there as no value at all.
  model: z.string().default(BBG_DEFAULT_MODEL),
  searchContextSize: z.union(['low', 'medium', 'high'] as const).default('low'),
  maxOutputTokens: z.number().step(1).min(1).max(16384).default(BBG_DEFAULT_MAX_OUTPUT_TOKENS),
})

/** Settings namespace carrying this provider's switch and gateway route. */
export const WEB_SEARCH_BBG_SETTINGS_NAMESPACE = settingsNamespace('web-search-diy')

/**
 * Project one resolved section into the options the provider serves its next
 * search with. Every value it reads is already fully defaulted by the schema.
 * @param ctx - plugin context supplying the credential plane.
 * @param config - the currently authoritative section.
 * @returns options for one search.
 */
function resolveOptions(ctx: Context, config: Config): DiySearchProviderOptions {
  const apiKeyEnv = (config.apiKeyEnv ?? DEFAULT_API_KEY_ENV) as CredentialRef
  return {
    ...config.apiKey !== undefined && config.apiKey.length > 0 ? { apiKey: config.apiKey } : {},
    resolveApiKey: async () => {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) return (await credentials.resolve(apiKeyEnv))?.value
      // Without the seam the process environment is the whole credential plane.
      const ambient = process.env[apiKeyEnv]
      return ambient !== undefined && ambient.length > 0 ? ambient : undefined
    },
    apiKeyEnv,
    baseURL: config.baseURL ?? BBG_DEFAULT_BASE_URL,
    model: config.model ?? BBG_DEFAULT_MODEL,
    searchContextSize: config.searchContextSize ?? BBG_DEFAULT_SEARCH_CONTEXT_SIZE,
    maxOutputTokens: config.maxOutputTokens ?? BBG_DEFAULT_MAX_OUTPUT_TOKENS,
  }
}

/** Register the bbg search provider with `ctx.web`, following its settings section. */
export function apply(ctx: Context, config: Config = {}): void {
  let current: () => Config = () => config
  installSettingsSection(ctx, WEB_SEARCH_BBG_SETTINGS_NAMESPACE, Config, config, {
    setSource: (source) => {
      current = source
    },
    // The registration carries no resolved state to re-judge: availability is
    // judged per operation from the projected section, so a committed change
    // needs no re-registration.
    onChange: () => {},
  })
  ctx.web.registerSearchProvider(new DiySearchProvider(() => {
    const section = current()
    // The enabled gate rides the per-operation projection: when off, report
    // unavailable; when on, project the real options. `available()` runs on
    // the same projection, so both checks see one authoritative snapshot.
    return section.enabled === false
      ? { baseURL: '', model: '', searchContextSize: 'low', maxOutputTokens: 0 }
      : resolveOptions(ctx, section)
  }))
}
