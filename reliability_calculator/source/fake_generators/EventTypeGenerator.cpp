#include "EventTypeGenerator.hpp"

#include <algorithm>

namespace reliability_calculator::fake_generators {
EventTypeGenerator::EventTypeGenerator(IdAllocator& idAllocator) : m_idAllocator(idAllocator) {}

const std::vector<MandatoryEventTypeSpec>& EventTypeGenerator::mandatoryEventTypes() {
    static const std::vector<MandatoryEventTypeSpec> specs = {
        {"failure_replacement", true, true},
        {"preventive_replacement", true, false},
        {"inspection", false, false},
        {"maintenance", false, false},
    };
    return specs;
}

void EventTypeGenerator::ensureMandatoryEventTypes(GeneratedData& data) {
    if (data.eventTypes.empty()) {
        for (const auto& spec : mandatoryEventTypes()) {
            const int eventTypeId = m_idAllocator.nextEventTypeId();
            data.eventTypes.push_back({eventTypeId, spec.name});
            data.eventTypeMeta.push_back({eventTypeId, spec.isReplacement, spec.countsAsFailure});
        }
    }

    bindMandatoryEventTypesToAllTypes(data);
}

void EventTypeGenerator::bindMandatoryEventTypesToAllTypes(GeneratedData& data) {
    for (const auto& objectType : data.objectTypes) {
        bindMandatoryEventTypesToType(data, objectType.id);
    }
}

void EventTypeGenerator::bindMandatoryEventTypesToType(GeneratedData& data, int objectTypeId) {
    for (const auto& eventType : data.eventTypes) {
        const bool exists =
            std::any_of(data.eventTypeObjectTypes.begin(), data.eventTypeObjectTypes.end(),
                        [&eventType, objectTypeId](const schemas::EventTypeObjectType& relation) {
                            return relation.eventTypeId == eventType.id && relation.objectTypeId == objectTypeId;
                        });
        if (!exists) {
            data.eventTypeObjectTypes.push_back({eventType.id, objectTypeId});
        }
    }
}
}  // namespace reliability_calculator::fake_generators
