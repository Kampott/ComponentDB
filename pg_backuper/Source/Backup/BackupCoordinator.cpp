#include "BackupCoordinator.h"

#include <chrono>
#include <iostream>
#include <utility>

namespace backup {

BackupCoordinator::BackupCoordinator(std::shared_ptr<BackupDataStore> dataStore,
                                     std::shared_ptr<ActiveBackupManager> activeManager,
                                     std::shared_ptr<FileStorage> fileStorage,
                                     std::map<std::string, config::DatabaseSettings> databases,
                                     FullPhysicalBackupOptions backupOptions)
    : m_dataStore{std::move(dataStore)}
    , m_activeManager{std::move(activeManager)}
    , m_fileStorage{std::move(fileStorage)}
    , m_databases{std::move(databases)}
    , m_backupOptions{std::move(backupOptions)} {}

std::expected<int64_t, std::string> BackupCoordinator::startBackup(std::string databaseName, int64_t templateId,
                                                                   std::optional<int64_t> scheduleId) {
    const auto databaseIt = m_databases.find(databaseName);
    if (databaseIt == m_databases.end()) {
        return std::unexpected("Database not found");
    }

    const auto templateRecord = m_dataStore->getTemplate(templateId);
    if (!templateRecord) {
        return std::unexpected(templateRecord.error());
    }

    const auto backupId = m_dataStore->allocateBackupId();
    if (!backupId) {
        return std::unexpected(backupId.error());
    }

    auto options = m_backupOptions;
    options.templateId = templateId;
    options.includeWal = templateRecord->includeWal;
    options.checkpointTimeout = templateRecord->checkpointTimeout;

    const auto self = shared_from_this();
    auto weakBackup = std::make_shared<std::weak_ptr<ActiveBackup>>();
    ActiveBackupEvents events;
    events.onCompleted = [self, backupIdValue = *backupId, databaseName, templateSnapshot = *templateRecord, weakBackup,
                          scheduleId](CompletedBackupData data) {
        self->persistTerminalBackup(backupIdValue, std::move(databaseName), std::move(templateSnapshot),
                                    BackupStatus::Completed, std::move(data), std::nullopt, *weakBackup, scheduleId);
    };
    events.onFailed = [self, backupIdValue = *backupId, databaseName, templateSnapshot = *templateRecord, weakBackup,
                       scheduleId](std::string message) {
        self->persistTerminalBackup(backupIdValue, std::move(databaseName), std::move(templateSnapshot),
                                    BackupStatus::Failed, std::nullopt, std::move(message), *weakBackup, scheduleId);
    };
    events.onCancelled = [self, backupIdValue = *backupId, databaseName, templateSnapshot = *templateRecord, weakBackup,
                          scheduleId]() {
        self->persistTerminalBackup(backupIdValue, std::move(databaseName), std::move(templateSnapshot),
                                    BackupStatus::Cancelled, std::nullopt, std::nullopt, *weakBackup, scheduleId);
    };

    auto backup = std::make_shared<FullPhysicalBackup>(*backupId, std::move(databaseName), databaseIt->second,
                                                       m_fileStorage, std::move(events), std::move(options));
    *weakBackup = backup;

    const auto startResult = m_activeManager->start(std::move(backup));
    if (!startResult) {
        return std::unexpected(startResult.error());
    }

    return *backupId;
}

void BackupCoordinator::persistTerminalBackup(int64_t backupId, std::string databaseName,
                                              BackupTemplateRecord templateRecord, BackupStatus status,
                                              std::optional<CompletedBackupData> completedData,
                                              std::optional<std::string> errorMessage,
                                              std::weak_ptr<ActiveBackup> activeBackup,
                                              std::optional<int64_t> scheduleId) const {
    const auto finishedAt = std::chrono::system_clock::now();

    BackupRecord record{
        .backupId = backupId,
        .databaseName = std::move(databaseName),
        .templateId = templateRecord.templateId,
        .type = templateRecord.type,
        .includeWal = templateRecord.includeWal,
        .status = status,
        .startedAt = finishedAt,
        .finishedAt = finishedAt,
        .sizeBytes = 0,
        .originalSizeBytes = 0,
        .pgVersionNum = 0,
        .storagePath = completedData ? std::optional{completedData->finalPath.string()} : std::nullopt,
        .parentBackupId = std::nullopt,
        .errorMessage = std::move(errorMessage),
    };

    if (const auto backup = activeBackup.lock()) {
        const auto snapshot = backup->snapshot();
        if (snapshot.startedAt) {
            record.startedAt = *snapshot.startedAt;
        }
        record.sizeBytes = snapshot.progress.bytesProcessed;
        record.originalSizeBytes = snapshot.progress.bytesTotalEstimate;
    }

    if (completedData) {
        record.sizeBytes = completedData->sizeBytes;
        record.originalSizeBytes = completedData->originalSizeBytes;
        record.pgVersionNum = completedData->pgVersionNum;
    }

    if (const auto createResult = m_dataStore->createBackup(record); !createResult) {
        logBackgroundError("createBackup", createResult.error());
    }

    if (scheduleId) {
        updateScheduleAfterTerminalState(*scheduleId, backupId, status);
    }
}

void BackupCoordinator::updateScheduleAfterTerminalState(int64_t scheduleId, int64_t backupId,
                                                         BackupStatus status) const {
    const auto schedule = m_dataStore->getSchedule(scheduleId);
    if (!schedule) {
        logBackgroundError("getSchedule", schedule.error());
        return;
    }

    ScheduleUpdate update{
        .scheduleId = schedule->scheduleId,
        .displayName = schedule->displayName,
        .cronExpression = schedule->cronExpression,
        .timezone = schedule->timezone,
        .state = schedule->state,
        .templateId = schedule->templateId,
        .nextRunAt = schedule->nextRunAt,
        .lastRunAt = schedule->lastRunAt,
        .lastBackupId = backupId,
        .lastRunStatus = status,
    };

    if (const auto updateResult = m_dataStore->updateSchedule(update); !updateResult) {
        logBackgroundError("updateSchedule", updateResult.error());
    }
}

void BackupCoordinator::logBackgroundError(std::string_view scope, std::string_view message) const {
    std::cerr << "BackupCoordinator " << scope << " failed: " << message << std::endl;
}

}  // namespace backup
