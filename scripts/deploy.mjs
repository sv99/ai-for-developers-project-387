#!/usr/bin/env node
// Trigger a deploy of the "Календарь звонков" service on Render and follow it to completion.
//
// Usage:
//   RENDER_API_KEY=rnd_... node scripts/deploy.mjs [--clear-cache] [--service <name|id>]
//
// Environment:
//   RENDER_API_KEY       required — create one at https://dashboard.render.com/u/settings?add-api-key
//   RENDER_SERVICE_ID    optional — service id (srv-...); skips the lookup by name
//   RENDER_SERVICE_NAME  optional — service name to look up (default: calendar-slot)
//
// The service itself is created from render.yaml (Render Dashboard → New → Blueprint).

const API = 'https://api.render.com/v1'
const DEFAULT_SERVICE_NAME = 'calendar-slot'
const POLL_INTERVAL_MS = 5000

const TERMINAL_SUCCESS = new Set(['live'])
const TERMINAL_FAILURE = new Set([
  'build_failed',
  'update_failed',
  'canceled',
  'deactivated',
  'pre_deploy_failed',
])

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(
    'Usage: RENDER_API_KEY=rnd_... node scripts/deploy.mjs [--clear-cache] [--service <name|id>]',
  )
  process.exit(0)
}

const clearCache = args.includes('--clear-cache')
const serviceFlagIndex = args.indexOf('--service')
const serviceArg = serviceFlagIndex === -1 ? undefined : args[serviceFlagIndex + 1]

const apiKey = process.env.RENDER_API_KEY

if (!apiKey) {
  console.error(
    'RENDER_API_KEY is not set.\n' +
      'Create a key at https://dashboard.render.com/u/settings?add-api-key and pass it, e.g.\n' +
      '  RENDER_API_KEY=rnd_... node scripts/deploy.mjs',
  )
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
}

async function api(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  })

  const text = await response.text()
  let body

  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    body = text
  }

  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body)
    throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status}: ${detail}`)
  }

  return body
}

async function resolveServiceId() {
  if (process.env.RENDER_SERVICE_ID) return process.env.RENDER_SERVICE_ID

  const target = serviceArg ?? process.env.RENDER_SERVICE_NAME ?? DEFAULT_SERVICE_NAME
  const entries = await api('/services?limit=100')
  const service = entries
    .map((entry) => entry.service)
    .find((item) => item.id === target || item.name === target)

  if (!service) {
    throw new Error(
      `Service "${target}" not found. Create it from render.yaml or set RENDER_SERVICE_ID.`,
    )
  }

  return service.id
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const serviceId = await resolveServiceId()

  console.log(`Triggering deploy for ${serviceId}${clearCache ? ' (clear cache)' : ''}…`)

  const deploy = await api(`/services/${serviceId}/deploys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clearCache: clearCache ? 'clear' : 'do_not_clear' }),
  })

  console.log(`Deploy ${deploy.id} created (status: ${deploy.status})`)

  let current = deploy

  while (!TERMINAL_SUCCESS.has(current.status) && !TERMINAL_FAILURE.has(current.status)) {
    await sleep(POLL_INTERVAL_MS)
    current = await api(`/services/${serviceId}/deploys/${deploy.id}`)
    console.log(`  status: ${current.status}`)
  }

  if (TERMINAL_FAILURE.has(current.status)) {
    throw new Error(`Deploy ${deploy.id} finished with status "${current.status}"`)
  }

  const commit = current.commit?.message ? ` (${current.commit.message})` : ''
  console.log(`Deploy live: ${deploy.id}${commit}`)
}

main().catch((error) => {
  console.error(`Deploy failed: ${error.message}`)
  process.exit(1)
})
