#pragma once

#include <expected>
#include <map>
#include <memory>
#include <optional>
#include <string>

#include "ActiveBackupManager.h"
#include "BackupDataStore.h"
#include "Config/Config.h"
#include "FileStorage.h"
#include "FullPhysicalBackup.h"

namespace backup {

class BackupCoordinator : public std::enable_shared_from_this<BackupCoordinator> {
public:
    BackupCoordinator(std::shared_ptr<BackupDataStore> dataStore, std::shared_ptr<ActiveBackupManager> activeManager,
                      std::shared_ptr<FileStorage> fileStorage,
                      std::map<std::string, config::DatabaseSettings> databases,
                      FullPhysicalBackupOptions backupOptions = {});

    std::expected<int64_t, std::string> startBackup(std::string databaseName, int64_t templateId,
                                                    std::optional<int64_t> scheduleId = std::nullopt);

private:
    void persistTerminalBackup(int64_t backupId, std::string databaseName, BackupTemplateRecord templateRecord,
                               BackupStatus status, std::optional<CompletedBackupData> completedData,
                               std::optional<std::string> errorMessage, std::weak_ptr<ActiveBackup> activeBackup,
                               std::optional<int64_t> scheduleId) const;
    void updateScheduleAfterTerminalState(int64_t scheduleId, int64_t backupId, BackupStatus status) const;
    void logBackgroundError(std::string_view scope, std::string_view message) const;

    std::shared_ptr<BackupDataStore> m_dataStore;
    std::shared_ptr<ActiveBackupManager> m_activeManager;
    std::shared_ptr<FileStorage> m_fileStorage;
    std::map<std::string, config::DatabaseSettings> m_databases;
    FullPhysicalBackupOptions m_backupOptions;
};

}  // namespace backup
