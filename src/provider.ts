/**
 * `CustomSearchProvider`: a `WebSearchProvider` backed by any OpenAI-compatible
 * Responses API gateway. One `POST /responses` request carries the
 * native `web_search` tool; the gateway executes the search server-side and
 * returns `web_search_call` output items with the retrieved URLs. The final
 * `message` item's text becomes `content` (the gateway model's grounded
 * answer); sources are URL-only because the gateway exposes no per-result
 * title or snippet on `web_search_call`.
 *
 * The provider reads its options through a per-operation thunk (`resolveOptions`)
 * so settings committed between searches reach the NEXT search without
 * re-registration — mirroring `@deepseek-ai/dsh-web-search-deepseek`.
 * @module dsh-web-search-custom/provider
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'
import type { GatewayErrorResponse, CustomResponsesResponse } from './types.js'

/** Stable id this provider registers under. */
export const CUSTOM_PROVIDER_ID = 'custom-responses'

/** Default endpoint base; `/responses` is appended. */
export const DEFAULT_BASE_URL = 'https://your-gateway.example.com/v1'

/** Default model name for the auxiliary search request. */
export const DEFAULT_MODEL = 'deepseek-v4-flash'

/** Model presets offered by the settings page's combobox (gateway-served ids). */
export const Custom_MODEL_PRESETS = [
  'deepseek-v4-flash',
  'deepseek-v4-pro',
  'deepseek-v4-flash-vision-exp',
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'claude-sonnet-5',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'grok-4.6',
  'glm-5.3',
  'kimi-k3',
  'qwen3.8-max',
] as const

/** Base-URL presets offered by the settings page's combobox. */
export const Custom_BASE_URL_PRESETS = [
  DEFAULT_BASE_URL,
] as const

/** Default `search_context_size` sent with the `web_search` tool. */
export const DEFAULT_SEARCH_CONTEXT_SIZE = 'low'

/** Default upper bound on generated tokens for the Responses request. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 1024

/** Attribution header sent on every request. */
const USER_AGENT = 'dsh-web-search-custom/0.2.0'

/** Resolved provider options for one search operation. */
export interface CustomSearchProviderOptions {
  /** Literal gateway API key; when present it wins over {@link resolveApiKey}. */
  apiKey?: string
  /** Resolve the current gateway API key for one search operation. */
  resolveApiKey?: () => Promise<string | undefined>
  /** Credential reference named by missing-credential diagnostics. */
  apiKeyEnv?: string
  /** Endpoint base; `/responses` is appended. */
  baseURL: string
  /** Gateway model name. */
  model: string
  /** `search_context_size` for the native `web_search` tool. */
  searchContextSize: 'low' | 'medium' | 'high'
  /** Upper bound on generated tokens for the Responses request. */
  maxOutputTokens: number
}

/**
 * Map a Responses API body to a normalized search result: URL-only sources
 * from every `web_search_call` item, deduplicated by URL; `content` from the
 * last `message` item's `output_text` parts, omitted when empty. The web
 * service owns the final `maxResults` truncation, so `truncated` is always
 * `false` here.
 *
 * @param response - the parsed `POST /responses` response body.
 * @returns the normalized result.
 */
export function mapCustomResponse(response: CustomResponsesResponse): WebSearchResult {
  const seen = new Set<string>()
  const sources: WebSearchSource[] = []
  let content: string | undefined
  for (const item of response.output ?? []) {
    if (item.type === 'web_search_call') {
      for (const source of item.action?.sources ?? []) {
        const url = source.url
        if (url === undefined || url.length === 0 || seen.has(url)) continue
        seen.add(url)
        sources.push({ url })
      }
    } else if (item.type === 'message' && item.content !== undefined) {
      content = ''
      for (const part of item.content) {
        if (part.type === 'output_text' && part.text !== undefined) content += part.text
      }
    }
  }
  return {
    sources,
    ...content !== undefined && content.trim().length > 0 ? { content: content.trim() } : {},
    truncated: false,
  }
}

