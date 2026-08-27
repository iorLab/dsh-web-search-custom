![license](https://img.shields.io/badge/license-MIT-blue)

# dsh-web-search-diy

A pluggable [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) **WebSearchProvider** plugin with a native-feeling settings page. It calls any OpenAI-compatible **Responses API** gateway (`/v1/responses`) and lets the gateway execute the **native `web_search` tool** server-side, then maps the results back into DSH's search contract.

原名 `@jay/dsh-web-search-bbg`，自 0.2.0 起改名 `dsh-web-search-diy`。

## Features

- **Host half**: registers a search provider (`diy-responses`) under DSH's `ctx.web` registry, plus a namespaced settings schema (`web-search-diy`) exposed to the UI.
- **Client half**: a "网页搜索（DIY）/ DIY Web Search" section inside the DSH settings modal — dark two-column rows, toggle switch, text inputs, select, matching the native design language.
- **Live reconfiguration**: every search projects the current settings; edits apply on the next search without a restart.
- Fields: enable switch, gateway model, base URL, search context size (`low`/`medium`/`high`), max output tokens. The API key is read from an environment variable (default `BBG_AI_MIX_API_KEY`) via DSH's credential resolution.

## Install

```bash
corepack pnpm pack
# in your profile directory (~/.dsh/profiles/<name>):
corepack pnpm add /path/to/dsh-web-search-diy-<version>.tgz
```

Add the package to `package.json`'s `dsh.profile.bundles`, and point the search provider at it in `cordis.patch.yml`:

```yaml
- id: web
  config:
    searchProvider: diy-responses
```

> Do **not** also `- insert` the same package: bundles already mount it, and a double mount fails with `WEB_DUPLICATE_PROVIDER`.

## Build & test

```bash
corepack pnpm install
corepack pnpm run build   # tsc + tsdown → lib/
corepack pnpm test        # node --test
```

## Configuration

| Field | Default | Notes |
| --- | --- | --- |
| enabled | `true` | Turning off makes the provider report unavailable |
| model | `deepseek-v4-flash` | Any model id the gateway serves |
| baseURL | *(gateway endpoint)* | OpenAI-compatible Responses root |
| searchContextSize | `low` | `low` / `medium` / `high` |
| maxOutputTokens | `1024` | 1–16384 |
| apiKeyEnv | `BBG_AI_MIX_API_KEY` | Env var name resolved through DSH credentials |

## License

MIT
