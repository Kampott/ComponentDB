#pragma once

#include <filesystem>

#include "FileStorage.h"

namespace backup {
class LocalFileStorage : public FileStorage {
public:
    explicit LocalFileStorage(std::filesystem::path rootDir);

    std::expected<std::filesystem::path, std::string> workingPath(int64_t backupId) override;
    std::expected<std::filesystem::path, std::string> commit(int64_t backupId, std::string_view dbName) override;
    std::expected<void, std::string> remove(int64_t backupId) override;
    std::expected<uint64_t, std::string> sizeBytes(int64_t backupId) override;
    std::expected<std::vector<int64_t>, std::string> listWorkingIds() override;

private:
    std::expected<void, std::string> ensureBaseDirectories();
    std::expected<std::filesystem::path, std::string> findBackupPath(int64_t backupId) const;

    std::filesystem::path workingDirPath() const;
    std::filesystem::path workingBackupPath(int64_t backupId) const;
    std::filesystem::path finalBackupPath(std::string_view dbName, int64_t backupId) const;

    std::filesystem::path m_rootDir;
};
}  // namespace backup
