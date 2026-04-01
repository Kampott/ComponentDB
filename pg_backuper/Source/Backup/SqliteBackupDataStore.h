#pragma once
#include <atomic>
#include <filesystem>
#include <mutex>

#include "BackupDataStore.h"

struct sqlite3;

namespace backup {
class SqliteBackupDataStore : public BackupDataStore {
public:
    explicit SqliteBackupDataStore(const std::filesystem::path& dbPath);
    ~SqliteBackupDataStore() override;

    SqliteBackupDataStore(const SqliteBackupDataStore&) = delete;
    SqliteBackupDataStore& operator=(const SqliteBackupDataStore&) = delete;

    std::expected<int64_t, std::string> allocateBackupId() override;

    std::expected<int64_t, std::string> createTemplate(const BackupTemplateRecord&) override;
    std::expected<void, std::string> updateTemplate(const BackupTemplateUpdate&) override;
    std::expected<BackupTemplateRecord, std::string> getTemplate(int64_t) override;
    std::expected<std::vector<BackupTemplateRecord>, std::string> listTemplates() override;
    std::expected<void, std::string> deleteTemplate(int64_t) override;

    std::expected<void, std::string> createBackup(const BackupRecord&) override;
    std::expected<void, std::string> updateBackup(const BackupUpdate&) override;
    std::expected<BackupRecord, std::string> getBackup(int64_t) override;
    std::expected<std::vector<BackupRecord>, std::string> listBackups(const ListBackupsFilter&) override;
    std::expected<void, std::string> deleteBackup(int64_t) override;

    std::expected<void, std::string> saveVerification(const BackupVerificationRecord&) override;
    std::expected<std::optional<BackupVerificationRecord>, std::string> getVerification(int64_t) override;

    std::expected<int64_t, std::string> createSchedule(const ScheduleRecord&) override;
    std::expected<void, std::string> updateSchedule(const ScheduleUpdate&) override;
    std::expected<ScheduleRecord, std::string> getSchedule(int64_t) override;
    std::expected<std::vector<ScheduleRecord>, std::string> listSchedules(std::string_view) override;
    std::expected<void, std::string> deleteSchedule(int64_t) override;

private:
    void createSchema();
    void initBackupIdCounter();

    sqlite3* m_database{nullptr};
    std::atomic<int64_t> m_nextBackupId{1};
    mutable std::mutex m_mutex;
};
}  // namespace backup
