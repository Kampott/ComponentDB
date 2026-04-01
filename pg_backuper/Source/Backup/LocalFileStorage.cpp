#include "LocalFileStorage.h"

#include <algorithm>
#include <charconv>
#include <format>
#include <system_error>

namespace backup {

namespace {
std::string pathError(std::string_view operation, const std::filesystem::path& path, const std::error_code& error) {
    return std::format("{} '{}': {}", operation, path.string(), error.message());
}

std::string storageError(std::string_view message, int64_t backupId) { return std::format("{} {}", message, backupId); }
}  // namespace

LocalFileStorage::LocalFileStorage(std::filesystem::path rootDir) : m_rootDir{std::move(rootDir)} {}

std::expected<std::filesystem::path, std::string> LocalFileStorage::workingPath(int64_t backupId) {
    if (const auto ready = ensureBaseDirectories(); !ready) {
        return std::unexpected(ready.error());
    }

    const auto path = workingBackupPath(backupId);
    std::error_code error;
    if (!std::filesystem::create_directory(path, error)) {
        if (!error && std::filesystem::exists(path)) {
            return std::unexpected(std::format("Working directory already exists for backup {}", backupId));
        }
        return std::unexpected(pathError("Cannot create working directory", path, error));
    }

    return path;
}

std::expected<std::filesystem::path, std::string> LocalFileStorage::commit(int64_t backupId, std::string_view dbName) {
    if (const auto ready = ensureBaseDirectories(); !ready) {
        return std::unexpected(ready.error());
    }

    const auto sourcePath = workingBackupPath(backupId);
    if (!std::filesystem::exists(sourcePath)) {
        return std::unexpected(storageError("Working directory not found for backup", backupId));
    }

    const auto databaseDir = m_rootDir / dbName;
    std::error_code error;
    std::filesystem::create_directories(databaseDir, error);
    if (error) {
        return std::unexpected(pathError("Cannot create final backup directory", databaseDir, error));
    }

    const auto targetPath = finalBackupPath(dbName, backupId);
    if (std::filesystem::exists(targetPath)) {
        return std::unexpected(std::format("Final directory already exists for backup {}", backupId));
    }

    std::filesystem::rename(sourcePath, targetPath, error);
    if (error) {
        return std::unexpected(pathError("Cannot move backup directory", sourcePath, error));
    }

    return targetPath;
}

std::expected<void, std::string> LocalFileStorage::remove(int64_t backupId) {
    const auto backupPath = findBackupPath(backupId);
    if (!backupPath) {
        return std::unexpected(backupPath.error());
    }

    std::error_code error;
    std::filesystem::remove_all(*backupPath, error);
    if (error) {
        return std::unexpected(pathError("Cannot remove backup directory", *backupPath, error));
    }

    return {};
}

std::expected<uint64_t, std::string> LocalFileStorage::sizeBytes(int64_t backupId) {
    const auto backupPath = findBackupPath(backupId);
    if (!backupPath) {
        return std::unexpected(backupPath.error());
    }

    uint64_t totalSize = 0;
    std::error_code error;
    for (std::filesystem::recursive_directory_iterator iterator{
             *backupPath, std::filesystem::directory_options::skip_permission_denied, error};
         iterator != std::filesystem::recursive_directory_iterator{}; iterator.increment(error)) {
        if (error) {
            return std::unexpected(pathError("Cannot traverse backup directory", *backupPath, error));
        }

        if (iterator->is_regular_file(error)) {
            if (error) {
                return std::unexpected(pathError("Cannot inspect backup file", iterator->path(), error));
            }

            const auto fileSize = iterator->file_size(error);
            if (error) {
                return std::unexpected(pathError("Cannot read backup file size", iterator->path(), error));
            }
            totalSize += fileSize;
        }
        error.clear();
    }

    if (error) {
        return std::unexpected(pathError("Cannot traverse backup directory", *backupPath, error));
    }

    return totalSize;
}

std::expected<std::vector<int64_t>, std::string> LocalFileStorage::listWorkingIds() {
    if (const auto ready = ensureBaseDirectories(); !ready) {
        return std::unexpected(ready.error());
    }

    std::vector<int64_t> result;
    std::error_code error;
    for (std::filesystem::directory_iterator iterator{workingDirPath(), error};
         iterator != std::filesystem::directory_iterator{}; iterator.increment(error)) {
        if (error) {
            return std::unexpected(pathError("Cannot list working directory", workingDirPath(), error));
        }

        if (!iterator->is_directory(error)) {
            if (error) {
                return std::unexpected(pathError("Cannot inspect working entry", iterator->path(), error));
            }
            continue;
        }

        const auto name = iterator->path().filename().string();
        int64_t backupId = 0;
        const auto* begin = name.data();
        const auto* end = begin + name.size();
        const auto [ptr, parseError] = std::from_chars(begin, end, backupId);
        if (parseError == std::errc{} && ptr == end) {
            result.push_back(backupId);
        }
    }

    if (error) {
        return std::unexpected(pathError("Cannot list working directory", workingDirPath(), error));
    }

    std::ranges::sort(result);
    return result;
}

std::expected<void, std::string> LocalFileStorage::ensureBaseDirectories() {
    std::error_code error;
    std::filesystem::create_directories(workingDirPath(), error);
    if (error) {
        return std::unexpected(pathError("Cannot create storage directory", workingDirPath(), error));
    }
    return {};
}

std::expected<std::filesystem::path, std::string> LocalFileStorage::findBackupPath(int64_t backupId) const {
    const auto workingPathCandidate = workingBackupPath(backupId);
    if (std::filesystem::exists(workingPathCandidate)) {
        return workingPathCandidate;
    }

    std::vector<std::filesystem::path> matches;
    std::error_code error;
    if (!std::filesystem::exists(m_rootDir, error)) {
        return std::unexpected(storageError("Backup directory not found for", backupId));
    }
    if (error) {
        return std::unexpected(pathError("Cannot inspect storage root", m_rootDir, error));
    }

    for (std::filesystem::directory_iterator iterator{m_rootDir, error};
         iterator != std::filesystem::directory_iterator{}; iterator.increment(error)) {
        if (error) {
            return std::unexpected(pathError("Cannot inspect storage root", m_rootDir, error));
        }

        if (!iterator->is_directory(error)) {
            if (error) {
                return std::unexpected(pathError("Cannot inspect storage entry", iterator->path(), error));
            }
            continue;
        }

        if (iterator->path().filename() == "working") {
            continue;
        }

        const auto candidate = iterator->path() / std::to_string(backupId);
        if (std::filesystem::exists(candidate)) {
            matches.push_back(candidate);
        }
    }

    if (error) {
        return std::unexpected(pathError("Cannot inspect storage root", m_rootDir, error));
    }
    if (matches.empty()) {
        return std::unexpected(storageError("Backup directory not found for", backupId));
    }
    if (matches.size() > 1) {
        return std::unexpected(storageError("Multiple backup directories found for", backupId));
    }
    return matches.front();
}

std::filesystem::path LocalFileStorage::workingDirPath() const { return m_rootDir / "working"; }

std::filesystem::path LocalFileStorage::workingBackupPath(int64_t backupId) const {
    return workingDirPath() / std::to_string(backupId);
}

std::filesystem::path LocalFileStorage::finalBackupPath(std::string_view dbName, int64_t backupId) const {
    return m_rootDir / dbName / std::to_string(backupId);
}

}  // namespace backup
