#include "ActiveBackupManager.h"

namespace backup {

ActiveBackupManager::ActiveBackupManager() : m_backups{std::make_shared<const Snapshot>()} {}

ActiveBackupManager::~ActiveBackupManager() = default;

std::expected<void, std::string> ActiveBackupManager::start(std::shared_ptr<ActiveBackup> backup) {
    if (!backup) {
        return std::unexpected("Backup is null");
    }

    pruneFinished();

    const auto startResult = backup->start();
    if (!startResult) {
        return startResult;
    }

    while (true) {
        auto current = m_backups.load();
        for (const auto& existing : *current) {
            if (existing->id() == backup->id()) {
                return std::unexpected("Backup already registered");
            }
        }

        auto next = std::make_shared<Snapshot>(*current);
        next->push_back(backup);
        if (m_backups.compare_exchange_weak(current, std::const_pointer_cast<const Snapshot>(next))) {
            break;
        }
    }

    return {};
}

CancelActiveBackupResult ActiveBackupManager::cancel(int64_t backupId) {
    const auto current = m_backups.load();
    for (const auto& backup : *current) {
        if (backup->id() != backupId) {
            continue;
        }

        if (isFinished(backup->status())) {
            remove(backupId);
            return CancelActiveBackupResult::AlreadyFinished;
        }

        const auto cancelResult = backup->cancel();
        if (!cancelResult) {
            return CancelActiveBackupResult::AlreadyFinished;
        }

        return CancelActiveBackupResult::Success;
    }

    pruneFinished();
    return CancelActiveBackupResult::NotFound;
}

std::shared_ptr<ActiveBackup> ActiveBackupManager::get(int64_t backupId) const {
    const_cast<ActiveBackupManager*>(this)->pruneFinished();

    const auto current = m_backups.load();
    for (const auto& backup : *current) {
        if (backup->id() == backupId) {
            return backup;
        }
    }
    return nullptr;
}

std::vector<std::shared_ptr<ActiveBackup>> ActiveBackupManager::getAll() const {
    const_cast<ActiveBackupManager*>(this)->pruneFinished();
    const auto current = m_backups.load();
    return *current;
}

void ActiveBackupManager::pruneFinished() {
    while (true) {
        auto current = m_backups.load();
        auto next = std::make_shared<Snapshot>();
        next->reserve(current->size());

        bool changed = false;
        for (const auto& backup : *current) {
            if (isFinished(backup->status())) {
                changed = true;
                continue;
            }
            next->push_back(backup);
        }

        if (!changed) {
            return;
        }

        if (m_backups.compare_exchange_weak(current, std::const_pointer_cast<const Snapshot>(next))) {
            return;
        }
    }
}

void ActiveBackupManager::remove(int64_t backupId) {
    while (true) {
        auto current = m_backups.load();
        auto next = std::make_shared<Snapshot>();
        next->reserve(current->size());

        bool removed = false;
        for (const auto& backup : *current) {
            if (backup->id() == backupId) {
                removed = true;
                continue;
            }
            next->push_back(backup);
        }

        if (!removed) {
            break;
        }

        if (m_backups.compare_exchange_weak(current, std::const_pointer_cast<const Snapshot>(next))) {
            break;
        }
    }
}

bool ActiveBackupManager::isFinished(BackupStatus status) {
    return status == BackupStatus::Completed || status == BackupStatus::Failed || status == BackupStatus::Cancelled;
}

}  // namespace backup
