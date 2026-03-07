#include "ReliabilityCalculator.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <unordered_map>
#include <unordered_set>
#include <utility>

namespace reliability_calculator::reliability {

namespace {

using Clock = std::chrono::system_clock;

double durationDays(Clock::duration duration) {
    using DaysDuration = std::chrono::duration<double, std::ratio<86400>>;
    return std::chrono::duration_cast<DaysDuration>(duration).count();
}

}  // namespace

RootReliabilityResult ReliabilityCalculator::calculateForRootObject(const fake_generators::GeneratedData& data,
                                                                    int rootObjectId, Clock::time_point analysisStart,
                                                                    Clock::time_point analysisEnd) {
    if (analysisEnd <= analysisStart) {
        throw std::invalid_argument("analysisEnd must be greater than analysisStart");
    }

    std::unordered_map<int, const schemas::Object*> objectById;
    objectById.reserve(data.objects.size() * 2U);
    for (const auto& object : data.objects) {
        objectById[object.id] = &object;
    }

    auto rootObjectIt = objectById.find(rootObjectId);
    if (rootObjectIt == objectById.end()) {
        throw std::invalid_argument("Unknown rootObjectId");
    }

    std::unordered_set<int> objectIdsInTree;
    objectIdsInTree.reserve(data.objects.size());
    for (const auto& object : data.objects) {
        if (object.rootId == rootObjectId) {
            objectIdsInTree.insert(object.id);
        }
    }

    if (objectIdsInTree.empty()) {
        throw std::runtime_error("No objects found for provided rootObjectId");
    }

    std::unordered_map<int, const schemas::ObjectInstance*> instanceById;
    instanceById.reserve(data.instances.size() * 2U);
    for (const auto& instance : data.instances) {
        instanceById[instance.id] = &instance;
    }

    std::unordered_map<int, const schemas::Event*> eventById;
    eventById.reserve(data.events.size() * 2U);
    for (const auto& event : data.events) {
        eventById[event.id] = &event;
    }

    std::unordered_set<int> failureEventTypeIds;
    for (const auto& meta : data.eventTypeMeta) {
        if (meta.countsAsFailure) {
            failureEventTypeIds.insert(meta.eventTypeId);
        }
    }

    std::unordered_map<int, Clock::time_point> instanceBirthTime;
    std::unordered_map<int, Clock::time_point> instanceDeathTime;
    instanceBirthTime.reserve(data.instances.size());
    instanceDeathTime.reserve(data.instances.size());

    for (const auto& instance : data.instances) {
        if (objectIdsInTree.contains(instance.objectId)) {
            instanceBirthTime[instance.id] = analysisStart;
        }
    }

    std::unordered_map<int, std::uint64_t> failureCountByObjectId;
    for (const auto& replacement : data.replacementEvents) {
        auto eventIt = eventById.find(replacement.eventId);
        if (eventIt == eventById.end()) {
            continue;
        }
        const auto& event = *eventIt->second;

        auto oldInstanceIt = instanceById.find(event.instanceId);
        if (oldInstanceIt == instanceById.end()) {
            continue;
        }
        const auto& oldInstance = *oldInstanceIt->second;
        if (!objectIdsInTree.contains(oldInstance.objectId)) {
            continue;
        }
        if (event.time < analysisStart || event.time > analysisEnd) {
            continue;
        }

        instanceDeathTime[event.instanceId] = event.time;

        auto newInstanceIt = instanceById.find(replacement.newInstanceId);
        if (newInstanceIt != instanceById.end()) {
            const auto& newInstance = *newInstanceIt->second;
            if (objectIdsInTree.contains(newInstance.objectId)) {
                instanceBirthTime[replacement.newInstanceId] = event.time;
            }
        }

        if (failureEventTypeIds.contains(event.typeId)) {
            ++failureCountByObjectId[oldInstance.objectId];
        }
    }

    std::unordered_map<int, double> operatingDaysByObjectId;
    operatingDaysByObjectId.reserve(objectIdsInTree.size());
    for (const auto& instance : data.instances) {
        if (!objectIdsInTree.contains(instance.objectId)) {
            continue;
        }

        const auto birthIt = instanceBirthTime.find(instance.id);
        if (birthIt == instanceBirthTime.end()) {
            continue;
        }

        Clock::time_point startTime = std::max(birthIt->second, analysisStart);
        Clock::time_point endTime = analysisEnd;
        auto deathIt = instanceDeathTime.find(instance.id);
        if (deathIt != instanceDeathTime.end()) {
            endTime = std::min(deathIt->second, analysisEnd);
        }

        if (endTime <= startTime) {
            continue;
        }

        operatingDaysByObjectId[instance.objectId] += durationDays(endTime - startTime);
    }

    std::vector<ComponentReliability> components;
    components.reserve(objectIdsInTree.size());
    double treeLambdaPerDay = 0.0;

    for (int objectId : objectIdsInTree) {
        const auto* object = objectById.at(objectId);
        const auto failureCountIt = failureCountByObjectId.find(objectId);
        const std::uint64_t failureCount = failureCountIt != failureCountByObjectId.end() ? failureCountIt->second : 0U;

        const auto operatingDaysIt = operatingDaysByObjectId.find(objectId);
        const double operatingDays = operatingDaysIt != operatingDaysByObjectId.end() ? operatingDaysIt->second : 0.0;

        double lambdaPerDay = 0.0;
        double mttfDays = std::numeric_limits<double>::infinity();
        if (operatingDays > 0.0 && failureCount > 0U) {
            lambdaPerDay = static_cast<double>(failureCount) / operatingDays;
            mttfDays = 1.0 / lambdaPerDay;
        }

        treeLambdaPerDay += lambdaPerDay;
        components.push_back({
            .objectId = objectId,
            .typeId = object->typeId,
            .objectName = object->name,
            .failureCount = failureCount,
            .operatingDays = operatingDays,
            .lambdaPerDay = lambdaPerDay,
            .mttfDays = mttfDays,
        });
    }

    std::sort(components.begin(), components.end(),
              [](const ComponentReliability& left, const ComponentReliability& right) {
                  return left.objectId < right.objectId;
              });

    const double treeMttfDays = treeLambdaPerDay > 0.0 ? 1.0 / treeLambdaPerDay
                                                       : std::numeric_limits<double>::infinity();

    return {
        .rootObjectId = rootObjectId,
        .analysisStart = analysisStart,
        .analysisEnd = analysisEnd,
        .components = std::move(components),
        .treeLambdaPerDay = treeLambdaPerDay,
        .treeMttfDays = treeMttfDays,
    };
}

}  // namespace reliability_calculator::reliability
