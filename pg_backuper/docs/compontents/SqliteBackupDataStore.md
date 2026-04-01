# SqliteBackupDataStore

## Source

- `Source/Backup/SqliteBackupDataStore.h`
- `Source/Backup/SqliteBackupDataStore.cpp`

## Role

`backup::SqliteBackupDataStore` реализует `BackupDataStore` через SQLite.

## Responsibility

- создать и поддерживать схему БД
- выделять новые `backup_id`
- хранить шаблоны, backup records, верификации и расписания
- фильтровать backup list по БД, статусам, типам и времени

## Backup persistence model

Текущая модель хранения:

- `backups`: общая запись терминального бэкапа
- `backup_successes`: payload успешного бэкапа
- `backup_failures`: payload неуспешного бэкапа
- `backup_verifications`: данные ручной верификации

## Important implementation details

- `initBackupIdCounter()` делает `SELECT MAX(backup_id)` и поднимает следующий id с учетом уже сохраненных терминальных записей.
- `createBackup()` и `updateBackup()` используют транзакцию и пишут outcome-таблицы согласованно.
- `listBackups()` делает `LEFT JOIN` к success/fail таблицам и собирает единый `BackupRecord`.

## Internal helpers

Внутри `.cpp` есть локальные helper classes:

- `SqlStatement`: RAII обертка над `sqlite3_stmt`
- `SqlTransaction`: RAII транзакция

Эти классы не являются публичными компонентами системы.
