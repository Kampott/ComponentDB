#pragma once

#include <atomic>
#include <expected>
#include <memory>
#include <vector>

#include "ActiveBackup.h"

namespace backup {

enum class CancelActiveBackupResult : int {
    Success = 0,
    NotFound = 1,
    AlreadyFinished = 2,
};

class ActiveBackupManager {
public:
    ActiveBackupManager();
    ~ActiveBackupManager();

    std::expected<void, std::string> start(std::shared_ptr<ActiveBackup> backup);
    CancelActiveBackupResult cancel(int64_t backupId);
    std::shared_ptr<ActiveBackup> get(int64_t backupId) const;
    std::vector<std::shared_ptr<ActiveBackup>> getAll() const;

private:
    using Snapshot = std::vector<std::shared_ptr<ActiveBackup>>;

    void pruneFinished();
    void remove(int64_t backupId);
    static bool isFinished(BackupStatus status);

    std::atomic<std::shared_ptr<const Snapshot>> m_backups;
};

}  // namespace backup
