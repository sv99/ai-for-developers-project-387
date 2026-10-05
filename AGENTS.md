# AGENTS.md

Учебный проект Хекслета: календарь звонков (сервис бронирования). Vue 3 + TypeScript + Element Plus + Vite. Менеджер пакетов — **pnpm 12.4.2**, Node `^22.18.0 || >=24.12.0` (в CI — 24).

## Команды

- `pnpm dev` — dev-сервер Vite
- `pnpm test` — все тесты (vitest run); один файл: `pnpm test LandingPage`
- `pnpm type-check` — `vue-tsc --build` по references из `tsconfig.json`: `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.vitest.json`
- `pnpm lint` — сначала `lint:oxlint`, затем `lint:eslint` (последовательно, оба с `--fix`)
- `pnpm format` — `oxfmt src/` (только `src/`, не весь репозиторий)
- `pnpm build` — параллельно type-check + `vite build`
- `pnpm tsp:check` — компиляция доменной модели TypeSpec (`typespec/main.tsp`) без эмита
- `pnpm openapi` — генерация `docs/openapi.yaml` из `typespec/http.tsp`; `pnpm openapi:check` — проверка актуальности (для CI)

## Локальное окружение и проверка UI (WSL)

- `pnpm` здесь — **windows-версия** (`/mnt/c/nvm4w/nodejs/pnpm`): `pnpm dev`/`pnpm preview` поднимают сервер на стороне Windows, а `node_modules` содержит win32-бинарники. Linux-нодой Vite не запускается (`Cannot find native binding`) — это норма окружения, переустанавливать не нужно.
- Поэтому `dev` и `preview` слушают `0.0.0.0`: из WSL сервер доступен по адресу Windows-хоста, а не по `localhost`. Нужный адрес — строка `Network` с пометкой `vEthernet (WSL)` в выводе `pnpm dev` (это `.1` подсети `eth0`).
- UI проверяется MCP-сервером `playwright` (headless Chromium, настроен в `opencode.json` этого проекта): `browser_navigate` → `browser_snapshot` → `browser_take_screenshot`. Артефакты — в `.playwright-mcp/`.

## MCP-серверы

`opencode.json` (в корне, **коммитится**) описывает два MCP-сервера:

- `playwright` — локальный, только для этого проекта;
- `render` — remote (`https://mcp.render.com/mcp`), ключ подставляется из `.secrets/render-api-key` через `{file:…}`. Сам файл секрета в `.secrets/` и **не коммитится** — на новой машине создай его (`printf '%s' rnd_… > .secrets/render-api-key`), иначе Render MCP вернёт `unauthorized`. Тот же ключ читает `scripts/deploy.mjs` из `RENDER_API_KEY`.

## Стиль кода

- Форматтер — oxfmt: **без точек с запятой, одинарные кавычки**. ESLint не форматирует код (`eslint-config-prettier`).
- Правила oxlint из `.oxlintrc.json` автоматически учитываются ESLint через `eslint-plugin-oxlint`; не дублируй их в `eslint.config.ts`.
- Псевдоним импортов: `@` → `src/`.

## Element Plus: автоимпорт

`unplugin-auto-import` + `unplugin-vue-components` с `ElementPlusResolver`: компоненты и API Element Plus **не импортируются вручную**. Сгенерированные и закоммиченные `auto-imports.d.ts` и `components.d.ts` не редактируй руками.

## Тесты

- `vitest.config.ts` наследует Vite-конфиг; среда — jsdom, `element-plus` инлайнится, CSS отключён, `e2e/**` исключён.
- Тесты лежат рядом с компонентами: `src/**/__tests__/*.spec.ts`.

## CI (не ломать)

- `ci.yml` (push в main + PR): `pnpm test` → `pnpm build` → smoke-тест: `pnpm preview` на порту 4173, проверяется `id="app"` в HTML. **Не убирай `<div id="app">` из `index.html`** — упадёт smoke-тест.
- `hexlet-check.yml` — сгенерирован Хекслетом: **не удалять, не переименовывать, не редактировать** (и не переименовывать репозиторий).

## Релизы (release-please)

- Пуш в main запускает `release-please.yml` — по **Conventional Commits** (`feat:`, `fix:` …) создаёт release-PR и тег `v*.*.*`.
- Версию в `package.json` поднимает release-please — **не бампай вручную**. `release.yml` сверяет версию пакета с тегом и заливает `dist-<tag>.zip` в GitHub Release.
- Для release-please нужен секрет `RELEASE_PLEASE_TOKEN` (fine-grained PAT): релиз/тег от обычного `GITHUB_TOKEN` не запустит `release.yml`.

## TypeSpec

- `typespec/main.tsp` — доменная модель API-слоя (сущности, ограничения, операции `src/api`). Это **не** HTTP-контракт: сервис клиентский, эндпоинтов нет. Проверка — `pnpm tsp:check`.
- `typespec/http.tsp` — справочный прототип HTTP-контракта (задел на будущий сервер). `@typespec/http` и `@typespec/openapi3` стоят в `devDependencies`. Подробности — `typespec/README.md`.
- `docs/openapi.yaml` — сгенерированный контракт, **коммитится**. Не редактируй руками: пересобирай `pnpm openapi`. `tsp-output/` — временная папка эмиттера, в `.gitignore`.

## Agent skills

### Issue tracker

Issues живут в GitHub Issues репозитория, все операции через `gh` CLI. См. `docs/agents/issue-tracker.md`.

### Triage labels

Дефолтный словарь из пяти ролей: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. См. `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` и `docs/adr/` в корне репозитория. См. `docs/agents/domain.md`.
