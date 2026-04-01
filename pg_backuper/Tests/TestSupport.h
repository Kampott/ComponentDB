#pragma once

#include <chrono>
#include <filesystem>
#include <string>

namespace backup::test {

class TempDirectory {
public:
    explicit TempDirectory(std::string prefix) {
        const auto uniqueSuffix = std::to_string(std::chrono::steady_clock::now().time_since_epoch().count());
        m_path = std::filesystem::temp_directory_path() / (std::move(prefix) + "_" + uniqueSuffix);
        std::filesystem::create_directories(m_path);
    }

    ~TempDirectory() { std::filesystem::remove_all(m_path); }

    TempDirectory(const TempDirectory&) = delete;
    TempDirectory& operator=(const TempDirectory&) = delete;

    TempDirectory(TempDirectory&&) = delete;
    TempDirectory& operator=(TempDirectory&&) = delete;

    const std::filesystem::path& path() const { return m_path; }

private:
    std::filesystem::path m_path;
};

}  // namespace backup::test
