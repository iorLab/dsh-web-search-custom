![license](https://img.shields.io/badge/license-MIT-blue)

# dsh-web-search-custom

A pluggable [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) **WebSearchProvider** plugin with a native-feeling settings page. It calls any OpenAI-compatible **Responses API** gateway (`/v1/responses`) and lets the gateway execute the **native `web_search` tool** server-side, then maps the results back into DSH's search contract.

原名 `@jay/dsh-web-search-bbg` → `dsh-web-search-diy`（0.2.0）→ `dsh-web-search-custom`（0.3.0）。

## Features

- **Host half**: registers a search provider (`custom-responses`) under DSH's `ctx.web` registry, plus a namespaced settings schema (`web-search-custom`) exposed to the UI.
- **Client half**: a "网页搜索（Custom）/ Custom Web Search" section inside the DSH settings modal — dark two-column rows, toggle switch, text inputs, select, matching the native design language.
- **Live reconfiguration**: every search projects the current settings; edits apply on the next search without a restart.
- Fields: enable switch, gateway model, base URL, search context size (`low`/`medium`/`high`), max output tokens. The API key is read from an environment variable (default `BBG_AI_MIX_API_KEY`) via DSH's credential resolution.

## Install

Requires a [DeepSeek Harness](https://github.com/deepseek-ai) installation with a profile (e.g. `~/.dsh/profiles/web`). No npm registry release yet — install straight from the git checkout:

```bash
git clone https://github.com/iorLab/dsh-web-search-custom.git
cd dsh-web-search-custom
corepack pnpm install
corepack pnpm run build        # emits lib/
corepack pnpm pack             # produces dsh-web-search-custom-<version>.tgz
```

Then wire it into your profile (replace `web` with your profile name):

```bash
cd ~/.dsh/profiles/web
corepack pnpm add /path/to/dsh-web-search-custom-<version>.tgz
```

That is the whole setup: the package ships its own bundle patch, so listing it in the profile's `dependencies` mounts the plugin **and** selects it as the active search provider (`plugins.web.searchProvider: custom-responses`) automatically after a DSH restart. If you would rather keep provider selection explicit, delete the `- override:` block from `node_modules/dsh-web-search-custom/cordis.patch.yml` and add this to your profile's own `cordis.patch.yml` instead:

```yaml
- id: web
  config:
    searchProvider: custom-responses
```

> Do **not** also `- insert` the same package: bundles already mount it, and a double mount fails with `WEB_DUPLICATE_PROVIDER`.

Finish by storing your gateway API key so the credential resolver finds it at search time — either export the env var named by `apiKeyEnv` (default `BBG_AI_MIX_API_KEY`) before launching DSH, or set it through DSH's credential service:

```bash
export BBG_AI_MIX_API_KEY="<your-key>"
```

Switch back to DeepSeek's official search any time with `searchProvider: deepseek-official`.

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
| baseURL | *(shipped gateway URL)* | Any OpenAI-compatible Responses root; editable dropdown + free input in the UI |
| searchContextSize | `low` | `low` / `medium` / `high` |
| maxOutputTokens | `1024` | 1–16384 |
| apiKeyEnv | `BBG_AI_MIX_API_KEY` | Env var name resolved through DSH credentials |

## License

MIT
