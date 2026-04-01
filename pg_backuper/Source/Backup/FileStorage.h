#pragma once

#include <cstdint>
#include <expected>
#include <filesystem>
#include <string>
#include <string_view>
#include <vector>

namespace backup {
class FileStorage {
public:
    virtual ~FileStorage() = default;

    virtual std::expected<std::filesystem::path, std::string> workingPath(int64_t backupId) = 0;
    virtual std::expected<std::filesystem::path, std::string> commit(int64_t backupId, std::string_view dbName) = 0;
    virtual std::expected<void, std::string> remove(int64_t backupId) = 0;
    virtual std::expected<uint64_t, std::string> sizeBytes(int64_t backupId) = 0;
    virtual std::expected<std::vector<int64_t>, std::string> listWorkingIds() = 0;
};
}  // namespace backup
