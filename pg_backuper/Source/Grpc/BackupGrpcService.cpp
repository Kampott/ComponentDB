#include "BackupGrpcService.h"

#include <google/protobuf/duration.pb.h>
#include <google/protobuf/timestamp.pb.h>
#include <openssl/sha.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <sstream>
#include <string_view>
#include <vector>

namespace {

google::protobuf::Timestamp toTimestamp(const backup::TimePoint& timePoint) {
    const auto duration = timePoint.time_since_epoch();
    const auto seconds = std::chrono::duration_cast<std::chrono::seconds>(duration);
    google::protobuf::Timestamp timestamp;
    timestamp.set_seconds(seconds.count());
    timestamp.set_nanos(std::chrono::duration_cast<std::chrono::nanoseconds>(duration - seconds).count());
    return timestamp;
}

google::protobuf::Duration toDuration(const backup::TimePoint& start, const backup::TimePoint& end) {
    const auto duration = end - start;
    const auto seconds = std::chrono::duration_cast<std::chrono::seconds>(duration);
    google::protobuf::Duration protoDuration;
    protoDuration.set_seconds(seconds.count());
    protoDuration.set_nanos(std::chrono::duration_cast<std::chrono::nanoseconds>(duration - seconds).count());
    return protoDuration;
}

pgbackup::v1::BackupType toProto(backup::BackupType type) {
    switch (type) {
        case backup::BackupType::FullPhysical:
        default:
            return pgbackup::v1::BACKUP_TYPE_FULL_PHYSICAL;
    }
}

pgbackup::v1::BackupStatus toProto(backup::BackupStatus status) {
    switch (status) {
        case backup::BackupStatus::Queued:
            return pgbackup::v1::BACKUP_STATUS_QUEUED;
        case backup::BackupStatus::Running:
            return pgbackup::v1::BACKUP_STATUS_RUNNING;
        case backup::BackupStatus::Completed:
            return pgbackup::v1::BACKUP_STATUS_COMPLETED;
        case backup::BackupStatus::Failed:
            return pgbackup::v1::BACKUP_STATUS_FAILED;
        case backup::BackupStatus::Cancelled:
            return pgbackup::v1::BACKUP_STATUS_CANCELLED;
        case backup::BackupStatus::Deleting:
            return pgbackup::v1::BACKUP_STATUS_DELETING;
        case backup::BackupStatus::Verifying:
            return pgbackup::v1::BACKUP_STATUS_VERIFYING;
        default:
            return pgbackup::v1::BACKUP_STATUS_QUEUED;
    }
}

backup::BackupType toRecord(pgbackup::v1::BackupType type) {
    switch (type) {
        case pgbackup::v1::BACKUP_TYPE_FULL_PHYSICAL:
        default:
            return backup::BackupType::FullPhysical;
    }
}

backup::BackupStatus toRecord(pgbackup::v1::BackupStatus status) {
    switch (status) {
        case pgbackup::v1::BACKUP_STATUS_QUEUED:
            return backup::BackupStatus::Queued;
        case pgbackup::v1::BACKUP_STATUS_RUNNING:
            return backup::BackupStatus::Running;
        case pgbackup::v1::BACKUP_STATUS_COMPLETED:
            return backup::BackupStatus::Completed;
        case pgbackup::v1::BACKUP_STATUS_FAILED:
            return backup::BackupStatus::Failed;
        case pgbackup::v1::BACKUP_STATUS_CANCELLED:
            return backup::BackupStatus::Cancelled;
        case pgbackup::v1::BACKUP_STATUS_DELETING:
            return backup::BackupStatus::Deleting;
        case pgbackup::v1::BACKUP_STATUS_VERIFYING:
            return backup::BackupStatus::Verifying;
        default:
            return backup::BackupStatus::Queued;
    }
}

pgbackup::v1::ScheduleState toProto(backup::ScheduleState state) {
    switch (state) {
        case backup::ScheduleState::Active:
            return pgbackup::v1::SCHEDULE_STATE_ACTIVE;
        case backup::ScheduleState::Paused:
            return pgbackup::v1::SCHEDULE_STATE_PAUSED;
        default:
            return pgbackup::v1::SCHEDULE_STATE_ACTIVE;
    }
}

backup::ScheduleState toRecord(pgbackup::v1::ScheduleState state) {
    switch (state) {
        case pgbackup::v1::SCHEDULE_STATE_PAUSED:
            return backup::ScheduleState::Paused;
        case pgbackup::v1::SCHEDULE_STATE_ACTIVE:
        default:
            return backup::ScheduleState::Active;
    }
}

template <typename Enum>
bool matchesFilterValue(const std::vector<Enum>& values, Enum current) {
    return values.empty() || std::ranges::find(values, current) != values.end();
}

bool matchesFilter(const backup::ActiveBackupSnapshotData& snapshot, const backup::ListBackupsFilter& filter) {
    if (filter.databaseName && snapshot.databaseName != *filter.databaseName) {
        return false;
    }
    if (!matchesFilterValue(filter.types, backup::BackupType::FullPhysical)) {
        return false;
    }
    if (!matchesFilterValue(filter.statuses, snapshot.status)) {
        return false;
    }
    if (filter.onlyAfter && snapshot.startedAt && *snapshot.startedAt <= *filter.onlyAfter) {
        return false;
    }
    if (filter.onlyAfter && !snapshot.startedAt) {
        return false;
    }
    return true;
}

std::string computeSha256ForDirectory(const std::filesystem::path& rootPath) {
    std::vector<std::filesystem::path> files;
    for (std::filesystem::recursive_directory_iterator iterator{rootPath};
         iterator != std::filesystem::recursive_directory_iterator{}; ++iterator) {
        if (iterator->is_regular_file()) {
            files.push_back(iterator->path());
        }
    }

    std::ranges::sort(files);

    SHA256_CTX context;
    SHA256_Init(&context);

    std::array<char, 4096> buffer{};
    for (const auto& file : files) {
        const auto relativePath = std::filesystem::relative(file, rootPath).generic_string();
        SHA256_Update(&context, relativePath.data(), relativePath.size());

        std::ifstream stream{file, std::ios::binary};
        while (stream.good()) {
            stream.read(buffer.data(), static_cast<std::streamsize>(buffer.size()));
            const auto bytesRead = stream.gcount();
            if (bytesRead > 0) {
                SHA256_Update(&context, buffer.data(), static_cast<size_t>(bytesRead));
            }
        }
    }

    std::array<unsigned char, SHA256_DIGEST_LENGTH> digest{};
    SHA256_Final(digest.data(), &context);

    std::ostringstream output;
    output << std::hex << std::setfill('0');
    for (unsigned char byte : digest) {
        output << std::setw(2) << static_cast<int>(byte);
    }
    return output.str();
}

}  // namespace

