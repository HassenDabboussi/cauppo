import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

const scannedRoots = [
  'docs',
  'frontend/contracts',
  'frontend/src',
  'frontend/tests',
  'notification-service/internal',
  'notification-service/tests',
  'order-service/internal',
]

const forbidden = [
  /INDEPENDENT_ORDER/,
  /independent order/i,
  /grouped order/i,
  /grouped-order/i,
  /sessionOrderCount/,
  /sessionAggregateTotal/,
  /relatedOrderIds/,
]

const allowedFiles = new Set([
  'docs/customer-ui-canvas.md',
])

function walk(dir) {
  const entries = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      entries.push(...walk(path))
    } else {
      entries.push(path)
    }
  }
  return entries
}

const failures = []
for (const scanRoot of scannedRoots) {
  const absoluteRoot = join(root, scanRoot)
  for (const file of walk(absoluteRoot)) {
    const repoPath = relative(root, file).replaceAll('\\', '/')
    if (allowedFiles.has(repoPath)) {
      continue
    }
    if (!/\.(go|md|ts|tsx)$/.test(repoPath)) {
      continue
    }

    const content = readFileSync(file, 'utf8')
    const lines = content.split(/\r?\n/)
    lines.forEach((line, index) => {
      for (const pattern of forbidden) {
        if (pattern.test(line)) {
          failures.push(`${repoPath}:${index + 1}: ${line.trim()}`)
        }
      }
    })
  }
}

if (failures.length > 0) {
  console.error('Sprint 29 Task 1 stale-language guard failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Sprint 29 Task 1 stale-language guard passed.')
