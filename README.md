# Календарь звонков (продолжение)

[![hexlet-check](https://github.com/sv99/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/sv99/ai-for-developers-project-387/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: <https://ru.hexlet.io/programs/ai-for-developers>
Как это должно работать: <https://files.hexlet.app/a/2ipc5m>

## Стек

- TypeScript
- Vue
- Element-Plus
- Vite

Большую часть настройки сделал opencode модель GLM 5.3.
Отдельно настраивал release-please (раньше никогда не сталкивался), тоже под руководством Copilot в их новом варианте интерфейса Agents.

## Установка release-please

```bash
git clone https://github.com/sv99/ai-for-developers-project-387.git
cd ai-for-developers-project-387
```

Для работы `release-please` нужно:

1. добавить PAT ключ для репозитория с правами: Contents: Read and write, Pull requests: Read and write.
2. Добавить его в репозиторий как secret Settings → Secrets and variables → Actions → New repository secret с именем RELEASE_PLEASE_TOKEN.

## init

Инициализация проекта для работы с агентом.

```bash
/init
```

## Установка Skills

1. Установите набор скиллов:

```bash
# Install
npx skills@latest add mattpocock/skills
# Update
pnpx skills update
```

1. Проверьте, что агент видит скиллы: они должны появиться в списке доступных.
2. Запустите /setup-matt-pocock-skills

ответы на вопросы:

- трекер задач: GitHub Issues в репозитории проекта;
- метки для разбора задач: оставить значения по умолчанию;
- документы предметной области: один контекст, GLOSSARY.md и docs/adr/ в корне репозитория

1. Посмотрите, что скилл записал в docs/agents/ и в AGENTS.md.

## Главная страница

Я сделал ее раньше.

```bash
Запускал @grill-with-docs Главная страница сервиса "Календарь звонков" открывается и ведёт на страницу записи.
```

Ответы на вопросы в несколько этапов. Использовл GLM-5.3 сжег 3$.

Для @wayfinder "утверждённая спецификация приложения, по которой можно раскладывать тикеты" использовал GLM-5.3-flash. Ушло намного меньше денег.

## Работа с issues

Для работы с ними попробовал GLM-5.3-flash и DeepSeek V4.1 Flash - разницы не заметил.

Поэтапная реализация страниц на основе скриншотов со страницы описания проекта.

## OpenSpec

Спецификация сгенерировал по уже готовому API слою.
К его качеству есть вопросы. Пока не понятно как это должно (желательно) работать.

## Deploy в Render

Установка MCP и деплой приложения [calendar-slot2](https://calendar-slot2.onrender.com/).

Ключ RENDER_API_KEY храним в переменных окружения.

После того, как сделал DockerFile начали штатно отрабатываться проверки от hexlet_check.

Используемые конфигурационные файлы:

```bash
# RENDER_API_KEY - локально в переменных окружения, в CI не нужен
# Render MCP для локального opencode; подключается через OPENCODE_CONFIG=$PWD/opencode.render.json
opencode.render.json
Dockerfile
nginx.conf.template
# используется для настройки сервиса в Render
render.yaml
```

## OpenCode Github App

[OpenCode Agent GitHub App](https://github.com/apps/opencode-agent) - установил для текущего репо.

При наличии приложения действия агента отображаются от имени приложения - сразу видно, что коммит сделал именно агент.

```bash
.github/workflows/opencode.yml
```

Чтобы прописать модель выполнил в агенте /models list - получил таблицу моделей с их идентификаторами.

При первичной настройке были проблемы с передачей ключа для Render.

По `/opencode explain this issue` агент пишет развернутый ответ.

Если проблема маленькая, можно попробовать сразу ее решить `/oc fix` - в результате получим PR.

## Workflows

Все воркфлоу лежат в `.github/workflows/`.

| Файл | Что делает | Когда запускается |
| --- | --- | --- |
| `ci.yml` | Два параллельных job: **Lint** (`pnpm lint:ci` — без `--fix`, предупреждения = ошибка) и **Smoke test** (тесты, сборка, `pnpm preview` и проверка `<div id="app">` в HTML) | push в любую ветку, PR |
| `hexlet-check.yml` | Проверки Хекслета. Сгенерирован автоматически — не редактировать | push в любую ветку и тег |
| `release-please.yml` | Ведёт релизный PR по Conventional Commits (`feat:`/`fix:`), поднимает версию в `package.json` и `.release-please-manifest.json`; после мержа релизного PR создаёт тег и GitHub Release | push в main |
| `release.yml` | Тесты, проверка «версия в `package.json` = тег», сборка, smoke-тест; прикрепляет `dist-<тег>.zip` к релизу | пуш тега `v*.*.*` |
| `opencode.yml` | Агент выполняет команды `/oc`, `/opencode` из комментариев: отвечает, правит код, пушит в ветку PR или открывает PR | комментарий к issue или PR, комментарий к строке diff (только после Submit ревью) |
| `opencode-triage.yml` | Агент разбирает новый issue и оставляет комментарий с разбором | создание issue, вручную |
| `opencode-review.yml` | Агент ревьюит PR: баги, риски, читабельность | PR открыт, новый пуш, reopen, готов к ревью |
| `opencode-scheduled.yml` | Агент ищет TODO/FIXME в коде и пишет отчёт в `.opencode-report/todo-report.md`; отчёт попадает в Job Summary, артефакт `todo-report` и issue с меткой `todo-report` (создаётся или дополняется комментарием) | каждый понедельник 9:00 UTC, вручную |

Защита от петель: opencode-воркфлоу не реагируют на события от ботов (`user.type == 'Bot'`), поэтому агент не запускает сам себя — на свои комментарии, issues и PR. `opencode-review.yml` пропускает и PR от ботов, и пуши бота в PR человека (`github.actor`). Issue-отчёт scheduled создаётся через `GITHUB_TOKEN`, а такие события воркфлоу не запускают.

Доступ: агент запускается только на команды, issues и PR от участников репозитория (`author_association` — `OWNER`, `MEMBER` или `COLLABORATOR`). Посторонние в публичном репо не тратят `OPENCODE_API_KEY`, их события дают `skipped`.

Публичные сессии агента (share): **не используются**.

- Публикацию сессий в opencode прекратили: параметр экшена `share` — «Deprecated and ignored: session sharing was discontinued». В воркфлоу его нет и добавлять не нужно.
- Ответ агента заканчивается ссылкой `[github run]` на запуск в Actions. Репозиторий публичный — лог с ходом работы агента виден всем, поэтому секреты агенту в комментариях не передавать.
- Старые ссылки `opencode.ai/s/…` в комментариях до 12.10.2026 больше не открываются.

Токены агента: все opencode-воркфлоу работают с токеном GitHub App через OIDC (`id-token: write`), поэтому ответы агента — от `opencode-agent[bot]`. Исключение — шаг публикации отчёта в `opencode-scheduled.yml`: он пишет issue через `GITHUB_TOKEN` от `github-actions[bot]`. Версия экшена: все четыре opencode-воркфлоу закреплены на одном SHA коммита (тег `v1.19.4` репозитория `anomalyco/opencode`), а не на `@latest`. Это фиксирует только обёртку экшена (`action.yml`: шаги установки и запуска). Сам opencode CLI — логику агента — экшен при каждом запуске ставит последней версии, закрепить её через инпуты нельзя. Обновление обёртки — заменить SHA во всех четырёх файлах одним PR.

Если шаг экшена **Get opencode version** падает с exit code 1 — это анонимный запрос к API GitHub за последним релизом opencode (лимит запросов с общего раннера); помогает перезапуск: `gh run rerun <id> --failed`.

Секреты: `HEXLET_ID` — проверки Хекслета; `RELEASE_PLEASE_TOKEN` — релизы; `OPENCODE_API_KEY` — воркфлоу с агентом; `RENDER_API_KEY` в CI не нужен: Render деплоит сам после пуша в main, когда проверки прошли (`autoDeployTrigger: checksPass`).

Ручной запуск scheduled-воркфлоу для теста:

```bash
gh workflow run "Scheduled OpenCode Task" --ref main
```

## Что дальше

После успешной проверки проект можно развивать как продукт и добавлять новые возможности.

- Гибкое расписание: окна доступности по дням недели, перерывы, исключения и праздничные дни.
- Регистрация и аккаунты: несколько пользователей, у каждого свои календари и типы встреч.
- Уведомления: напоминания о предстоящих событиях, подтверждения и отмены.
- Дополнительные сценарии: перенос и отмена бронирований, повторяющиеся события, буфер между встречами, аналитика по записям.
