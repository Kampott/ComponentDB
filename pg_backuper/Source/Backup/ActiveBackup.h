#pragma once

#include <expected>
#include <filesystem>
#include <functional>
#include <string>

#include "Types.h"

namespace backup {

struct BackupProgress {
    uint64_t bytesProcessed{0};
    uint64_t bytesTotalEstimate{0};
    uint64_t filesProcessed{0};
    uint64_t filesTotalEstimate{0};
};

struct CompletedBackupData {
    uint64_t sizeBytes{0};
    uint64_t originalSizeBytes{0};
    uint32_t pgVersionNum{0};
    std::filesystem::path finalPath;
};

struct ActiveBackupEvents {
    std::function<void(BackupProgress)> onProgress;
    std::function<void(CompletedBackupData)> onCompleted;
    std::function<void(std::string)> onFailed;
    std::function<void()> onCancelled;
};

struct ActiveBackupSnapshotData {
    int64_t backupId{0};
    std::string databaseName;
    std::optional<int64_t> templateId;
    BackupStatus status{BackupStatus::Queued};
    BackupProgress progress;
    std::optional<TimePoint> startedAt;
};

class ActiveBackup {
public:
    virtual ~ActiveBackup() = default;

    virtual int64_t id() const = 0;
    virtual std::expected<void, std::string> start() = 0;
    virtual std::expected<void, std::string> cancel() = 0;
    virtual BackupStatus status() const = 0;
    virtual BackupProgress progress() const = 0;
    virtual ActiveBackupSnapshotData snapshot() const = 0;
};

}  // namespace backup
