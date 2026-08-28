请帮我把 DSH 的「网页搜索（Custom）」插件装好。这是一步一步来的任务，请严格照做，每步完成后告诉我结果再继续。

背景：DSH（DeepSeek Harness）已装好且有一个 profile（比如 ~/.dsh/profiles/web，不确定就先 `ls ~/.dsh/profiles/` 看）。插件仓库是 https://github.com/iorLab/dsh-web-search-custom（公开，无需凭证）。它让 DSH 的网页搜索走我自己提供的 OpenAI 兼容网关（/v1/responses + 服务端 web_search 工具），并带一个设置页。

## 第 1 步 · 拿代码并打包
```bash
git clone https://github.com/iorLab/dsh-web-search-custom.git
cd dsh-web-search-custom
corepack pnpm install
corepack pnpm run build
corepack pnpm pack
```
产出 dsh-web-search-custom-0.3.1.tgz。注意：直接 `pnpm pack` 会因缺 node_modules 失败，必须先 install。

## 第 2 步 · 装进 profile
```bash
cd ~/.dsh/profiles/web        # 换成你的 profile 名
corepack pnpm add /path/to/dsh-web-search-custom-0.3.1.tgz
```
装完即挂载：包自带 cordis.patch.yml，会自动把 plugins.web.searchProvider 切到 custom-responses。不要在 profile 的 cordis.patch.yml 里再 - insert 这个包（会 WEB_DUPLICATE_PROVIDER 冲突）。

## 第 3 步 · 配置网关
先问我要这三样，等我给全了再继续：
1. 网关地址（OpenAI 兼容 /v1 根地址）
2. 我的 API key
3. 可用的模型名（如 deepseek-v4-flash）

然后改 ~/.dsh/settings.yaml，在 web-search-custom 键下写：
```yaml
web-search-custom:
  baseURL: <我给的网关地址>
  apiKeyEnv: BBG_AI_MIX_API_KEY      # 环境变量名，key 本体不要写进这个文件
  model: <我给的模型名>
```
再让我把 key 导出成环境变量后重启 DSH：
```bash
export BBG_AI_MIX_API_KEY=<我的key>    # 只进当前 shell，别写进任何文件
```

## 第 4 步 · 验证
1. 重启 DSH：`curl -s http://127.0.0.1:3080/plugins/dsh-web-search-custom/client.js -o /dev/null -w "%{http_code}"` 应输出 200
2. 让我打开 DSH 设置 → 「网页搜索（Custom）」，确认开关已开、模型/地址显示正确
3. 在 DSH 里发一句「用 web_search 搜一条今天的科技新闻」，如果返回带真实来源链接的结果就算全通
4. 如果搜索一直 0 结果但无报错：这不是插件问题，是我网关侧没执行 web_search 工具，换模型名或稍后再试

## 红线
- 别把我的 key 或完整网关地址写进任何会被 git 跟踪、截图、粘贴到聊天记录的文件；settings.yaml 里 key 只允许出现变量名
- 改任何配置文件前先备份
- 遇到 pnpm 报 peer 冲突就停下来问我，不要自作主张加 --force
