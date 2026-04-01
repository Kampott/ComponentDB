#pragma once

#include <atomic>
#include <expected>
#include <filesystem>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <vector>

#include "ActiveBackup.h"
#include "Config/Config.h"
#include "FileStorage.h"
#include "Types.h"

namespace backup {

struct FullPhysicalBackupOptions {
    std::filesystem::path executablePath{"pg_basebackup"};
    std::optional<int64_t> templateId;
    bool includeWal{false};
    int32_t checkpointTimeout{0};
};

class FullPhysicalBackup : public ActiveBackup {
public:
    FullPhysicalBackup(int64_t backupId, std::string databaseName, config::DatabaseSettings dbConfig,
                       std::shared_ptr<FileStorage> fileStorage, ActiveBackupEvents events,
                       FullPhysicalBackupOptions options = {});
    ~FullPhysicalBackup() override;

    FullPhysicalBackup(const FullPhysicalBackup&) = delete;
    FullPhysicalBackup& operator=(const FullPhysicalBackup&) = delete;

    int64_t id() const override;
    std::expected<void, std::string> start() override;
    std::expected<void, std::string> cancel() override;
    BackupStatus status() const override;
    BackupProgress progress() const override;
    ActiveBackupSnapshotData snapshot() const override;

private:
    void run();
    std::expected<void, std::string> spawnProcess();
    std::vector<std::string> buildArguments() const;
    void readProgressStream(int streamFd);
    void handleProgressLine(std::string_view line);
    void finishCompleted();
    void finishFailed(std::string message, bool cleanupWorkingDirectory);
    void finishCancelled();
    std::optional<std::string> cleanupWorkingDirectory();
    void setProgress(BackupProgress progress);

    int64_t m_backupId;
    std::string m_databaseName;
    config::DatabaseSettings m_dbConfig;
    std::shared_ptr<FileStorage> m_fileStorage;
    ActiveBackupEvents m_events;
    FullPhysicalBackupOptions m_options;
    std::filesystem::path m_workingPath;

    std::jthread m_worker;
    std::atomic<BackupStatus> m_status{BackupStatus::Queued};
    std::atomic_bool m_started{false};
    std::atomic_bool m_cancelRequested{false};
    std::atomic<int> m_childPid{-1};

    mutable std::mutex m_stateMutex;
    BackupProgress m_progress;
    std::optional<TimePoint> m_startedAt;
};

}  // namespace backup
