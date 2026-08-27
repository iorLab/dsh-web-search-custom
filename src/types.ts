/**
 * Wire types for the subset of the bbg gateway's OpenAI-compatible Responses
 * API this provider consumes. Only the fields the search flow actually reads
 * are modeled; everything else is deliberately left unknown.
 * @module @jay/dsh-web-search-diy/types
 */

/** One `web_search_call` output item's `action.sources[]` entry. */
export interface BbgSearchSource {
  /** Source kind; observed as `url`. */
  readonly type?: string
  /** The source URL; absent entries are dropped. */
  readonly url?: string
}

/** The `action` payload of a `web_search_call` output item. */
export interface BbgSearchAction {
  readonly type?: string
  readonly query?: string
  readonly sources?: readonly BbgSearchSource[]
}

/** An `output_text` content part of a `message` output item. */
export interface BbgOutputTextPart {
  readonly type: 'output_text'
  readonly text?: string
}

/** One entry of the Responses API `output[]`. */
export interface BbgOutputItem {
  readonly type?: string
  /** Present on `web_search_call` items: the server-side search the gateway ran. */
  readonly action?: BbgSearchAction
  /** Present on `message` items: model-generated text. */
  readonly content?: readonly BbgOutputTextPart[]
}

/** The parsed `POST /responses` response body. */
export interface BbgResponsesResponse {
  readonly output?: readonly BbgOutputItem[]
}

/** OpenAI-style error envelope. */
export interface BbgErrorResponse {
  readonly error?: {
    readonly message?: string
  } | string
  readonly message?: string
}