/** The gateway-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class CustomSearchProvider implements WebSearchProvider {
  readonly id = CUSTOM_PROVIDER_ID

  /**
   * @param resolveOptions - the options for the NEXT operation, snapshotted once
   * at each operation's entry so one search never mixes two config sections.
   * A thunk rather than a value because the settings section can change between
   * searches without re-registering this provider.
   */
  constructor(private readonly resolveOptions: () => CustomSearchProviderOptions) {}

  available(): boolean {
    const options = this.resolveOptions()
    return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== undefined)
      && URL.canParse(options.baseURL)
      && isPositiveInteger(options.maxOutputTokens)
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    // One snapshot for the whole operation: credential resolution awaits, and a
    // settings write landing inside that await must not send the key resolved
    // from the old section to the endpoint named by the new one.
    const options = this.resolveOptions()
    throwIfSearchAborted(signal)
    const apiKey = await this.apiKey(options, signal)
    throwIfSearchAborted(signal)
    const endpoint = `${options.baseURL}/responses`
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'accept': 'application/json',
          'user-agent': USER_AGENT,
        },
        body: JSON.stringify({
          model: options.model,
          input: `Perform a web search for the query: ${request.query}`,
          max_output_tokens: options.maxOutputTokens,
          tools: [{ type: 'web_search', search_context_size: options.searchContextSize }],
        }),
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      throw new WebError(`custom web search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }

    if (!response.ok) {
      const status = response.status
      let message = `custom web search gateway error (HTTP ${status})`
      try {
        const parsed = await response.json() as GatewayErrorResponse
        const detail = typeof parsed.error === 'string' ? parsed.error : parsed.error?.message ?? parsed.message
        if (detail !== undefined && detail.length > 0) message = detail
      } catch (error: unknown) {
        // An abort fired mid-body must surface as WEB_ABORTED, not be swallowed
        // into a generic HTTP-error message — cancellation is not a provider
        // error (the seam's cancellation contract).
        if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
        // Otherwise: the HTTP status is already captured in `message` above.
      }
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }

    try {
      const payload = await response.json() as CustomResponsesResponse
      return mapCustomResponse(payload)
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      if (error instanceof WebError) throw error
      throw new WebError(`custom web search returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }

  /**
   * Resolve one operation's credential from the caller's snapshot, so the key
   * and the endpoint it is sent to come from one section.
   * @param options - the operation's option snapshot.
   * @param signal - abort signal for the surrounding search.
   * @returns the resolved key.
   */
  private async apiKey(options: CustomSearchProviderOptions, signal?: AbortSignal): Promise<string> {
    throwIfSearchAborted(signal)
    if (options.apiKey !== undefined && options.apiKey.length > 0) return options.apiKey
    let resolved: string | undefined
    try {
      resolved = await abortable(options.resolveApiKey?.() ?? Promise.resolve(undefined), signal)
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      throw new WebError(`custom web search credential resolution failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
    if (resolved !== undefined && resolved.length > 0) return resolved
    const ref = options.apiKeyEnv ?? 'BBG_AI_MIX_API_KEY'
    throw new WebError(
      `custom web search has no API key for "${ref}"; store it through the credentials service`
      + ' (the web Models page writes it), export it in the launching environment, or set a literal'
      + ' "apiKey" in the web-search-custom config',
      'WEB_PROVIDER_CREDENTIAL_MISSING',
    )
  }
}

/**
 * Race a same-process asynchronous preflight against caller cancellation. The
 * attached settlement handlers keep observing an uncooperative operation after
 * abort so a later rejection cannot become unhandled.
 */
function abortable<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return operation
  if (signal.aborted) return Promise.reject(searchAborted(signal))
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => { reject(searchAborted(signal)) }
    signal.addEventListener('abort', onAbort, { once: true })
    void operation.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(new Error(String(error).replace(/^Error: /u, ''), { cause: error }))
      },
    )
  })
}

/** Throw the provider's stable cancellation error when the caller already aborted. */
function throwIfSearchAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw searchAborted(signal)
}

/** Build the provider's stable cancellation error while retaining the caller's reason. */
function searchAborted(signal?: AbortSignal, fallback?: unknown): WebError {
  return new WebError('custom web search aborted', 'WEB_ABORTED', {
    cause: signal?.aborted === true ? signal.reason : fallback,
  })
}

/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** True for a request limit that can be sent to the gateway (a positive whole number). */
function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}
