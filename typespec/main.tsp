/**
 * Доменная модель «Календаря звонков» — по контракту API-слоя в `src/api`.
 *
 * Важно: это модель данных, а не HTTP-API. Сервис клиентский: модули `src/api` читают и пишут
 * localStorage напрямую, эндпоинтов нет (см. `docs/spec.md`: «Данные хранятся в браузере
 * (localStorage) через API-слой; сервер и авторизация не нужны»). Поэтому ниже описаны
 * сущности, их ограничения и операции слоя. Ссылки на функции — на `src/api`, чтобы можно было
 * сверять контракт с реализацией.
 *
 * Термины — по GLOSSARY.md: Запись, Слот, Тип события.
 *
 * Проверено компилятором TypeSpec 1.16.0: `tsp compile typespec/main.tsp`. Внешних библиотек
 * файл не требует, поэтому проверка проходит и без `@typespec/rest` в зависимостях проекта.
 */
/** Статус Слота для посетителя. */
enum SlotStatus {
  /** Слот свободен, его можно выбрать. */
  free: "free",

  /** Слот занят. */
  taken: "taken",
}

/** Статус Записи. */
enum BookingStatus {
  /** Активная Запись — время занято. */
  active: "active",

  /**
   * Отменённая Запись — Слоты снова свободны, в Предстоящих событиях не показывается.
   * Тело Записи при этом сохраняется.
   */
  cancelled: "cancelled",
}

/**
 * Интервал времени внутри дня в минутах от полуночи.
 * Используется для расчёта занятости: `bookingRange` в `src/api/slots.ts`.
 */
model TimeRange {
  /** Начало интервала в минутах от полуночи (например, 9:00 — это 540). */
  start: int32;

  /** Конец интервала в минутах от полуночи; не включается в интервал. */
  end: int32;
}

/**
 * Слот — единица занятости дня: 30-минутный интервал в окне 09:00–18:00.
 * Слоты не хранятся, а выводятся из расписания минус активные Записи (`listDaySlots`).
 */
model DaySlot {
  /** Время начала Слота, `HH:mm`, кратно 30 минутам: 09:00 … 17:30. */
  startTime: string;

  /** Время конца Слота, `HH:mm`: 09:30 … 18:00. */
  endTime: string;

  /**
   * Статус Слота. `taken` покрывает три случая: Слот занят активной Записью,
   * его начало уже прошло или день вне окна регистрации.
   */
  status: SlotStatus;
}

/**
 * Тип события — вид звонка, который владелец календаря предлагает посетителям.
 * Длительность определяет, сколько Слотов занимает Запись (30 мин — один, 60 мин — два).
 */
model EventType {
  /** Системный идентификатор, генерирует `generateId`. */
  id: string;

  /** Название вида звонка. */
  name: string;

  /** Описание для посетителя; может быть пустым. */
  description: string;

  /** Длительность в минутах, целое число не меньше 1. */
  @minValue(1)
  durationMinutes: int32;
}

/** Данные для создания Типа события — всё, кроме системного идентификатора (`createEventType`). */
model EventTypeInput {
  @minLength(1)
  name: string;

  description: string;

  @minValue(1)
  durationMinutes: int32;
}

/** Контакт посетителя, оставленный при Записи. */
model Contact {
  @minLength(1)
  name: string;

  @minLength(1)
  phone: string;
}

/**
 * Запись — забронированный звонок: закреплён за Типом события, временем начала и контактом.
 * Занимает столько подряд идущих Слотов, сколько требует длительность её Типа события.
 */
model Booking {
  /** Системный идентификатор, генерирует `generateId`. */
  id: string;

  /** Идентификатор Типа события; ссылается на `EventType.id`. */
  eventTypeId: string;

  /** Дата Записи, `YYYY-MM-DD` в локальном времени браузера. */
  @pattern("^\\d{4}-\\d{2}-\\d{2}$")
  date: string;

  /** Время начала, `HH:mm` из сетки 30 минут в окне 09:00–18:00. */
  startTime: string;

  contact: Contact;

  status: BookingStatus;

  /** Момент создания Записи, ISO 8601. */
  createdAt: string;
}

