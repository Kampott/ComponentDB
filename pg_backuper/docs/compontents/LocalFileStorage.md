# LocalFileStorage

## Source

- `Source/Backup/LocalFileStorage.h`
- `Source/Backup/LocalFileStorage.cpp`

## Role

`backup::LocalFileStorage` реализует `FileStorage` поверх локальной файловой системы.

## Responsibility

- создавать `working/<backup_id>` директории
- переносить завершенный backup в `<storageRoot>/<databaseName>/<backup_id>`
- находить backup directory по `backup_id`
- удалять backup как из working, так и из финального дерева
- считать размер файлов рекурсивным обходом
- восстанавливать список рабочих id после аварийного завершения процесса

## Directory layout

```text
storageRoot/
  working/
    101/
    102/
  main/
    77/
  logging/
    88/
```

## Important methods

- `ensureBaseDirectories()`
- `findBackupPath()`
- `workingBackupPath()`
- `finalBackupPath()`

## Notes

- При старте сервиса `main.cpp` удаляет все найденные рабочие директории.
- Если один и тот же `backup_id` найден сразу в нескольких финальных местах, метод вернет ошибку.
