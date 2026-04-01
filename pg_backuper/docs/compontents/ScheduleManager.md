# ScheduleManager

## Source

- `Source/Backup/ScheduleManager.h`
- `Source/Backup/ScheduleManager.cpp`

## Role

`backup::ScheduleManager` управляет CRUD операциями по расписаниям и фоновой проверкой cron-выражений.

## Responsibility

- создавать и обновлять расписания
- вычислять `nextRunAt`
- поднимать фоновой worker
- периодически запускать due schedules
- сохранять runtime-поля расписания:
  - `nextRunAt`
  - `lastRunAt`
  - `lastBackupId`
  - `lastRunStatus`

## Main API

- `start()`
- `stop()`
- `create()`
- `update()`
- `get()`
- `list()`
- `remove()`
- `pause()`
- `resume()`

## Collaboration

- `BackupDataStore`: постоянное хранение расписаний
- `StartBackupFn`: callback для фактического запуска бэкапа

## Important behavior

- Внутри есть собственный `jthread`.
- Cron парсер реализован прямо в `ScheduleManager.cpp`.
- Запуск бэкапа из расписания не исполняется напрямую, а делегируется во внешний callback.
