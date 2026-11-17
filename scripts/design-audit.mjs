#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const CHECKLIST = join(ROOT, 'docs/design/prototipo/checklist.json')
const SKIP_DIRS = new Set(['node_modules', 'out', 'dist', '.git', 'graphify-out', 'site'])

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*'
      i += glob[i + 2] === '/' ? 2 : 1
    } else if (c === '*') re += '[^/]*'
    else if (c === '{') {
      const end = glob.indexOf('}', i)
      re +=
        '(?:' +
        glob
          .slice(i + 1, end)
          .split(',')
          .map(escape)
          .join('|') +
        ')'
      i = end
    } else re += escape(c)
  }
  return new RegExp('^' + re + '$')
}

function escape(s) {
  return s.replace(/[.+?^$()|[\]\\]/g, '\\$&')
}

let fileCache
function allFiles() {
  if (fileCache) return fileCache
  fileCache = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) walk(full)
      else fileCache.push(relative(ROOT, full).split(sep).join('/'))
    }
  }
  walk(ROOT)
  return fileCache
}

function matchFiles(globs) {
  const res = [].concat(globs).map(globToRegExp)
  return allFiles().filter((f) => res.some((re) => re.test(f)))
}

function countMatches(files, pattern) {
  const re = new RegExp(pattern, 'gm')
  const hits = []
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), 'utf8')
    const n = (text.match(re) || []).length
    if (n) hits.push({ file: f, n })
  }
  return hits
}

function packageDeps() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  return { ...pkg.dependencies, ...pkg.devDependencies }
}

function evaluate(item) {
  const c = item.check
  switch (c.tipo) {
    case 'manual':
      return item.validado
        ? { ok: true, detalhe: `validado pelo usuário em ${item.validado}` }
        : { ok: null, detalhe: 'aguarda validação visual do usuário' }
    case 'arquivo': {
      const missing = [].concat(c.caminho).filter((p) => !existsSync(join(ROOT, p)))
      return {
        ok: missing.length === 0,
        detalhe: missing.length ? `faltando: ${missing.join(', ')}` : 'existe'
      }
    }
    case 'sem-arquivo': {
      const present = [].concat(c.caminho).filter((p) => existsSync(join(ROOT, p)))
      return {
        ok: present.length === 0,
        detalhe: present.length ? `ainda existe: ${present.join(', ')}` : 'removido'
      }
    }
    case 'dependencia': {
      const deps = packageDeps()
      const missing = [].concat(c.nome).filter((n) => !deps[n])
      return {
        ok: missing.length === 0,
        detalhe: missing.length ? `ausente: ${missing.join(', ')}` : 'instalada'
      }
    }
    case 'sem-dependencia': {
      const deps = packageDeps()
      const present = [].concat(c.nome).filter((n) => deps[n])
      return {
        ok: present.length === 0,
        detalhe: present.length ? `ainda presente: ${present.join(', ')}` : 'removida'
      }
    }
    case 'contem': {
      const files = matchFiles(c.arquivos)
      if (!files.length)
        return { ok: false, detalhe: `nenhum arquivo casa com ${[].concat(c.arquivos).join(', ')}` }
      const hits = countMatches(files, c.padrao)
      const total = hits.reduce((s, h) => s + h.n, 0)
      const min = c.minimo ?? 1
      return {
        ok: total >= min,
        detalhe: `${total} ocorrência(s) de /${c.padrao}/ (mínimo ${min})`
      }
    }
    case 'ausente': {
      const files = matchFiles(c.arquivos)
      const hits = countMatches(files, c.padrao)
      if (!hits.length) return { ok: true, detalhe: 'nenhuma ocorrência' }
      const top = hits
        .sort((a, b) => b.n - a.n)
        .slice(0, 3)
        .map((h) => `${h.file} (${h.n})`)
      const total = hits.reduce((s, h) => s + h.n, 0)
      return {
        ok: false,
        detalhe: `${total} ocorrência(s) em ${hits.length} arquivo(s): ${top.join(', ')}`
      }
    }
    default:
      return { ok: false, detalhe: `tipo de verificação desconhecido: ${c.tipo}` }
  }
}

const checklist = JSON.parse(readFileSync(CHECKLIST, 'utf8'))
const fase = option('fase')
const results = checklist.itens
  .filter((it) => !fase || it.fase === fase)
  .map((it) => ({ ...it, resultado: evaluate(it) }))

if (flag('json')) {
  console.log(JSON.stringify(results, null, 2))
} else {
  const icon = (r) => (r.ok === true ? '✓' : r.ok === null ? '○' : '✗')
  const byPhase = new Map()
  for (const r of results) byPhase.set(r.fase, [...(byPhase.get(r.fase) || []), r])
  for (const [f, items] of byPhase) {
    const title = checklist.fases?.[f] ?? ''
    const done = items.filter((r) => r.resultado.ok === true).length
    console.log(`\n${f} ${title} — ${done}/${items.length}`)
    for (const r of items) {
      if (flag('pendentes') && r.resultado.ok === true) continue
      console.log(`  ${icon(r.resultado)} ${r.id} ${r.titulo}`)
      if (r.resultado.ok !== true) console.log(`      ${r.resultado.detalhe}`)
    }
  }
  const ok = results.filter((r) => r.resultado.ok === true).length
  const manual = results.filter((r) => r.resultado.ok === null).length
  const fail = results.length - ok - manual
  console.log(
    `\nTotal: ${ok} ok · ${fail} faltando · ${manual} aguardando validação visual · ${results.length} itens`
  )
}

if (flag('strict') && results.some((r) => r.resultado.ok === false)) process.exit(1)