BackupGrpcService::BackupGrpcService(std::shared_ptr<backup::BackupDataStore> dataStore,
                                     std::shared_ptr<backup::BackupCoordinator> backupCoordinator,
                                     std::shared_ptr<backup::ActiveBackupManager> activeManager,
                                     std::shared_ptr<backup::ScheduleManager> scheduleManager,
                                     std::shared_ptr<backup::FileStorage> fileStorage,
                                     std::map<std::string, config::DatabaseSettings> databases)
    : m_dataStore{std::move(dataStore)}
    , m_backupCoordinator{std::move(backupCoordinator)}
    , m_activeManager{std::move(activeManager)}
    , m_scheduleManager{std::move(scheduleManager)}
    , m_fileStorage{std::move(fileStorage)}
    , m_databases{std::move(databases)} {}

grpc::Status BackupGrpcService::PingDatabase(grpc::ServerContext*, const google::protobuf::Empty*,
                                             pgbackup::v1::PingDatabaseResponse* response) {
    for (const auto& [name, database] : m_databases) {
        auto* info = response->add_databases();
        info->set_name(name);
        auto* config = info->mutable_config();
        config->set_schema(database.schema);
        config->set_user(database.user);
        config->set_password(database.password);
        config->set_host(database.host);
        config->set_port(database.port);
    }
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::CreateBackupTemplate(grpc::ServerContext*,
                                                     const pgbackup::v1::CreateBackupTemplateRequest* request,
                                                     pgbackup::v1::BackupTemplate* response) {
    const auto templateId = m_dataStore->createTemplate(toRecord(*request));
    if (!templateId) {
        return makeDataStoreStatus(templateId.error());
    }

    const auto record = m_dataStore->getTemplate(*templateId);
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::UpdateBackupTemplate(grpc::ServerContext*,
                                                     const pgbackup::v1::UpdateBackupTemplateRequest* request,
                                                     pgbackup::v1::BackupTemplate* response) {
    const auto updateResult = m_dataStore->updateTemplate(toUpdate(*request));
    if (!updateResult) {
        return makeDataStoreStatus(updateResult.error());
    }

    const auto record = m_dataStore->getTemplate(request->template_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::GetBackupTemplate(grpc::ServerContext*,
                                                  const pgbackup::v1::GetBackupTemplateRequest* request,
                                                  pgbackup::v1::BackupTemplate* response) {
    const auto record = m_dataStore->getTemplate(request->template_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::ListBackupTemplates(grpc::ServerContext*,
                                                    const pgbackup::v1::ListBackupTemplatesRequest*,
                                                    pgbackup::v1::ListBackupTemplatesResponse* response) {
    const auto records = m_dataStore->listTemplates();
    if (!records) {
        return makeDataStoreStatus(records.error());
    }

    for (const auto& record : *records) {
        *response->add_templates() = toProto(record);
    }
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::DeleteBackupTemplate(grpc::ServerContext*,
                                                     const pgbackup::v1::DeleteBackupTemplateRequest* request,
                                                     google::protobuf::Empty*) {
    const auto result = m_dataStore->deleteTemplate(request->template_id());
    if (!result) {
        return makeDataStoreStatus(result.error());
    }
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::StartBackup(grpc::ServerContext*, const pgbackup::v1::StartBackupRequest* request,
                                            pgbackup::v1::StartBackupResponse* response) {
    const auto startResult = m_backupCoordinator->startBackup(request->database_name(), request->template_id());
    if (!startResult) {
        if (startResult.error().find("not found") != std::string::npos || startResult.error() == "Database not found") {
            return makeStatus(grpc::StatusCode::NOT_FOUND, startResult.error());
        }
        return makeStatus(grpc::StatusCode::INTERNAL, startResult.error());
    }

    response->set_backup_id(*startResult);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::CancelBackup(grpc::ServerContext*, const pgbackup::v1::CancelBackupRequest* request,
                                             pgbackup::v1::CancelBackupResponse* response) {
    switch (m_activeManager->cancel(request->backup_id())) {
        case backup::CancelActiveBackupResult::Success:
            response->set_result(pgbackup::v1::CANCEL_RESULT_SUCCESS);
            break;
        case backup::CancelActiveBackupResult::NotFound:
            response->set_result(pgbackup::v1::CANCEL_RESULT_NOT_FOUND);
            response->set_message("Backup not found");
            break;
        case backup::CancelActiveBackupResult::AlreadyFinished:
            response->set_result(pgbackup::v1::CANCEL_RESULT_ALREADY_FINISHED);
            response->set_message("Backup already finished");
            break;
    }
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::GetBackups(grpc::ServerContext*, const pgbackup::v1::ListBackupsRequest* request,
                                           pgbackup::v1::ListBackupsResponse* response) {
    const auto filter = toFilter(*request);
    const auto records = m_dataStore->listBackups(filter);
    if (!records) {
        return makeDataStoreStatus(records.error());
    }

    std::vector<std::pair<backup::TimePoint, pgbackup::v1::Backup>> mergedBackups;
    mergedBackups.reserve(records->size() + m_activeManager->getAll().size());

    for (const auto& activeBackup : m_activeManager->getAll()) {
        const auto snapshot = activeBackup->snapshot();
        if (!::matchesFilter(snapshot, filter)) {
            continue;
        }
        mergedBackups.emplace_back(snapshot.startedAt.value_or(backup::TimePoint{}), toProto(snapshot));
    }

    for (const auto& record : *records) {
        mergedBackups.emplace_back(record.startedAt, toProto(record));
    }

    std::ranges::sort(mergedBackups, [](const auto& lhs, const auto& rhs) { return lhs.first > rhs.first; });
    for (auto& [_, backup] : mergedBackups) {
        *response->add_backups() = std::move(backup);
    }
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::GetBackup(grpc::ServerContext*, const pgbackup::v1::GetBackupRequest* request,
                                          pgbackup::v1::Backup* response) {
    if (const auto activeBackup = m_activeManager->get(request->backup_id())) {
        *response = toProto(activeBackup->snapshot());
        return grpc::Status::OK;
    }

    const auto record = m_dataStore->getBackup(request->backup_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::DeleteBackup(grpc::ServerContext*, const pgbackup::v1::DeleteBackupRequest* request,
                                             google::protobuf::Empty*) {
    if (m_activeManager->get(request->backup_id())) {
        return makeStatus(grpc::StatusCode::FAILED_PRECONDITION, "Cannot delete active backup");
    }

    const auto record = m_dataStore->getBackup(request->backup_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    if (record->storagePath) {
        const auto removeResult = m_fileStorage->remove(request->backup_id());
        if (!removeResult) {
            return makeStatus(grpc::StatusCode::INTERNAL, removeResult.error());
        }
    }

    const auto deleteResult = m_dataStore->deleteBackup(request->backup_id());
    if (!deleteResult) {
        return makeDataStoreStatus(deleteResult.error());
    }
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::VerifyBackup(grpc::ServerContext*, const pgbackup::v1::VerifyBackupRequest* request,
                                             pgbackup::v1::BackupVerification* response) {
    if (m_activeManager->get(request->backup_id())) {
        return makeStatus(grpc::StatusCode::FAILED_PRECONDITION, "Cannot verify active backup");
    }

    const auto record = m_dataStore->getBackup(request->backup_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    if (!record->storagePath) {
        return makeStatus(grpc::StatusCode::FAILED_PRECONDITION, "Backup has no stored payload to verify");
    }

    backup::BackupVerificationRecord verification{
        .backupId = request->backup_id(),
        .verifyHash = request->verify_hash(),
        .verifiedAt = std::chrono::system_clock::now(),
        .checksumSha256 = std::nullopt,
    };

    if (request->verify_hash()) {
        const auto backupPath = std::filesystem::path{*record->storagePath};
        if (!std::filesystem::exists(backupPath)) {
            return makeStatus(grpc::StatusCode::NOT_FOUND, "Backup storage path not found");
        }
        verification.checksumSha256 = computeSha256ForDirectory(backupPath);
    }

    const auto saveResult = m_dataStore->saveVerification(verification);
    if (!saveResult) {
        return makeDataStoreStatus(saveResult.error());
    }

    *response = toProto(verification);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::CreateSchedule(grpc::ServerContext*, const pgbackup::v1::CreateScheduleRequest* request,
                                               pgbackup::v1::Schedule* response) {
    const auto scheduleId = m_scheduleManager->create(toRecord(*request));
    if (!scheduleId) {
        return makeDataStoreStatus(scheduleId.error());
    }

    const auto record = m_scheduleManager->get(*scheduleId);
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::UpdateSchedule(grpc::ServerContext*, const pgbackup::v1::UpdateScheduleRequest* request,
                                               pgbackup::v1::Schedule* response) {
    const auto updateResult = m_scheduleManager->update(toUpdate(*request));
    if (!updateResult) {
        return makeDataStoreStatus(updateResult.error());
    }

    const auto record = m_scheduleManager->get(request->schedule_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::ListSchedules(grpc::ServerContext*, const pgbackup::v1::ListSchedulesRequest* request,
                                              pgbackup::v1::ListSchedulesResponse* response) {
    const auto records = m_scheduleManager->list(request->database_name());
    if (!records) {
        return makeDataStoreStatus(records.error());
    }

    for (const auto& record : *records) {
        *response->add_schedules() = toProto(record);
    }
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::GetSchedule(grpc::ServerContext*, const pgbackup::v1::GetScheduleRequest* request,
                                            pgbackup::v1::Schedule* response) {
    const auto record = m_scheduleManager->get(request->schedule_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }

    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::DeleteSchedule(grpc::ServerContext*, const pgbackup::v1::DeleteScheduleRequest* request,
                                               google::protobuf::Empty*) {
    const auto result = m_scheduleManager->remove(request->schedule_id());
    if (!result) {
        return makeDataStoreStatus(result.error());
    }
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::PauseSchedule(grpc::ServerContext*, const pgbackup::v1::PauseScheduleRequest* request,
                                              pgbackup::v1::Schedule* response) {
    const auto record = m_scheduleManager->pause(request->schedule_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }
    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::ResumeSchedule(grpc::ServerContext*, const pgbackup::v1::ResumeScheduleRequest* request,
                                               pgbackup::v1::Schedule* response) {
    const auto record = m_scheduleManager->resume(request->schedule_id());
    if (!record) {
        return makeDataStoreStatus(record.error());
    }
    *response = toProto(*record);
    return grpc::Status::OK;
}

grpc::Status BackupGrpcService::makeStatus(grpc::StatusCode code, std::string message) const {
    return grpc::Status{code, std::move(message)};
}

grpc::Status BackupGrpcService::makeDataStoreStatus(std::string message) const {
    if (message.find("not found") != std::string::npos) {
        return makeStatus(grpc::StatusCode::NOT_FOUND, std::move(message));
    }
    return makeStatus(grpc::StatusCode::INTERNAL, std::move(message));
}

pgbackup::v1::BackupTemplate BackupGrpcService::toProto(const backup::BackupTemplateRecord& record) const {
    pgbackup::v1::BackupTemplate response;
    response.set_template_id(record.templateId);
    response.set_name(record.name);
    response.set_description(record.description);
    response.set_type(::toProto(record.type));
    response.set_include_wal(record.includeWal);
    response.set_checkpoint_timeout(record.checkpointTimeout);
    *response.mutable_created_at() = toTimestamp(record.createdAt);
    *response.mutable_updated_at() = toTimestamp(record.updatedAt);
    return response;
}

pgbackup::v1::Backup BackupGrpcService::toProto(const backup::BackupRecord& record) const {
    pgbackup::v1::Backup response;
    response.set_backup_id(record.backupId);
    response.set_database_name(record.databaseName);
    response.set_status(::toProto(record.status));
    populateTemplate(record.templateId, &response);
    *response.mutable_started_at() = toTimestamp(record.startedAt);
    if (record.finishedAt) {
        *response.mutable_finished_at() = toTimestamp(*record.finishedAt);
        *response.mutable_duration() = toDuration(record.startedAt, *record.finishedAt);
    }
    response.set_pg_version_num(record.pgVersionNum);
    if (record.parentBackupId) {
        response.set_parent_backup_id(*record.parentBackupId);
    }

    if (record.storagePath) {
        auto* storeInfo = response.mutable_info()->mutable_store_info();
        storeInfo->set_size_bytes(record.sizeBytes);
        storeInfo->set_original_size_bytes(record.originalSizeBytes);
        storeInfo->set_storage_path(*record.storagePath);

        const auto verification = m_dataStore->getVerification(record.backupId);
        if (verification && verification->has_value()) {
            *storeInfo->mutable_verification() = toProto(**verification);
        }
    } else if (record.status == backup::BackupStatus::Failed || record.status == backup::BackupStatus::Cancelled) {
        auto* errorInfo = response.mutable_info()->mutable_error_info();
        if (record.errorMessage) {
            errorInfo->set_error_message(*record.errorMessage);
        }
    }
    return response;
}

pgbackup::v1::BackupVerification BackupGrpcService::toProto(const backup::BackupVerificationRecord& record) const {
    pgbackup::v1::BackupVerification response;
    response.set_backup_id(record.backupId);
    response.set_verify_hash(record.verifyHash);
    if (record.verifiedAt) {
        *response.mutable_verified_at() = toTimestamp(*record.verifiedAt);
    }
    if (record.checksumSha256) {
        response.set_checksum_sha256(*record.checksumSha256);
    }
    return response;
}

pgbackup::v1::Backup BackupGrpcService::toProto(const backup::ActiveBackupSnapshotData& snapshot) const {
    pgbackup::v1::Backup response;
    response.set_backup_id(snapshot.backupId);
    response.set_database_name(snapshot.databaseName);
    response.set_status(::toProto(snapshot.status));
    populateTemplate(snapshot.templateId, &response);
    if (snapshot.startedAt) {
        *response.mutable_started_at() = toTimestamp(*snapshot.startedAt);
        *response.mutable_duration() = toDuration(*snapshot.startedAt, std::chrono::system_clock::now());
    }
    auto* activeInfo = response.mutable_info()->mutable_active_info();
    activeInfo->set_bytes_processed(snapshot.progress.bytesProcessed);
    activeInfo->set_bytes_total_estimate(snapshot.progress.bytesTotalEstimate);
    activeInfo->set_files_processed(snapshot.progress.filesProcessed);
    activeInfo->set_files_total_estimate(snapshot.progress.filesTotalEstimate);
    return response;
}

pgbackup::v1::Schedule BackupGrpcService::toProto(const backup::ScheduleRecord& record) const {
    pgbackup::v1::Schedule response;
    response.set_schedule_id(record.scheduleId);
    response.set_database_name(record.databaseName);
    response.set_display_name(record.displayName);
    response.set_cron_expression(record.cronExpression);
    response.set_timezone(record.timezone);
    response.set_state(::toProto(record.state));
    response.set_template_id(record.templateId);
    *response.mutable_created_at() = toTimestamp(record.createdAt);
    *response.mutable_updated_at() = toTimestamp(record.updatedAt);
    if (record.nextRunAt) {
        *response.mutable_next_run_at() = toTimestamp(*record.nextRunAt);
    }
    if (record.lastRunAt) {
        *response.mutable_last_run_at() = toTimestamp(*record.lastRunAt);
    }
    response.set_last_backup_id(record.lastBackupId.value_or(0));
    if (record.lastRunStatus) {
        response.set_last_run_status(::toProto(*record.lastRunStatus));
    }
    return response;
}

backup::BackupTemplateRecord BackupGrpcService::toRecord(
    const pgbackup::v1::CreateBackupTemplateRequest& request) const {
    return backup::BackupTemplateRecord{
        .name = request.name(),
        .description = request.description(),
        .type = ::toRecord(request.type()),
        .includeWal = request.include_wal(),
        .checkpointTimeout = request.checkpoint_timeout(),
    };
}

backup::BackupTemplateUpdate BackupGrpcService::toUpdate(
    const pgbackup::v1::UpdateBackupTemplateRequest& request) const {
    return backup::BackupTemplateUpdate{
        .templateId = request.template_id(),
        .name = request.name(),
        .description = request.description(),
        .type = ::toRecord(request.type()),
        .includeWal = request.include_wal(),
        .checkpointTimeout = request.checkpoint_timeout(),
    };
}

backup::ListBackupsFilter BackupGrpcService::toFilter(const pgbackup::v1::ListBackupsRequest& request) const {
    backup::ListBackupsFilter filter;
    if (request.has_database_name()) {
        filter.databaseName = request.database_name();
    }
    for (const auto type : request.type()) {
        filter.types.push_back(::toRecord(static_cast<pgbackup::v1::BackupType>(type)));
    }
    for (const auto status : request.status()) {
        filter.statuses.push_back(::toRecord(static_cast<pgbackup::v1::BackupStatus>(status)));
    }
    if (request.has_only_after()) {
        filter.onlyAfter = backup::TimePoint{std::chrono::seconds{request.only_after().seconds()} +
                                             std::chrono::nanoseconds{request.only_after().nanos()}};
    }
    return filter;
}

backup::ScheduleRecord BackupGrpcService::toRecord(const pgbackup::v1::CreateScheduleRequest& request) const {
    return backup::ScheduleRecord{
        .databaseName = request.database_name(),
        .displayName = request.display_name(),
        .cronExpression = request.cron_expression(),
        .timezone = request.timezone().empty() ? "UTC" : request.timezone(),
        .state = backup::ScheduleState::Active,
        .templateId = request.template_id(),
    };
}

void BackupGrpcService::populateTemplate(const std::optional<int64_t>& templateId,
                                         pgbackup::v1::Backup* response) const {
    if (!templateId) {
        return;
    }

    const auto record = m_dataStore->getTemplate(*templateId);
    if (!record) {
        return;
    }

    *response->mutable_backup_template() = toProto(*record);
}

backup::ScheduleUpdate BackupGrpcService::toUpdate(const pgbackup::v1::UpdateScheduleRequest& request) const {
    const auto current = m_scheduleManager->get(request.schedule_id());
    if (!current) {
        return backup::ScheduleUpdate{
            .scheduleId = request.schedule_id(),
            .displayName = request.display_name(),
            .cronExpression = request.cron_expression(),
            .timezone = request.timezone().empty() ? "UTC" : request.timezone(),
            .state = backup::ScheduleState::Active,
            .templateId = request.template_id(),
        };
    }

    return backup::ScheduleUpdate{
        .scheduleId = request.schedule_id(),
        .displayName = request.display_name(),
        .cronExpression = request.cron_expression(),
        .timezone = request.timezone().empty() ? "UTC" : request.timezone(),
        .state = current->state,
        .templateId = request.template_id(),
        .nextRunAt = current->nextRunAt,
        .lastRunAt = current->lastRunAt,
        .lastBackupId = current->lastBackupId,
        .lastRunStatus = current->lastRunStatus,
    };
}
