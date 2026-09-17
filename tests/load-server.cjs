const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Execute actual route and domain modules with explicitly injected infrastructure.
// No local .env files or cloud credentials are read by these tests.
module.exports = function loader(overrides) {
  const root = path.resolve(__dirname, '..')
  const cache = new Map()
  const normalized = new Map(Object.entries(overrides).map(([key, value]) => [path.resolve(root, key), value]))
  function load(file) {
    file = path.resolve(root, file)
    if (!path.extname(file)) file += '.ts'
    if (normalized.has(file)) return normalized.get(file)
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const injectedRequire = (id) => {
      if (id === 'server-only') return {}
      if (Object.hasOwn(overrides, id)) return overrides[id]
      if (id.startsWith('@/')) return load(path.join(root, id.slice(2)))
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id))
      return require(id)
    }
    new Function('require', 'module', 'exports', js)(injectedRequire, mod, mod.exports)
    return mod.exports
  }
  return load
}
