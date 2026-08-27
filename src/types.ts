/**
 * Wire types for the subset of the upstream gateway's OpenAI-compatible Responses
 * API this provider consumes. Only the fields the search flow actually reads
 * are modeled; everything else is deliberately left unknown.
 * @module dsh-web-search-custom/types
 */

/** One `web_search_call` output item's `action.sources[]` entry. */
export interface ResponsesSearchSource {
  /** Source kind; observed as `url`. */
  readonly type?: string
  /** The source URL; absent entries are dropped. */
  readonly url?: string
}

/** The `action` payload of a `web_search_call` output item. */
export interface ResponsesSearchAction {
  readonly type?: string
  readonly query?: string
  readonly sources?: readonly ResponsesSearchSource[]
}

/** An `output_text` content part of a `message` output item. */
export interface ResponsesOutputTextPart {
  readonly type: 'output_text'
  readonly text?: string
}

/** One entry of the Responses API `output[]`. */
export interface ResponsesOutputItem {
  readonly type?: string
  /** Present on `web_search_call` items: the server-side search the gateway ran. */
  readonly action?: ResponsesSearchAction
  /** Present on `message` items: model-generated text. */
  readonly content?: readonly ResponsesOutputTextPart[]
}

/** The parsed `POST /responses` response body. */
export interface CustomResponsesResponse {
  readonly output?: readonly ResponsesOutputItem[]
}

/** OpenAI-style error envelope. */
export interface GatewayErrorResponse {
  readonly error?: {
    readonly message?: string
  } | string
  readonly message?: string
}
