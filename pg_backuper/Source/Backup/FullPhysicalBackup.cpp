#include "FullPhysicalBackup.h"

#include <fcntl.h>
#include <sys/wait.h>
#include <unistd.h>

#include <array>
#include <csignal>
#include <cstdio>
#include <cstring>
#include <format>
#include <regex>
#include <string_view>
#include <vector>

namespace backup {

namespace {

const std::regex kProgressPattern{R"((\d+)\/(\d+)\s+kB\s+\(\d+%\)(?:,\s+(\d+)\/(\d+)\s+tablespace)?)"};

std::string trim(std::string_view value) {
    const auto begin = value.find_first_not_of(" \t\r\n");
    if (begin == std::string_view::npos) {
        return {};
    }

    const auto end = value.find_last_not_of(" \t\r\n");
    return std::string{value.substr(begin, end - begin + 1)};
}

}  // namespace

FullPhysicalBackup::FullPhysicalBackup(int64_t backupId, std::string databaseName, config::DatabaseSettings dbConfig,
                                       std::shared_ptr<FileStorage> fileStorage, ActiveBackupEvents events,
                                       FullPhysicalBackupOptions options)
    : m_backupId{backupId}
    , m_databaseName{std::move(databaseName)}
    , m_dbConfig{std::move(dbConfig)}
    , m_fileStorage{std::move(fileStorage)}
    , m_events{std::move(events)}
    , m_options{std::move(options)} {}

FullPhysicalBackup::~FullPhysicalBackup() {
    if (status() == BackupStatus::Running) {
        std::ignore = cancel();
    }
}

int64_t FullPhysicalBackup::id() const { return m_backupId; }

std::expected<void, std::string> FullPhysicalBackup::start() {
    bool expected = false;
    if (!m_started.compare_exchange_strong(expected, true)) {
        return std::unexpected("Backup already started");
    }

    const auto workingPath = m_fileStorage->workingPath(m_backupId);
    if (!workingPath) {
        m_started.store(false);
        return std::unexpected(workingPath.error());
    }

    m_workingPath = *workingPath;
    setProgress({});
    m_cancelRequested.store(false);
    m_status.store(BackupStatus::Running);
    {
        std::lock_guard lock{m_stateMutex};
        m_startedAt = std::chrono::system_clock::now();
    }

    m_worker = std::jthread([this] { run(); });
    return {};
}

std::expected<void, std::string> FullPhysicalBackup::cancel() {
    m_cancelRequested.store(true);

    if (status() != BackupStatus::Running) {
        return {};
    }

    const int pid = m_childPid.load();
    if (pid <= 0) {
        return {};
    }

    if (::kill(pid, SIGTERM) != 0 && errno != ESRCH) {
        return std::unexpected(std::format("Failed to terminate backup process {}: {}", pid, std::strerror(errno)));
    }

    return {};
}

BackupStatus FullPhysicalBackup::status() const { return m_status.load(); }

BackupProgress FullPhysicalBackup::progress() const {
    std::lock_guard lock{m_stateMutex};
    return m_progress;
}

ActiveBackupSnapshotData FullPhysicalBackup::snapshot() const {
    std::lock_guard lock{m_stateMutex};
    return ActiveBackupSnapshotData{
        .backupId = m_backupId,
        .databaseName = m_databaseName,
        .templateId = m_options.templateId,
        .status = m_status.load(),
        .progress = m_progress,
        .startedAt = m_startedAt,
    };
}

void FullPhysicalBackup::run() {
    const auto spawnResult = spawnProcess();
    if (!spawnResult) {
        finishFailed(spawnResult.error(), true);
    }
}

std::expected<void, std::string> FullPhysicalBackup::spawnProcess() {
    int pipeFds[2]{-1, -1};
    if (::pipe(pipeFds) != 0) {
        return std::unexpected(std::format("pipe() failed: {}", std::strerror(errno)));
    }

    const pid_t pid = ::fork();
    if (pid < 0) {
        ::close(pipeFds[0]);
        ::close(pipeFds[1]);
        return std::unexpected(std::format("fork() failed: {}", std::strerror(errno)));
    }

    if (pid == 0) {
        ::close(pipeFds[0]);
        ::dup2(pipeFds[1], STDOUT_FILENO);
        ::dup2(pipeFds[1], STDERR_FILENO);
        ::close(pipeFds[1]);

        const int devNull = ::open("/dev/null", O_RDONLY);
        if (devNull >= 0) {
            ::dup2(devNull, STDIN_FILENO);
            ::close(devNull);
        }

        ::setenv("PGPASSWORD", m_dbConfig.password.c_str(), 1);

        auto arguments = buildArguments();
        std::vector<char*> argv;
        argv.reserve(arguments.size() + 1);
        for (auto& argument : arguments) {
            argv.push_back(argument.data());
        }
        argv.push_back(nullptr);

        ::execvp(argv.front(), argv.data());
        std::fprintf(stderr, "execvp() failed: %s\n", std::strerror(errno));
        _exit(127);
    }

    m_childPid.store(pid);
    if (m_cancelRequested.load()) {
        ::kill(pid, SIGTERM);
    }
    ::close(pipeFds[1]);

    readProgressStream(pipeFds[0]);
    ::close(pipeFds[0]);

    int waitStatus = 0;
    if (::waitpid(pid, &waitStatus, 0) < 0) {
        m_childPid.store(-1);
        return std::unexpected(std::format("waitpid() failed: {}", std::strerror(errno)));
    }
    m_childPid.store(-1);

    if (m_cancelRequested.load()) {
        finishCancelled();
        return {};
    }

    if (WIFEXITED(waitStatus) && WEXITSTATUS(waitStatus) == 0) {
        finishCompleted();
        return {};
    }

    if (WIFEXITED(waitStatus)) {
        finishFailed(std::format("pg_basebackup exited with code {}", WEXITSTATUS(waitStatus)), true);
        return {};
    }

    if (WIFSIGNALED(waitStatus)) {
        finishFailed(std::format("pg_basebackup terminated by signal {}", WTERMSIG(waitStatus)), true);
        return {};
    }

    finishFailed("pg_basebackup ended in unexpected state", true);
    return {};
}

std::vector<std::string> FullPhysicalBackup::buildArguments() const {
    std::vector<std::string> arguments;
    arguments.push_back(m_options.executablePath.string());
    arguments.push_back("--host");
    arguments.push_back(m_dbConfig.host);
    arguments.push_back("--port");
    arguments.push_back(std::to_string(m_dbConfig.port));
    arguments.push_back("--username");
    arguments.push_back(m_dbConfig.user);
    arguments.push_back("--pgdata");
    arguments.push_back(m_workingPath.string());
    arguments.push_back("--progress");
    arguments.push_back("--verbose");
    arguments.push_back("--no-password");
    arguments.push_back("--wal-method");
    arguments.push_back(m_options.includeWal ? "stream" : "none");
    return arguments;
}

void FullPhysicalBackup::readProgressStream(int streamFd) {
    std::string buffer;
    std::array<char, 4096> chunk{};

    while (true) {
        const ssize_t bytesRead = ::read(streamFd, chunk.data(), chunk.size());
        if (bytesRead == 0) {
            break;
        }
        if (bytesRead < 0) {
            if (errno == EINTR) {
                continue;
            }
            break;
        }

        buffer.append(chunk.data(), static_cast<size_t>(bytesRead));

        size_t lineEnd = 0;
        while ((lineEnd = buffer.find('\n')) != std::string::npos) {
            const auto line = trim(std::string_view{buffer}.substr(0, lineEnd));
            if (!line.empty()) {
                handleProgressLine(line);
            }
            buffer.erase(0, lineEnd + 1);
        }
    }

    const auto line = trim(buffer);
    if (!line.empty()) {
        handleProgressLine(line);
    }
}

void FullPhysicalBackup::handleProgressLine(std::string_view line) {
    static const auto kKilobyte = 1024ULL;

    std::match_results<std::string_view::const_iterator> match;
    if (!std::regex_search(line.begin(), line.end(), match, kProgressPattern)) {
        return;
    }

    BackupProgress nextProgress;
    nextProgress.bytesProcessed = std::stoull(match[1].str()) * kKilobyte;
    nextProgress.bytesTotalEstimate = std::stoull(match[2].str()) * kKilobyte;
    if (match[3].matched && match[4].matched) {
        nextProgress.filesProcessed = std::stoull(match[3].str());
        nextProgress.filesTotalEstimate = std::stoull(match[4].str());
    }

    setProgress(nextProgress);
}

void FullPhysicalBackup::finishCompleted() {
    const auto sizeBytes = m_fileStorage->sizeBytes(m_backupId);
    if (!sizeBytes) {
        finishFailed(sizeBytes.error(), false);
        return;
    }

    const auto finalPath = m_fileStorage->commit(m_backupId, m_databaseName);
    if (!finalPath) {
        finishFailed(finalPath.error(), false);
        return;
    }

    auto finalProgress = progress();
    finalProgress.bytesProcessed = *sizeBytes;
    if (finalProgress.bytesTotalEstimate == 0) {
        finalProgress.bytesTotalEstimate = *sizeBytes;
    }
    setProgress(finalProgress);

    m_status.store(BackupStatus::Completed);
    if (m_events.onCompleted) {
        m_events.onCompleted(CompletedBackupData{
            .sizeBytes = *sizeBytes,
            .originalSizeBytes = finalProgress.bytesTotalEstimate,
            .pgVersionNum = 0,
            .finalPath = *finalPath,
        });
    }
}

void FullPhysicalBackup::finishFailed(std::string message, bool cleanupWorkingDirectory) {
    if (cleanupWorkingDirectory) {
        if (const auto cleanupError = this->cleanupWorkingDirectory(); cleanupError) {
            message = std::format("{}; cleanup failed: {}", message, *cleanupError);
        }
    }

    m_status.store(BackupStatus::Failed);
    if (m_events.onFailed) {
        m_events.onFailed(std::move(message));
    }
}

void FullPhysicalBackup::finishCancelled() {
    std::ignore = cleanupWorkingDirectory();

    m_status.store(BackupStatus::Cancelled);
    if (m_events.onCancelled) {
        m_events.onCancelled();
    }
}

std::optional<std::string> FullPhysicalBackup::cleanupWorkingDirectory() {
    const auto removeResult = m_fileStorage->remove(m_backupId);
    if (!removeResult) {
        return removeResult.error();
    }
    return std::nullopt;
}

void FullPhysicalBackup::setProgress(BackupProgress progress) {
    {
        std::lock_guard lock{m_stateMutex};
        m_progress = progress;
    }

    if (m_events.onProgress) {
        m_events.onProgress(progress);
    }
}

}  // namespace backup
