/**
 * Hermetic tests for the bbg web-search provider: response mapping,
 * availability, credential/error paths, the full HTTP flow against a stubbed
 * global fetch (redirect policy asserted), and the settings-driven
 * per-operation projection (enabled switch, live model changes). A live
 * gateway case runs only when BBG_TEST_KEY is exported.
 *
 * Errors are asserted by `.code`, not `instanceof WebError`: the seam and its
 * providers can load separate copies of `@deepseek-ai/dsh-web`, and identity
 * checks would be fragile across package instances.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { DiySearchProvider, BBG_PROVIDER_ID } from '../lib/index.js'
import { mapDiyResponse } from '../lib/provider.js'

const BASE = {
  baseURL: 'https://your-gateway.example.com/v1',
  model: 'deepseek-v4-flash',
  searchContextSize: 'low',
  maxOutputTokens: 512,
}

const okResponse = (body) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'content-type': 'application/json' },
})

/** Run fn with globalThis.fetch replaced; restores the original afterwards. */
async function withFetch(impl, fn) {
  const original = globalThis.fetch
  globalThis.fetch = impl
  try {
    return await fn()
  } finally {
    globalThis.fetch = original
  }
}

test('mapDiyResponse: dedupes urls, drops url-less sources, keeps content from message item', () => {
  const result = mapDiyResponse({
    output: [
      { type: 'web_search_call', action: { query: 'q', type: 'search', sources: [
        { type: 'url', url: 'https://a.example/1' },
        { type: 'url', url: 'https://b.example/2' },
        { type: 'url', url: 'https://a.example/1' },
        { type: 'url' },
      ] } },
      { type: 'reasoning', content: [] },
      { type: 'message', content: [{ type: 'output_text', text: 'Grounded answer.' }] },
    ],
  })
  assert.deepEqual(result.sources.map(s => s.url), ['https://a.example/1', 'https://b.example/2'])
  assert.equal(result.content, 'Grounded answer.')
  assert.equal(result.truncated, false)
})

test('mapDiyResponse: empty output yields no sources and no content', () => {
  const result = mapDiyResponse({ output: [] })
  assert.deepEqual(result.sources, [])
  assert.equal(result.content, undefined)
  assert.equal(result.truncated, false)
})

test('mapDiyResponse: message item without text parts omits content', () => {
  const result = mapDiyResponse({ output: [{ type: 'message', content: [] }] })
  assert.equal(result.content, undefined)
})

test('available(): literal key or resolver → true; missing credential or bad limit → false', () => {
  assert.equal(new DiySearchProvider(() => ({ ...BASE, apiKey: 'x' })).available(), true)
  assert.equal(new DiySearchProvider(() => ({ ...BASE, resolveApiKey: async () => 'x' })).available(), true)
  assert.equal(new DiySearchProvider(() => BASE).available(), false)
  assert.equal(new DiySearchProvider(() => ({ ...BASE, apiKey: 'x', maxOutputTokens: 0 })).available(), false)
  assert.equal(new DiySearchProvider(() => ({ ...BASE, apiKey: 'x', baseURL: 'not a url' })).available(), false)
})

test('available() follows each per-operation projection (settings toggle)', () => {
  let options = { ...BASE, apiKey: 'x' }
  const provider = new DiySearchProvider(() => options)
  assert.equal(provider.available(), true)
  // The disabled projection: the plugin hands over unusable placeholder options.
  options = { baseURL: '', model: '', searchContextSize: 'low', maxOutputTokens: 0 }
  assert.equal(provider.available(), false)
  options = { ...BASE, apiKey: 'x' }
  assert.equal(provider.available(), true)
})

test('search without a credential fails WEB_PROVIDER_CREDENTIAL_MISSING before any dispatch', async () => {
  await withFetch(() => assert.fail('must not dispatch without a key'), async () => {
    await assert.rejects(
      new DiySearchProvider(() => ({ ...BASE, apiKeyEnv: 'BBG_TEST_KEY' })).search({ query: 'x' }),
      (error) => error.code === 'WEB_PROVIDER_CREDENTIAL_MISSING',
    )
  })
})

test('search posts a native web_search Responses request and maps the result', async () => {
  let captured
  await withFetch(async (input, init) => {
    captured = { url: String(input), init, body: JSON.parse(init.body) }
    return okResponse({ output: [
      { type: 'web_search_call', action: { sources: [{ type: 'url', url: 'https://r.example/1' }] } },
      { type: 'message', content: [{ type: 'output_text', text: 'Found it.' }] },
    ] })
  }, async () => {
    const result = await new DiySearchProvider(() => ({ ...BASE, apiKey: 'k' })).search({ query: 'hello', maxResults: 3 })
    assert.deepEqual(result.sources.map(s => s.url), ['https://r.example/1'])
    assert.equal(result.content, 'Found it.')
  })
  assert.equal(captured.url, `${BASE.baseURL}/responses`)
  assert.equal(captured.init.redirect, 'error', 'credentialed request must reject redirects')
  assert.equal(captured.body.model, BASE.model)
  assert.equal(captured.body.tools[0].type, 'web_search')
  assert.equal(captured.body.tools[0].search_context_size, 'low')
  assert.match(captured.body.input, /hello/)
})

test('options are snapshotted per operation: a change between searches reaches the next one', async () => {
  let options = { ...BASE, apiKey: 'k' }
  const bodies = []
  await withFetch(async (_input, init) => {
    bodies.push(JSON.parse(init.body))
    return okResponse({ output: [{ type: 'web_search_call', action: { sources: [] } }] })
  }, async () => {
    const provider = new DiySearchProvider(() => options)
    await provider.search({ query: 'first' })
    options = { ...BASE, apiKey: 'k', model: 'glm-5.3-flash', searchContextSize: 'high' }
    await provider.search({ query: 'second' })
  })
  assert.equal(bodies[0].model, 'deepseek-v4-flash')
  assert.equal(bodies[1].model, 'glm-5.3-flash', 'committed section must reach the next search')
  assert.equal(bodies[1].tools[0].search_context_size, 'high')
})

test('HTTP error surfaces the gateway message as WEB_PROVIDER_ERROR', async () => {
  await withFetch(async () => new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 401 }), async () => {
    await assert.rejects(
      new DiySearchProvider(() => ({ ...BASE, apiKey: 'k' })).search({ query: 'x' }),
      (error) => error.code === 'WEB_PROVIDER_ERROR' && error.message === 'boom',
    )
  })
})

test('pre-aborted search fails WEB_ABORTED', async () => {
  const controller = new AbortController()
  controller.abort()
  await withFetch(() => assert.fail('must not dispatch after abort'), async () => {
    await assert.rejects(
      new DiySearchProvider(() => ({ ...BASE, apiKey: 'k' })).search({ query: 'x' }, controller.signal),
      (error) => error.code === 'WEB_ABORTED',
    )
  })
})

test('live: compiled provider completes a real gateway search', { skip: process.env.BBG_TEST_KEY === undefined }, async () => {
  const provider = new DiySearchProvider(() => ({ ...BASE, apiKey: process.env.BBG_TEST_KEY }))
  assert.equal(provider.id, BBG_PROVIDER_ID)
  const result = await provider.search({ query: 'latest AI news today', maxResults: 5 })
  assert.ok(result.sources.length > 0)
  assert.ok(result.sources.every(s => URL.canParse(s.url)))
  assert.ok(typeof result.content === 'string' && result.content.length > 20)
})
