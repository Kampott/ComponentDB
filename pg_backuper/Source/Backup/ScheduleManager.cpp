#include "ScheduleManager.h"

#include <chrono>
#include <iostream>
#include <ranges>
#include <sstream>
#include <string_view>

namespace backup {

namespace {

using namespace std::chrono_literals;

struct CronFieldPart {
    int start{0};
    int end{0};
    int step{1};
};

struct CronField {
    int minValue{0};
    int maxValue{0};
    bool any{false};
    std::vector<CronFieldPart> parts;

    bool matches(int value) const {
        if (value < minValue || value > maxValue) {
            return false;
        }
        if (any) {
            return true;
        }

        for (const auto& part : parts) {
            if (value < part.start || value > part.end) {
                continue;
            }
            if (((value - part.start) % part.step) == 0) {
                return true;
            }
        }
        return false;
    }
};

std::vector<std::string> split(std::string_view value, char delimiter) {
    std::vector<std::string> result;
    size_t start = 0;
    while (start <= value.size()) {
        const auto end = value.find(delimiter, start);
        result.emplace_back(value.substr(start, end == std::string_view::npos ? value.size() - start : end - start));
        if (end == std::string_view::npos) {
            break;
        }
        start = end + 1;
    }
    return result;
}

std::expected<int, std::string> parseNumber(std::string_view value) {
    try {
        const auto parsed = std::stoi(std::string{value});
        return parsed;
    } catch (const std::exception&) {
        return std::unexpected("Invalid cron number");
    }
}

std::expected<CronField, std::string> parseField(std::string_view expression, int minValue, int maxValue,
                                                 bool normalizeSunday = false) {
    CronField field{
        .minValue = minValue,
        .maxValue = maxValue,
        .any = expression == "*",
    };
    if (field.any) {
        return field;
    }

    for (const auto& token : split(expression, ',')) {
        auto base = std::string_view{token};
        int step = 1;

        if (const auto slash = base.find('/'); slash != std::string_view::npos) {
            const auto stepResult = parseNumber(base.substr(slash + 1));
            if (!stepResult || *stepResult <= 0) {
                return std::unexpected("Invalid cron step");
            }
            step = *stepResult;
            base = base.substr(0, slash);
        }

        int partStart = minValue;
        int partEnd = maxValue;
        if (base != "*") {
            if (const auto dash = base.find('-'); dash != std::string_view::npos) {
                const auto startResult = parseNumber(base.substr(0, dash));
                const auto endResult = parseNumber(base.substr(dash + 1));
                if (!startResult || !endResult) {
                    return std::unexpected("Invalid cron range");
                }
                partStart = *startResult;
                partEnd = *endResult;
            } else {
                const auto numberResult = parseNumber(base);
                if (!numberResult) {
                    return std::unexpected("Invalid cron value");
                }
                partStart = *numberResult;
                partEnd = *numberResult;
            }
        }

        if (normalizeSunday) {
            if (partStart == 7) {
                partStart = 0;
            }
            if (partEnd == 7) {
                partEnd = 0;
            }
        }

        if (partStart < minValue || partStart > maxValue || partEnd < minValue || partEnd > maxValue) {
            return std::unexpected("Cron value out of range");
        }
        if (partStart > partEnd && !(normalizeSunday && partStart == 0 && partEnd == 0)) {
            return std::unexpected("Invalid cron range order");
        }

        field.parts.push_back(CronFieldPart{
            .start = partStart,
            .end = partEnd,
            .step = step,
        });
    }

    return field;
}

struct ParsedCron {
    CronField minute;
    CronField hour;
    CronField dayOfMonth;
    CronField month;
    CronField dayOfWeek;
};

std::expected<ParsedCron, std::string> parseCron(std::string_view expression) {
    std::istringstream stream{std::string{expression}};
    std::array<std::string, 5> fields;
    for (auto& field : fields) {
        if (!(stream >> field)) {
            return std::unexpected("Cron expression must contain 5 fields");
        }
    }

    std::string tail;
    if (stream >> tail) {
        return std::unexpected("Cron expression must contain 5 fields");
    }

    auto minute = parseField(fields[0], 0, 59);
    auto hour = parseField(fields[1], 0, 23);
    auto dayOfMonth = parseField(fields[2], 1, 31);
    auto month = parseField(fields[3], 1, 12);
    auto dayOfWeek = parseField(fields[4], 0, 6, true);
    if (!minute) {
        return std::unexpected(minute.error());
    }
    if (!hour) {
        return std::unexpected(hour.error());
    }
    if (!dayOfMonth) {
        return std::unexpected(dayOfMonth.error());
    }
    if (!month) {
        return std::unexpected(month.error());
    }
    if (!dayOfWeek) {
        return std::unexpected(dayOfWeek.error());
    }

    return ParsedCron{
        .minute = std::move(*minute),
        .hour = std::move(*hour),
        .dayOfMonth = std::move(*dayOfMonth),
        .month = std::move(*month),
        .dayOfWeek = std::move(*dayOfWeek),
    };
}

bool matchesDay(const ParsedCron& cron, const std::chrono::year_month_day& yearMonthDay,
                const std::chrono::weekday& weekday) {
    const auto dayOfMonth = cron.dayOfMonth.matches(static_cast<int>(unsigned(yearMonthDay.day())));
    const auto dayOfWeek = cron.dayOfWeek.matches(static_cast<int>(weekday.c_encoding()));
    if (cron.dayOfMonth.any && cron.dayOfWeek.any) {
        return true;
    }
    if (cron.dayOfMonth.any) {
        return dayOfWeek;
    }
    if (cron.dayOfWeek.any) {
        return dayOfMonth;
    }
    return dayOfMonth || dayOfWeek;
}

}  // namespace

ScheduleManager::ScheduleManager(std::shared_ptr<BackupDataStore> dataStore, StartBackupFn startBackup)
    : m_dataStore{std::move(dataStore)}
    , m_startBackup{std::move(startBackup)} {}

void ScheduleManager::start() {
    std::lock_guard lock{m_lifecycleMutex};
    if (m_worker.joinable()) {
        return;
    }

    m_worker = std::jthread([this](std::stop_token stopToken) { run(stopToken); });
}

void ScheduleManager::stop() {
    std::lock_guard lock{m_lifecycleMutex};
    if (!m_worker.joinable()) {
        return;
    }

    m_worker.request_stop();
    m_worker.join();
}

std::expected<int64_t, std::string> ScheduleManager::create(const ScheduleRecord& schedule) {
    auto nextSchedule = schedule;
    nextSchedule.state = ScheduleState::Active;
    nextSchedule.nextRunAt = nextRunAt(nextSchedule, std::chrono::system_clock::now());
    return m_dataStore->createSchedule(nextSchedule);
}

std::expected<void, std::string> ScheduleManager::update(const ScheduleUpdate& schedule) {
    auto nextSchedule = schedule;
    if (nextSchedule.state == ScheduleState::Active) {
        ScheduleRecord record{
            .scheduleId = nextSchedule.scheduleId,
            .displayName = nextSchedule.displayName,
            .cronExpression = nextSchedule.cronExpression,
            .timezone = nextSchedule.timezone,
            .state = nextSchedule.state,
            .templateId = nextSchedule.templateId,
        };
        nextSchedule.nextRunAt = nextRunAt(record, std::chrono::system_clock::now());
    } else {
        nextSchedule.nextRunAt = std::nullopt;
    }

    return m_dataStore->updateSchedule(nextSchedule);
}

std::expected<ScheduleRecord, std::string> ScheduleManager::get(int64_t scheduleId) {
    return m_dataStore->getSchedule(scheduleId);
}

std::expected<std::vector<ScheduleRecord>, std::string> ScheduleManager::list(std::string_view databaseName) {
    return m_dataStore->listSchedules(databaseName);
}

std::expected<void, std::string> ScheduleManager::remove(int64_t scheduleId) {
    return m_dataStore->deleteSchedule(scheduleId);
}

std::expected<ScheduleRecord, std::string> ScheduleManager::pause(int64_t scheduleId) {
    const auto schedule = m_dataStore->getSchedule(scheduleId);
    if (!schedule) {
        return std::unexpected(schedule.error());
    }

    const auto now = std::chrono::system_clock::now();
    const ScheduleUpdate update{
        .scheduleId = schedule->scheduleId,
        .displayName = schedule->displayName,
        .cronExpression = schedule->cronExpression,
        .timezone = schedule->timezone,
        .state = ScheduleState::Paused,
        .templateId = schedule->templateId,
        .nextRunAt = std::nullopt,
        .lastRunAt = schedule->lastRunAt,
        .lastBackupId = schedule->lastBackupId,
        .lastRunStatus = schedule->lastRunStatus,
    };

    const auto updateResult = m_dataStore->updateSchedule(update);
    if (!updateResult) {
        return std::unexpected(updateResult.error());
    }

    auto updatedSchedule = m_dataStore->getSchedule(scheduleId);
    if (!updatedSchedule) {
        return std::unexpected(updatedSchedule.error());
    }
    updatedSchedule->updatedAt = now;
    return updatedSchedule;
}

std::expected<ScheduleRecord, std::string> ScheduleManager::resume(int64_t scheduleId) {
    const auto schedule = m_dataStore->getSchedule(scheduleId);
    if (!schedule) {
        return std::unexpected(schedule.error());
    }

    const auto now = std::chrono::system_clock::now();
    const ScheduleUpdate update{
        .scheduleId = schedule->scheduleId,
        .displayName = schedule->displayName,
        .cronExpression = schedule->cronExpression,
        .timezone = schedule->timezone,
        .state = ScheduleState::Active,
        .templateId = schedule->templateId,
        .nextRunAt = nextRunAt(*schedule, now),
        .lastRunAt = schedule->lastRunAt,
        .lastBackupId = schedule->lastBackupId,
        .lastRunStatus = schedule->lastRunStatus,
    };

    const auto updateResult = m_dataStore->updateSchedule(update);
    if (!updateResult) {
        return std::unexpected(updateResult.error());
    }

    auto updatedSchedule = m_dataStore->getSchedule(scheduleId);
    if (!updatedSchedule) {
        return std::unexpected(updatedSchedule.error());
    }
    updatedSchedule->updatedAt = now;
    return updatedSchedule;
}

void ScheduleManager::run(std::stop_token stopToken) {
    while (!stopToken.stop_requested()) {
        tick();

        for (int attempt = 0; attempt < 10 && !stopToken.stop_requested(); ++attempt) {
            std::this_thread::sleep_for(100ms);
        }
    }
}

void ScheduleManager::tick() {
    const auto schedules = m_dataStore->listSchedules("");
    if (!schedules) {
        logBackgroundError("listSchedules", schedules.error());
        return;
    }

    const auto now = std::chrono::system_clock::now();
    for (const auto& schedule : *schedules) {
        if (schedule.state != ScheduleState::Active || !schedule.nextRunAt || *schedule.nextRunAt > now) {
            continue;
        }

        const auto nextScheduleRun = nextRunAt(schedule, now);
        const auto runningState =
            saveRuntimeState(schedule.scheduleId, std::nullopt, BackupStatus::Running, nextScheduleRun, now);
        if (!runningState) {
            logBackgroundError("updateSchedule", runningState.error());
            continue;
        }

        if (!m_startBackup) {
            const auto failureState =
                saveRuntimeState(schedule.scheduleId, std::nullopt, BackupStatus::Failed, nextScheduleRun, now);
            if (!failureState) {
                logBackgroundError("updateSchedule", failureState.error());
            }
            continue;
        }

        const auto startResult = m_startBackup(schedule);
        if (!startResult) {
            const auto failureState =
                saveRuntimeState(schedule.scheduleId, std::nullopt, BackupStatus::Failed, nextScheduleRun, now);
            if (!failureState) {
                logBackgroundError("updateSchedule", failureState.error());
            }
            continue;
        }
    }
}

std::optional<TimePoint> ScheduleManager::nextRunAt(const ScheduleRecord& schedule, TimePoint from) const {
    const auto cron = parseCron(schedule.cronExpression);
    if (!cron) {
        logBackgroundError("parseCron", cron.error());
        return std::nullopt;
    }

    const std::chrono::time_zone* zone = nullptr;
    try {
        zone = std::chrono::locate_zone(schedule.timezone.empty() ? "UTC" : schedule.timezone);
    } catch (const std::exception&) {
        zone = std::chrono::locate_zone("UTC");
    }

    auto candidate = std::chrono::floor<std::chrono::minutes>(from) + 1min;
    constexpr auto kLookahead = std::chrono::hours{24 * 366 * 2};
    const auto deadline = candidate + std::chrono::duration_cast<std::chrono::minutes>(kLookahead);

    while (candidate <= deadline) {
        const auto local = std::chrono::zoned_time{zone, candidate}.get_local_time();
        const auto day = std::chrono::floor<std::chrono::days>(local);
        const std::chrono::year_month_day yearMonthDay{day};
        const std::chrono::hh_mm_ss timeOfDay{local - day};
        const auto minute = static_cast<int>(timeOfDay.minutes().count());
        const auto hour = static_cast<int>(timeOfDay.hours().count());
        const auto month = static_cast<int>(unsigned(yearMonthDay.month()));
        const auto weekday = std::chrono::weekday{day};

        if (cron->minute.matches(minute) && cron->hour.matches(hour) && cron->month.matches(month) &&
            matchesDay(*cron, yearMonthDay, weekday)) {
            return candidate;
        }

        candidate += 1min;
    }

    return std::nullopt;
}

std::expected<void, std::string> ScheduleManager::saveRuntimeState(int64_t scheduleId,
                                                                   std::optional<int64_t> lastBackupId,
                                                                   BackupStatus lastRunStatus,
                                                                   std::optional<TimePoint> nextRunAtValue,
                                                                   std::optional<TimePoint> lastRunAt) {
    const auto schedule = m_dataStore->getSchedule(scheduleId);
    if (!schedule) {
        return std::unexpected(schedule.error());
    }

    ScheduleUpdate update{
        .scheduleId = schedule->scheduleId,
        .displayName = schedule->displayName,
        .cronExpression = schedule->cronExpression,
        .timezone = schedule->timezone,
        .state = schedule->state,
        .templateId = schedule->templateId,
        .nextRunAt = nextRunAtValue,
        .lastRunAt = lastRunAt,
        .lastBackupId = lastBackupId,
        .lastRunStatus = lastRunStatus,
    };

    return m_dataStore->updateSchedule(update);
}

void ScheduleManager::logBackgroundError(std::string_view scope, std::string_view message) const {
    std::cerr << "ScheduleManager " << scope << " failed: " << message << std::endl;
}

}  // namespace backup
