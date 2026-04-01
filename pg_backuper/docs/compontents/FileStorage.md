# FileStorage

## Source

- `Source/Backup/FileStorage.h`

## Role

`backup::FileStorage` описывает файловое хранилище физических данных бэкапа.

## Responsibility

- выделить рабочую директорию для активного бэкапа
- переместить рабочую директорию в финальное хранилище
- удалить данные бэкапа
- посчитать размер хранимого бэкапа
- перечислить незавершенные рабочие директории

## Main methods

- `workingPath(backupId)`
- `commit(backupId, dbName)`
- `remove(backupId)`
- `sizeBytes(backupId)`
- `listWorkingIds()`

## Current implementation

Интерфейс реализуется классом `backup::LocalFileStorage`.