/** Данные для бронирования: тип события, время начала и контакт (`createBooking`). */
model BookingInput {
  eventTypeId: string;

  @pattern("^\\d{4}-\\d{2}-\\d{2}$")
  date: string;

  startTime: string;

  contact: Contact;
}

/** Имя календаря — настройка владельца; по умолчанию «Владелец» (`getCalendarName`). */
model CalendarName {
  @minLength(1)
  name: string;
}

/** Ошибка операции: сообщение на русском, которое UI показывает как есть. */
model ApiError {
  message: string;
}

/** Запись или Тип события не найден: «Запись не найдена». */
@error
model NotFoundError extends ApiError {}

/** Данные не прошли проверку: «Введите имя», «Выберите дату», «Введите телефон» и подобные. */
@error
model ValidationError extends ApiError {}

/** Время уже занято активной Записью: «Это время уже занято. Выберите другое время.» */
@error
model ConflictError extends ApiError {}

/**
 * Операции API-слоя. HTTP в проекте нет, поэтому операции описаны явно — сигнатурами,
 * повторяющими функции `src/api`. Это точнее, чем шаблоны ресурсов: у нас не CRUD над
 * ресурсами, а запросы (слоты дня, граница окна) и действия (отмена).
 */
namespace CalendarApi {
  // --- Записи ---

  /** Все Записи, включая отменённые и прошедшие. Соответствует `listBookings`. */
  op listBookings(): Booking[] | ApiError;

  /**
   * Предстоящие Записи владельца: активные, начало которых ещё не прошло, в порядке
   * времени начала. Прошедшие и отменённые не попадают. Соответствует `listUpcomingBookings`.
   */
  op listUpcomingBookings(): Booking[] | ApiError;

  /**
   * Создаёт Запись. Ошибки: неизвестный Тип события, пустая дата, время вне сетки,
   * событие не помещается до 18:00, пустой контакт и пересечение с активной Записью.
   * Соответствует `createBooking`.
   */
  op createBooking(input: BookingInput): Booking | ConflictError | ValidationError;

  /**
   * Отменяет Запись: статус становится `cancelled`, время снова свободно, тело Записи
   * сохраняется. Ошибки: «Запись не найдена», «Запись уже отменена». Соответствует
   * `cancelBooking`.
   */
  op cancelBooking(id: string): Booking | NotFoundError | ValidationError;

  // --- Слоты и доступность ---

  /**
   * Слоты дня со статусами (`listDaySlots`). За окном регистрации (сегодня + 14 дней)
   * и в прошлом все Слоты `taken`.
   */
  op listDaySlots(date: string): DaySlot[] | ApiError;

  /** Число свободных Слотов дня, 0 … 18. Соответствует `countFreeSlots`. */
  op countFreeSlots(date: string): int32 | ApiError;

  /**
   * Последний день окна регистрации, `YYYY-MM-DD`: сегодня + 14 дней.
   * Соответствует `bookingWindowEnd`.
   */
  op bookingWindowEnd(): string | ApiError;

  // --- Типы событий ---

  /** Все Типы событий. Соответствует `listEventTypes`. */
  op listEventTypes(): EventType[] | ApiError;

  /**
   * Создаёт Тип события. Ошибки: пустое название, длительность не целое или меньше 1.
   * Соответствует `createEventType`.
   */
  op createEventType(input: EventTypeInput): EventType | ValidationError;

  // --- Настройки владельца ---

  /** Имя календаря; по умолчанию «Владелец». Соответствует `getCalendarName`. */
  op getCalendarName(): CalendarName | ApiError;

  /** Сохраняет имя календаря; при пустом имени ошибка. Соответствует `setCalendarName`. */
  op setCalendarName(input: CalendarName): void | ValidationError;
}
