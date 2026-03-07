#include "EventGenerator.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <unordered_map>
#include <vector>

namespace reliability_calculator::fake_generators {
EventGenerator::EventGenerator(std::mt19937& rng, IdAllocator& idAllocator) : m_rng(rng), m_idAllocator(idAllocator) {}

void EventGenerator::createEventsForAllInstances(GeneratedData& data, const EventGenerationHyperParams& params) {
    if (params.window <= std::chrono::hours::zero()) {
        throw std::invalid_argument("EventGenerationHyperParams.window must be positive");
    }

    const int failureReplacementTypeId = eventTypeIdByName(data, "failure_replacement");
    const int preventiveReplacementTypeId = eventTypeIdByName(data, "preventive_replacement");
    const int inspectionTypeId = eventTypeIdByName(data, "inspection");
    const int maintenanceTypeId = eventTypeIdByName(data, "maintenance");

    if (failureReplacementTypeId < 0 || preventiveReplacementTypeId < 0 || inspectionTypeId < 0 ||
        maintenanceTypeId < 0) {
        throw std::runtime_error("Mandatory event types are not initialized");
    }

    const double days = windowDays(params);
    const auto totalSeconds = std::chrono::duration_cast<std::chrono::seconds>(params.window).count();
    if (totalSeconds <= 0) {
        throw std::invalid_argument("Event generation window is too small");
    }
    std::uniform_int_distribution<long long> secondsOffsetDistribution(0, totalSeconds - 1);

    std::unordered_map<int, int> objectDepthById;
    objectDepthById.reserve(data.objects.size());
    for (const auto& object : data.objects) {
        int depth = 0;
        auto parentId = object.parentId;
        while (parentId.has_value()) {
            ++depth;
            auto parentIt =
                std::find_if(data.objects.begin(), data.objects.end(),
                             [parentId](const schemas::Object& candidate) { return candidate.id == *parentId; });
            if (parentIt == data.objects.end()) {
                break;
            }
            parentId = parentIt->parentId;
        }
        objectDepthById[object.id] = depth;
    }

    std::unordered_map<int, std::size_t> instanceIndexById;
    instanceIndexById.reserve(data.instances.size() * 2U);
    for (std::size_t index = 0; index < data.instances.size(); ++index) {
        instanceIndexById[data.instances[index].id] = index;
    }

    std::vector<int> initialInstanceIds;
    initialInstanceIds.reserve(data.instances.size());
    for (const auto& instance : data.instances) {
        initialInstanceIds.push_back(instance.id);
    }

    std::unordered_map<int, std::vector<int>> activeChildrenByParent;
    activeChildrenByParent.reserve(data.instances.size() * 2U);
    for (const auto& instance : data.instances) {
        if (instance.parentId.has_value()) {
            activeChildrenByParent[*instance.parentId].push_back(instance.id);
        }
    }

    struct PlannedEvent {
        long long secondsOffset;
        int eventTypeId;
        bool isReplacement;
    };

    for (int initialInstanceId : initialInstanceIds) {
        auto initialIndexIt = instanceIndexById.find(initialInstanceId);
        if (initialIndexIt == instanceIndexById.end()) {
            continue;
        }
        const auto& initialInstance = data.instances[initialIndexIt->second];
        const int depth = objectDepthById[initialInstance.objectId];
        const double depthFactor = std::pow(params.depthFailureRateFactor, static_cast<double>(depth));
        const double failureMean = params.baseFailureRatePerDay * depthFactor * days;
        const double preventiveMean = failureMean * params.preventiveRateFactor;
        const double inspectionMean = params.inspectionRatePerDay * days;
        const double maintenanceMean = params.maintenanceRatePerDay * days;

        const int failureEvents = failureMean > 0.0 ? std::poisson_distribution<int>(failureMean)(m_rng) : 0;
        const int preventiveEvents = preventiveMean > 0.0 ? std::poisson_distribution<int>(preventiveMean)(m_rng) : 0;
        const int inspectionEvents = inspectionMean > 0.0 ? std::poisson_distribution<int>(inspectionMean)(m_rng) : 0;
        const int maintenanceEvents = maintenanceMean > 0.0 ? std::poisson_distribution<int>(maintenanceMean)(m_rng)
                                                            : 0;

        std::vector<PlannedEvent> plannedEvents;
        plannedEvents.reserve(
            static_cast<std::size_t>(failureEvents + preventiveEvents + inspectionEvents + maintenanceEvents));

        for (int eventIndex = 0; eventIndex < failureEvents; ++eventIndex) {
            plannedEvents.push_back({secondsOffsetDistribution(m_rng), failureReplacementTypeId, true});
        }
        for (int eventIndex = 0; eventIndex < preventiveEvents; ++eventIndex) {
            plannedEvents.push_back({secondsOffsetDistribution(m_rng), preventiveReplacementTypeId, true});
        }

        for (int eventIndex = 0; eventIndex < inspectionEvents; ++eventIndex) {
            plannedEvents.push_back({secondsOffsetDistribution(m_rng), inspectionTypeId, false});
        }
        for (int eventIndex = 0; eventIndex < maintenanceEvents; ++eventIndex) {
            plannedEvents.push_back({secondsOffsetDistribution(m_rng), maintenanceTypeId, false});
        }

        std::sort(plannedEvents.begin(), plannedEvents.end(), [](const PlannedEvent& left, const PlannedEvent& right) {
            if (left.secondsOffset == right.secondsOffset) {
                return left.eventTypeId < right.eventTypeId;
            }
            return left.secondsOffset < right.secondsOffset;
        });

        int currentInstanceId = initialInstanceId;
        for (const auto& plannedEvent : plannedEvents) {
            const auto eventTime = params.startTime + std::chrono::seconds(plannedEvent.secondsOffset);
            const int eventId = m_idAllocator.nextEventId();
            data.events.push_back(
                {eventId, plannedEvent.eventTypeId, eventTime, "fake_data_generated", currentInstanceId});

            if (!plannedEvent.isReplacement) {
                continue;
            }

            auto currentIndexIt = instanceIndexById.find(currentInstanceId);
            if (currentIndexIt == instanceIndexById.end()) {
                throw std::runtime_error("Active instance id not found during replacement");
            }

            auto& oldInstance = data.instances[currentIndexIt->second];
            oldInstance.isActive = false;

            const int newInstanceId = m_idAllocator.nextInstanceId();
            const auto oldParentId = oldInstance.parentId;
            data.instances.push_back({newInstanceId, "Instance_" + std::to_string(newInstanceId), oldInstance.objectId,
                                      oldInstance.parentId, true, oldInstance.rootId});
            instanceIndexById[newInstanceId] = data.instances.size() - 1U;

            if (oldParentId.has_value()) {
                auto& siblings = activeChildrenByParent[*oldParentId];
                auto siblingIt = std::find(siblings.begin(), siblings.end(), currentInstanceId);
                if (siblingIt != siblings.end()) {
                    *siblingIt = newInstanceId;
                } else {
                    siblings.push_back(newInstanceId);
                }
            }

            auto childrenIt = activeChildrenByParent.find(currentInstanceId);
            if (childrenIt != activeChildrenByParent.end()) {
                for (int childInstanceId : childrenIt->second) {
                    auto childIndexIt = instanceIndexById.find(childInstanceId);
                    if (childIndexIt == instanceIndexById.end()) {
                        continue;
                    }
                    auto& childInstance = data.instances[childIndexIt->second];
                    if (childInstance.isActive && childInstance.parentId.has_value() &&
                        *childInstance.parentId == currentInstanceId) {
                        childInstance.parentId = newInstanceId;
                    }
                }
                activeChildrenByParent[newInstanceId] = childrenIt->second;
                activeChildrenByParent.erase(childrenIt);
            }

            data.replacementEvents.push_back({m_idAllocator.nextReplacementEventId(), eventId, newInstanceId});
            currentInstanceId = newInstanceId;
        }
    }

    std::sort(data.events.begin(), data.events.end(), [](const schemas::Event& left, const schemas::Event& right) {
        if (left.time == right.time) {
            return left.id < right.id;
        }
        return left.time < right.time;
    });
}

double EventGenerator::windowDays(const EventGenerationHyperParams& params) {
    using DaysDuration = std::chrono::duration<double, std::ratio<86400>>;
    return std::chrono::duration_cast<DaysDuration>(params.window).count();
}

int EventGenerator::eventTypeIdByName(const GeneratedData& data, const std::string& name) const {
    const auto it = std::find_if(data.eventTypes.begin(), data.eventTypes.end(),
                                 [&name](const schemas::EventType& type) { return type.name == name; });
    if (it == data.eventTypes.end()) {
        return -1;
    }
    return it->id;
}
}  // namespace reliability_calculator::fake_generators
