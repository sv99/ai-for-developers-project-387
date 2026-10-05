# Issue-трекер: GitHub

Issues и спеки этого репозитория живут в GitHub Issues. Все операции — через CLI `gh`.

## Конвенции

- **Создать issue**: `gh issue create --title "..." --body "..."`. Для многострочных body используйте heredoc.
- **Прочитать issue**: `gh issue view <number> --comments`, фильтруя комментарии через `jq` и получая метки.
- **Список issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` с подходящими фильтрами `--label` и `--state`.
- **Комментарий к issue**: `gh issue comment <number> --body "..."`
- **Добавить / снять метку**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Закрыть**: `gh issue close <number> --comment "..."`

Репозиторий выводится из `git remote -v`; `gh` делает это автоматически при запуске внутри клона.

## Pull requests как поверхность триажа

**PR как request surface: нет.** _(Поставьте `yes`, если этот репозиторий считает внешние PR фиче-реквестами; `/triage` читает этот флаг.)_

При значении `yes` PR проходят через те же метки и состояния, что и issues, через эквиваленты `gh pr`:

- **Прочитать PR**: `gh pr view <number> --comments` и `gh pr diff <number>` для диффа.
- **Список внешних PR для триажа**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, затем оставить только `authorAssociation` = `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` или `NONE` (отбросить `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Комментарий / метка / закрытие**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub использует единое пространство номеров для issues и PR, поэтому `#42` может оказаться любым из них: разрешите через `gh pr view 42` с фоллбэком на `gh issue view 42`.

## Когда скилл говорит «опубликовать в issue-трекер»

Создайте GitHub issue.

## Когда скилл говорит «получить соответствующий тикет»

Выполните `gh issue view <number> --comments`.

## Операции Wayfinding

Используются `/wayfinder`. **Карта** — один issue с **дочерними** issues-тикетами.

- **Карта**: один issue с меткой `wayfinder:map`, в body — Notes / Decisions-so-far / Fog. `gh issue create --label wayfinder:map`.
- **Дочерний тикет**: issue, привязанный к карте как GitHub sub-issue (`gh api` на endpoint под-issues). Где sub-issues недоступны, добавьте дочерний тикет в task list в body карты и укажите `Part of #<map>` в начале body дочернего. Метки: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Взятый тикет назначается ведущему разработчику.
- **Блокировки**: **нативные issue dependencies** GitHub — каноническое, видимое в UI представление. Добавьте ребро командой `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, где `<blocker-db-id>` — числовой **database id** блокера (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _не_ `#number` и не `node_id`). GitHub отдаёт `issue_dependencies_summary.blocked_by` (только открытые блокеры, живой гейт). Где dependencies недоступны — фоллбэк на строку `Blocked by: #<n>, #<n>` в начале body дочернего тикета. Тикет разблокирован, когда каждый блокер закрыт.
- **Запрос фронтира**: список открытых детей карты (`gh issue list --state open`, скоуп по sub-issues / task list карты), отбросить тикеты с открытым блокером (`issue_dependencies_summary.blocked_by > 0` или открытый issue в строке `Blocked by`) или с assignee; первый в порядке карты побеждает.
- **Claim (взять тикет)**: `gh issue edit <n> --add-assignee @me` — первая запись сессии.
- **Resolve (резолв)**: `gh issue comment <n> --body "<answer>"`, затем `gh issue close <n>`, затем добавить контекстный указатель (gist + ссылку) в Decisions-so-far карты.
