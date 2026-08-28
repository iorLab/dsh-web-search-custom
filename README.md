![license](https://img.shields.io/badge/license-MIT-blue)

# dsh-web-search-custom

切换语言 / Switch language — 点击下方标题展开（两部分可同时展开）：

<details open>
<summary><b>English</b></summary>

<br>

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

</details>

<details>
<summary><b>中文</b></summary>

<br>

一个可插拔的 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai) **WebSearchProvider** 插件，附带与原生风格一致的设置页。它调用任意 OpenAI 兼容的 **Responses API** 网关（`/v1/responses`），让网关在服务端执行**原生 `web_search` 工具**，再把结果映射回 DSH 的搜索契约。

曾用名 `@jay/dsh-web-search-bbg` → `dsh-web-search-diy`（0.2.0）→ `dsh-web-search-custom`（0.3.0）。

## 特性

- **Host 半边**：在 DSH 的 `ctx.web` 注册表下注册搜索 provider（`custom-responses`），并向 UI 暴露带命名空间的设置 schema（`web-search-custom`）。
- **Client 半边**：在 DSH 设置弹窗内提供「网页搜索（Custom）/ Custom Web Search」区块——深色两列布局、开关、文本输入框、下拉选择，与原生设计语言一致。
- **实时重配置**：每次搜索都会投影当前设置；修改后下一次搜索立即生效，无需重启。
- 配置项：启用开关、网关模型、网关地址、搜索上下文规模（`low`/`medium`/`high`）、最大输出 token 数。API key 通过 DSH 的凭证解析从环境变量（默认 `BBG_AI_MIX_API_KEY`）读取。

## 安装

需要已安装的 [DeepSeek Harness](https://github.com/deepseek-ai) 及一个 profile（例如 `~/.dsh/profiles/web`）。目前尚未发布到 npm registry——直接从 Git 检出安装：

```bash
git clone https://github.com/iorLab/dsh-web-search-custom.git
cd dsh-web-search-custom
corepack pnpm install
corepack pnpm run build        # 产出 lib/
corepack pnpm pack             # 产出 dsh-web-search-custom-<version>.tgz
```

然后接入你的 profile（把 `web` 换成你的 profile 名）：

```bash
cd ~/.dsh/profiles/web
corepack pnpm add /path/to/dsh-web-search-custom-<version>.tgz
```

整个安装就完成了：包自带 bundle patch，因此把包列进 profile 的 `dependencies` 即会挂载插件，**并在 DSH 重启后自动**选中它为活跃搜索 provider（`plugins.web.searchProvider: custom-responses`）。如果你想显式控制 provider 选择，删除 `node_modules/dsh-web-search-custom/cordis.patch.yml` 里的 `- override:` 块，改为在 profile 自己的 `cordis.patch.yml` 中加：

```yaml
- id: web
  config:
    searchProvider: custom-responses
```

> 请勿再 `- insert` 同一个包：bundles 已经挂载过它，双重挂载会报 `WEB_DUPLICATE_PROVIDER` 错误。

最后存储你的网关 API key，让凭证解析器在搜索时能找到它——要么在启动 DSH 前导出 `apiKeyEnv` 指定的环境变量（默认 `BBG_AI_MIX_API_KEY`），要么通过 DSH 的凭证服务设置：

```bash
export BBG_AI_MIX_API_KEY="<your-key>"
```

随时可以通过 `searchProvider: deepseek-official` 切回 DeepSeek 官方搜索。

## 构建与测试

```bash
corepack pnpm install
corepack pnpm run build   # tsc + tsdown → lib/
corepack pnpm test        # node --test
```

## 配置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| enabled | `true` | 关闭后 provider 会报告不可用 |
| model | `deepseek-v4-flash` | 网关服务的任意模型 id |
| baseURL | *(随包附带的网关地址)* | 任意 OpenAI 兼容的 Responses 根地址；UI 中可下拉选择也可自由输入 |
| searchContextSize | `low` | `low` / `medium` / `high` |
| maxOutputTokens | `1024` | 1–16384 |
| apiKeyEnv | `BBG_AI_MIX_API_KEY` | 通过 DSH 凭证解析的环境变量名 |

## License

MIT

</details>
