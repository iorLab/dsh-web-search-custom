/**
 * Self-contained tsdown config for the `prepare` lifecycle script.
 *
 * `prepare` runs when pnpm installs this package from git (and before `pnpm
 * publish`), so it cannot assume the monorepo checkout around it: the shared
 * `packages/client/tsdown.client.ts` preset, the platform manifest, and the
 * build-environment helpers are all absent. This file reproduces the two
 * things a real install needs — the Node half (`lib/index.js`,
 * `lib/invariant.js`) and the browser factory (`lib/client.js`) — with the
 * module-table externals and the `__ModuleLoader__.load` handoff spelled out
 * here instead of read from the preset.
 *
 * It deliberately does not type-check or emit `lib/types`: the source is
 * authored with erased type imports only, and the published `.d.ts` come from
 * `tsc -b` in the release path, not from this script.
 */
import { readFileSync } from 'node:fs'
import { isBuiltin } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from 'lightningcss'

const ID = 'dsh-web-search-diy'

// tsdown resolves entry/tsconfig against its build cwd, which becomes this
// config file's directory when loaded via `-c`. Anchor every path to this file
// so the build works regardless of where `prepare` is invoked from.
const fromHere = (rel) => fileURLToPath(new URL(rel, import.meta.url))

// Module-table specifiers this bundle leaves external. The shell's baseline
// (react + runtime/client) is what the factory's injected `require` can answer;
// the rest of this list mirrors the preset's PLATFORM_MODULES for safety even
// though the current source only value-imports react and runtime/client.
const CLIENT_EXTERNALS = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
])

const CSS_VIRTUAL_PREFIX = '\0bbg-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

/** Emit one plugin-owned style injector plus an optional CSS Modules export. */
function styleInjectionModule(id, fileId, css, classMap) {
  const source = [
    `const css = ${JSON.stringify(css)};`,
    `const tagId = ${JSON.stringify(`${id}/${fileId.split('/').at(-1)}`)};`,
    'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
    '  const tag = document.createElement(\'style\');',
    `  tag.dataset.plugin = ${JSON.stringify(id)};`,
    '  tag.dataset.pluginCss = tagId;',
    '  tag.textContent = css;',
    '  document.head.appendChild(tag);',
    '}',
  ]
  source.push(classMap === undefined ? 'export {};' : `export default ${JSON.stringify(classMap)};`)
  return source.join('\n')
}

/** lightningcss CSS Modules: hashed class map + injected style (preset copy). */
function cssModulesPlugin() {
  return {
    name: 'dsh-css-modules-inline',
    resolveId(source, importer) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer !== undefined ? resolve(dirname(importer), source) : source
      return CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = readFileSync(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap = {}
      const entries = Object.entries(cssExports ?? {}).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      for (const [local, exp] of entries) classMap[local] = exp.name
      return styleInjectionModule(ID, fileId, code.toString(), classMap)
    },
  }
}

/** Reject cross-plugin value imports the module table cannot answer (preset copy). */
function purityGate() {
  return {
    name: 'dsh-client-bundle-purity',
    resolveId(source) {
      if (!source.startsWith('@deepseek-ai/')) return null
      if (CLIENT_EXTERNALS.has(source)) return null
      throw new Error(
        `prepare bundle purity: "${source}" is not in the client externals; cross-plugin value imports are forbidden — `
        + 'collaborate through cordis services or add the specifier to CLIENT_EXTERNALS',
      )
    },
  }
}

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
)
const productionDeps = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
  ...Object.keys(manifest.optionalDependencies ?? {}),
])
const isProductionDependency = (specifier) =>
  productionDeps.has(specifier) || [...productionDeps].some((name) => specifier.startsWith(`${name}/`))

export default [
  {
    name: ID,
    entry: [fromHere('../src/index.ts'), fromHere('../src/invariant.ts')],
    outDir: fromHere('../lib'),
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    tsconfig: fromHere('./tsconfig.prepare.json'),
    deps: {
      neverBundle: isProductionDependency,
      alwaysBundle: (specifier) => !isBuiltin(specifier) && !isProductionDependency(specifier),
    },
  },
  {
    name: `${ID}/client`,
    entry: { client: fromHere('../src/client/index.ts') },
    outDir: fromHere('../lib'),
    format: ['cjs'],
    platform: 'browser',
    target: 'es2024',
    dts: false,
    clean: false,
    sourcemap: true,
    tsconfig: fromHere('./tsconfig.prepare.json'),
    deps: {
      neverBundle: (specifier) => CLIENT_EXTERNALS.has(specifier),
      alwaysBundle: (specifier) => !CLIENT_EXTERNALS.has(specifier),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    },
    plugins: [purityGate(), cssModulesPlugin()],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
]
