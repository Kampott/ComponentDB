#pragma once

#include <expected>
#include <string>
#include <string_view>
#include <vector>

#include "Types.h"

namespace backup {
class BackupDataStore {
public:
    virtual ~BackupDataStore() = default;

    // Выдаёт следующий backup_id для активного бэкапа (не пишет в БД).
    // Имя рабочей директории строится на основе этого id.
    virtual std::expected<int64_t, std::string> allocateBackupId() = 0;

    // Шаблоны
    virtual std::expected<int64_t, std::string> createTemplate(const BackupTemplateRecord&) = 0;
    virtual std::expected<void, std::string> updateTemplate(const BackupTemplateUpdate&) = 0;
    virtual std::expected<BackupTemplateRecord, std::string> getTemplate(int64_t templateId) = 0;
    virtual std::expected<std::vector<BackupTemplateRecord>, std::string> listTemplates() = 0;
    virtual std::expected<void, std::string> deleteTemplate(int64_t templateId) = 0;

    // Терминальные бэкапы
    // backupId должен быть предварительно выдан через allocateBackupId
    virtual std::expected<void, std::string> createBackup(const BackupRecord&) = 0;
    virtual std::expected<void, std::string> updateBackup(const BackupUpdate&) = 0;
    virtual std::expected<BackupRecord, std::string> getBackup(int64_t backupId) = 0;
    virtual std::expected<std::vector<BackupRecord>, std::string> listBackups(const ListBackupsFilter&) = 0;
    virtual std::expected<void, std::string> deleteBackup(int64_t backupId) = 0;

    // Верификация
    // Запись существует только если верификация была запрошена
    virtual std::expected<void, std::string> saveVerification(const BackupVerificationRecord&) = 0;
    virtual std::expected<std::optional<BackupVerificationRecord>, std::string> getVerification(int64_t backupId) = 0;

    // Расписания
    virtual std::expected<int64_t, std::string> createSchedule(const ScheduleRecord&) = 0;
    virtual std::expected<void, std::string> updateSchedule(const ScheduleUpdate&) = 0;
    virtual std::expected<ScheduleRecord, std::string> getSchedule(int64_t scheduleId) = 0;
    virtual std::expected<std::vector<ScheduleRecord>, std::string> listSchedules(std::string_view databaseName) = 0;
    virtual std::expected<void, std::string> deleteSchedule(int64_t scheduleId) = 0;
};
}  // namespace backup
