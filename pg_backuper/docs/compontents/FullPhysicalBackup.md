# FullPhysicalBackup

## Source

- `Source/Backup/FullPhysicalBackup.h`
- `Source/Backup/FullPhysicalBackup.cpp`

## Role

`backup::FullPhysicalBackup` реализует активный физический backup через внешний процесс `pg_basebackup`.

## Responsibility

- создать рабочую директорию
- запустить `pg_basebackup`
- читать stdout/stderr и извлекать прогресс
- поддерживать отмену через `SIGTERM`
- при успехе переместить результат в финальное хранилище
- вызвать нужный callback из `ActiveBackupEvents`

## Main constructor inputs

- `backupId`
- `databaseName`
- `config::DatabaseSettings`
- `std::shared_ptr<FileStorage>`
- `ActiveBackupEvents`
- `FullPhysicalBackupOptions`

## Important internal steps

1. `start()` резервирует рабочую директорию и запускает `jthread`.
2. `run()` вызывает `spawnProcess()`.
3. Дочерний процесс исполняет `pg_basebackup`.
4. `readProgressStream()` парсит строки прогресса регулярным выражением.
5. При успехе `finishCompleted()` делает `commit()`.
6. При ошибке `finishFailed()` чистит рабочую директорию.
7. При отмене `finishCancelled()` удаляет рабочую директорию и сигнализирует coordinator.

## Notes

- Класс хранит состояние потокобезопасно через атомики и `mutex`.
- На текущем этапе поддержан только full physical backup.
- Полученный `pg_version_num` пока не вычисляется, остается `0`, если его не заполнил coordinator.
