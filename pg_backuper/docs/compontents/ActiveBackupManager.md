# ActiveBackupManager

## Source

- `Source/Backup/ActiveBackupManager.h`
- `Source/Backup/ActiveBackupManager.cpp`

## Role

`backup::ActiveBackupManager` хранит все активные бэкапы в памяти процесса.

## Responsibility

- регистрировать новый `ActiveBackup`
- не допускать конфликта одинаковых `backup_id`
- проксировать отмену по `backup_id`
- отдавать текущий список активных бэкапов
- лениво вычищать завершившиеся объекты

## Main methods

- `start(std::shared_ptr<ActiveBackup>)`
- `cancel(int64_t backupId)`
- `get(int64_t backupId)`
- `getAll()`

## Internal model

- Хранилище реализовано как `atomic<shared_ptr<const Snapshot>>`.
- Любое обновление списка делается copy-on-write.
- Завершенные бэкапы удаляются методом `pruneFinished()`.

## Notes

- Менеджер не сохраняет состояние в БД.
- После рестарта процесса список активных бэкапов теряется.
- Это согласуется с текущей моделью: прерванные процессом активные бэкапы просто игнорируются.
