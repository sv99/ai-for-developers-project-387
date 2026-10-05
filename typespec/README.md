# TypeSpec: доменная модель API-слоя

Файл `typespec/main.tsp` описывает доменную модель «Календаря звонков» по контракту API-слоя в `src/api`.

Это **не** HTTP-контракт: сервис клиентский, модули `src/api` работают с `localStorage` напрямую, эндпоинтов нет (см. `docs/spec.md`). Поэтому в модели нет маршрутов и сервисов — только сущности, их ограничения и операции слоя.

## Что внутри

- перечисления `SlotStatus` (свободно / занято) и `BookingStatus` (активна / отменена);
- модели `TimeRange`, `DaySlot`, `EventType`, `EventTypeInput`, `Contact`, `Booking`, `BookingInput`, `CalendarName`;
- ошибки `ApiError`, `NotFoundError`, `ValidationError`, `ConflictError` — с текстами из кода;
- операции API-слоя: `listBookings`, `listUpcomingBookings`, `createBooking`, `cancelBooking`, `listDaySlots`, `countFreeSlots`, `bookingWindowEnd`, `listEventTypes`, `createEventType`, `getCalendarName`, `setCalendarName`.

В описаниях зафиксированы доменные правила: 30-минутная сетка 09:00–18:00, окно регистрации 14 дней, значение «занято» (занято активной Записью, время прошло или день вне окна), сохранение тела Записи при отмене. Термины — по `GLOSSARY.md`.

## Проверка

```bash
pnpm tsp:check
```

Компилятор `@typespec/compiler` стоит в `devDependencies`; внешних библиотек сама модель не требует.

## Генерация OpenAPI и SDK из `main.tsp` — почему не работает

Проверено на `@typespec/openapi3` и `@typespec/http-client-js` (TypeSpec 1.16.0): **из `main.tsp` осмысленных OpenAPI/SDK не получить**, потому что это модель данных, а не HTTP-контракт. Эмиттеры строят вывод от HTTP-поверхности, а в `main.tsp` нет ни `@service`, ни `@route`, ни `@get`/`@post` — операции заданы сигнатурами.

Что получается на практике:

- `@typespec/openapi3` отрабатывает «успешно», но выдаёт одну схему (`TimeRange`) и `paths: {}` — остальные модели недостижимы из HTTP-операций. Плюс предупреждение `no-service-found`.
- `@typespec/json-schema` не создаёт вообще ничего: схемы не форсируются, если на них не ссылается HTTP-сторона.
- `@typespec/http-client-js` формально генерирует клиент со всеми моделями, но **выдумывает маршруты**: `listBookings` бьёт в `GET /` — эндпоинтов, которых нет. Такой SDK нерабочий и опасен: он выглядит настоящим.

Это следствие природы проекта: по `docs/spec.md` сервис клиентский, `src/api` пишет в `localStorage`, сервера и эндпоинтов в v1 нет. Описывать сетевой интерфейс нечего.

## Прототип HTTP-контракта: `http.tsp`

`typespec/http.tsp` — **справочный прототип**, задел на будущий сервер. Он импортирует `main.tsp`, переиспользует модели и навешивает на те же операции HTTP-поверхность: `@service`, `@server`, `@route`, `@get`/`@post`/`@put`, `@path`/`@query`/`@body`, `@statusCode` и коды ошибок (`ValidationError` → 400, `NotFoundError` → 404, `ConflictError` → 409).

С добавленной HTTP-поверхностью эмиттеры дают то, что нужно: полноценный OpenAPI со всеми 11 путями и схемами, а SDK-эмиттер — клиент с настоящими маршрутами (`GET /bookings`, `POST /bookings/{id}/cancel` …) вместо фиктивного `GET /`.

`@typespec/http` и `@typespec/openapi3` стоят в `devDependencies`, поэтому `http.tsp` компилируется штатно. SDK-эмиттер (`@typespec/http-client-js`) в зависимости не добавлен — он нужен только для разовой демонстрации.

## Генерация OpenAPI

```bash
pnpm openapi        # собрать docs/openapi.yaml из typespec/http.tsp
pnpm openapi:check  # проверить, что docs/openapi.yaml актуален (для CI)
```

Скрипт `scripts/generate-openapi.mjs` компилирует `typespec/http.tsp` эмиттером `@typespec/openapi3`, кладёт результат в `docs/openapi.yaml` и убирает временную папку `tsp-output/` (она в `.gitignore`). Флаги: `--out <dir>`, `--name <file>`, `--check`.

Почему скрипт, а не голый `tsp compile`: путь и имя файла фиксированы в репозитории (`docs/openapi.yaml`), вывод воспроизводим, а `pnpm openapi:check` ловит расхождение контракта с кодом.
