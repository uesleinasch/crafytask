#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const CHECKLIST = join(ROOT, 'docs/design/prototipo/checklist.json')
const SKIP_DIRS = new Set(['node_modules', 'out', 'dist', '.git', 'graphify-out', 'site'])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const SCHEMA = {
  manual: [],
  arquivo: ['caminho'],
  'sem-arquivo': ['caminho'],
  dependencia: ['nome'],
  'sem-dependencia': ['nome'],
  contem: ['arquivos', 'padrao'],
  'contem-todos': ['arquivos', 'padroes'],
  ausente: ['arquivos', 'padrao']
}
const OPTIONAL = new Set(['tipo', 'minimo', 'flags'])

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

function globToRegExp(glob) {
  return new RegExp('^' + globBody(glob) + '$')
}

function globBody(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*'
      i += glob[i + 2] === '/' ? 2 : 1
    } else if (c === '*') re += '[^/]*'
    else if (c === '{') {
      const end = closingBrace(glob, i)
      re +=
        '(?:' +
        splitTopLevel(glob.slice(i + 1, end))
          .map(globBody)
          .join('|') +
        ')'
      i = end
    } else re += escape(c)
  }
  return re
}

function closingBrace(glob, open) {
  let depth = 0
  for (let i = open; i < glob.length; i++) {
    if (glob[i] === '{') depth++
    else if (glob[i] === '}' && --depth === 0) return i
  }
  throw new Error(`chave sem fechamento em ${glob}`)
}

function splitTopLevel(body) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{') depth++
    else if (body[i] === '}') depth--
    else if (body[i] === ',' && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  parts.push(body.slice(start))
  return parts
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

function countMatches(files, pattern, flags = '') {
  const re = new RegExp(pattern, 'gm' + flags)
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

function schemaErrors(item) {
  const errs = []
  const c = item.check
  if (!item.id || !item.fase || !item.titulo) errs.push('falta id, fase ou titulo')
  if (!c || !SCHEMA[c.tipo]) return errs.concat(`tipo desconhecido: ${c && c.tipo}`)
  for (const k of SCHEMA[c.tipo]) if (c[k] === undefined) errs.push(`falta "${k}"`)
  for (const k of Object.keys(c))
    if (!SCHEMA[c.tipo].includes(k) && !OPTIONAL.has(k)) errs.push(`chave inesperada "${k}"`)
  if (c.tipo === 'contem-todos' && !Array.isArray(c.padroes))
    errs.push('"padroes" precisa ser lista')
  if (c.minimo !== undefined && !(Number.isInteger(c.minimo) && c.minimo > 0))
    errs.push('"minimo" precisa ser inteiro positivo')
  if (c.flags !== undefined && !/^i?$/.test(c.flags)) errs.push('"flags" aceita só "i"')
  if (item.validado !== undefined && !ISO_DATE.test(item.validado))
    errs.push('"validado" precisa ser AAAA-MM-DD')
  for (const p of [].concat(c.padrao ?? [], c.padroes ?? [])) {
    try {
      new RegExp(p)
    } catch (e) {
      errs.push(`regex inválida /${p}/: ${e.message}`)
    }
  }
  return errs
}

function evaluate(item) {
  const c = item.check
  const noFiles = () => ({
    ok: false,
    detalhe: `nenhum arquivo casa com ${[].concat(c.arquivos).join(', ')}`
  })
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
    case 'contem-todos': {
      const files = matchFiles(c.arquivos)
      if (!files.length) return noFiles()
      const missing = c.padroes.filter((p) => countMatches(files, p, c.flags).length === 0)
      return {
        ok: missing.length === 0,
        detalhe: missing.length ? `faltando: ${missing.join(', ')}` : 'todos presentes'
      }
    }
    case 'contem': {
      const files = matchFiles(c.arquivos)
      if (!files.length) return noFiles()
      const hits = countMatches(files, c.padrao, c.flags)
      const total = hits.reduce((s, h) => s + h.n, 0)
      const min = c.minimo ?? 1
      return {
        ok: total >= min,
        detalhe: `${total} ocorrência(s) de /${c.padrao}/ (mínimo ${min})`
      }
    }
    case 'ausente': {
      const files = matchFiles(c.arquivos)
      if (!files.length) return noFiles()
      const hits = countMatches(files, c.padrao, c.flags)
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
  }
}

const checklist = JSON.parse(readFileSync(CHECKLIST, 'utf8'))

const ids = new Map()
const invalid = []
for (const it of checklist.itens) {
  const errs = schemaErrors(it)
  if (ids.has(it.id)) errs.push('id repetido')
  ids.set(it.id, true)
  if (it.fase && !checklist.fases?.[it.fase]) errs.push(`fase desconhecida: ${it.fase}`)
  if (errs.length) invalid.push(`${it.id ?? '(sem id)'}: ${errs.join('; ')}`)
}
if (invalid.length) {
  console.error('checklist.json inválido:\n  ' + invalid.join('\n  '))
  process.exit(2)
}

const fase = option('fase')
if (fase && !checklist.fases?.[fase]) {
  console.error(
    `fase desconhecida: ${fase}. Use uma de: ${Object.keys(checklist.fases).join(', ')}`
  )
  process.exit(2)
}

const results = checklist.itens
  .filter((it) => !fase || it.fase === fase)
  .map((it) => ({ ...it, resultado: evaluate(it) }))
const shown = flag('pendentes') ? results.filter((r) => r.resultado.ok !== true) : results

if (flag('json')) {
  console.log(JSON.stringify(shown, null, 2))
} else {
  const icon = (r) =>
    r.guarda ? '◆' : r.resultado.ok === true ? '✓' : r.resultado.ok === null ? '○' : '✗'
  const byPhase = new Map()
  for (const r of results) byPhase.set(r.fase, [...(byPhase.get(r.fase) || []), r])
  for (const [f, items] of byPhase) {
    const title = checklist.fases?.[f] ?? ''
    const progress = items.filter((r) => !r.guarda)
    const done = progress.filter((r) => r.resultado.ok === true).length
    console.log(`\n${f} ${title} — ${done}/${progress.length}`)
    for (const r of items) {
      if (flag('pendentes') && r.resultado.ok === true) continue
      console.log(`  ${icon(r)} ${r.id} ${r.titulo}`)
      if (r.resultado.ok !== true) console.log(`      ${r.resultado.detalhe}`)
    }
  }
  const progress = results.filter((r) => !r.guarda)
  const ok = progress.filter((r) => r.resultado.ok === true).length
  const manual = progress.filter((r) => r.resultado.ok === null).length
  const fail = progress.length - ok - manual
  const guards = results.filter((r) => r.guarda)
  const brokenGuards = guards.filter((r) => r.resultado.ok === false).length
  console.log(
    `\nTotal: ${ok} ok · ${fail} faltando · ${manual} aguardando validação visual · ${progress.length} itens` +
      (guards.length ? ` · ${guards.length} guardas (◆), ${brokenGuards} quebrada(s)` : '')
  )
}

if (flag('strict') && results.some((r) => r.resultado.ok === false)) process.exit(1)
