#!/usr/bin/env node
// Сгенерировать OpenAPI-документ из прототипа HTTP-контракта `typespec/http.tsp`.
//
// Usage:
//   node scripts/generate-openapi.mjs [--out <dir>] [--name <file>] [--check]
//
// Options:
//   --out <dir>    куда положить документ (по умолчанию docs/)
//   --name <file>  имя файла (по умолчанию openapi.yaml)
//   --check        только собрать без записи и проверить, что документ актуален
//   -h, --help     показать эту справку
//
// Модель `typespec/main.tsp` — это доменная модель, а не HTTP-контракт: OpenAPI из неё не
// получается (пустой `paths`). HTTP-поверхность живёт в `typespec/http.tsp`, поэтому генерируем
// именно из него. Эмиттеры `@typespec/http` и `@typespec/openapi3` — в `devDependencies`.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = join(ROOT, 'typespec', 'http.tsp')

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(
    [
      'Usage: node scripts/generate-openapi.mjs [--out <dir>] [--name <file>] [--check]',
      '',
      '  --out <dir>    output directory (default: docs/)',
      '  --name <file>  output file name (default: openapi.yaml)',
      '  --check        verify the committed document is up to date without writing',
    ].join('\n'),
  )
  process.exit(0)
}

const flagValue = (flag, fallback) => {
  const index = args.indexOf(flag)
  if (index === -1) {
    return fallback
  }
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    console.error(`Ошибка: ${flag} требует значение`)
    process.exit(1)
  }
  return value
}

const checkOnly = args.includes('--check')
const outDir = resolve(ROOT, flagValue('--out', 'docs'))
const outName = flagValue('--name', 'openapi.yaml')
const target = join(outDir, outName)

/** Запустить tsp с аргументами, вернуть статус и объединённый вывод. */
const runTsp = (tspArgs) => {
  const result = spawnSync('tsp', tspArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  return { status: result.status ?? 1, output }
}

// Эмиттер пишет во временную папку, а документ переносим сами — так путь и имя файла
// не зависят от изменчивых правил интерполяции `output-file` эмиттера.
const tmpDir = join(ROOT, 'tsp-output', '@typespec', 'openapi3')

const emit = runTsp([
  'compile',
  ENTRY,
  '--emit',
  '@typespec/openapi3',
  '--option',
  '@typespec/openapi3.emitter-output-dir={project-root}/tsp-output/@typespec/openapi3',
  '--option',
  '@typespec/openapi3.output-file=openapi.yaml',
  '--option',
  '@typespec/openapi3.file-type=yaml',
])

if (emit.status !== 0) {
  console.error(emit.output.trim())
  console.error('\nНе удалось собрать OpenAPI из typespec/http.tsp.')
  process.exit(emit.status)
}

const generated = join(tmpDir, 'openapi.yaml')
if (!existsSync(generated)) {
  console.error(`Ошибка: эмиттер не создал ${generated}`)
  console.error(emit.output.trim())
  process.exit(1)
}

const generatedContent = readFileSync(generated, 'utf8')

const finish = () => {
  rmSync(join(ROOT, 'tsp-output'), { recursive: true, force: true })
}

if (checkOnly) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null
  finish()
  if (current === generatedContent) {
    console.log(`✓ ${outName} актуален`)
    process.exit(0)
  }
  console.error(`✗ ${outName} устарел — перегенерируйте: pnpm openapi`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
writeFileSync(target, generatedContent)
finish()

const relative = isAbsolute(target) ? target.slice(ROOT.length + 1).split(/[\\/]/).join('/') : target
console.log(`✓ OpenAPI записан в ${relative}`)
console.log('  Источник: typespec/http.tsp')
