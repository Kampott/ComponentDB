#pragma once

#include <vector>

#include "FakeDataTypes.hpp"
#include "IdAllocator.hpp"

namespace reliability_calculator::fake_generators {
class EventTypeGenerator {
public:
    explicit EventTypeGenerator(IdAllocator& idAllocator);

    void ensureMandatoryEventTypes(GeneratedData& data);

    void bindMandatoryEventTypesToType(GeneratedData& data, int objectTypeId);

    void bindMandatoryEventTypesToAllTypes(GeneratedData& data);

    static const std::vector<MandatoryEventTypeSpec>& mandatoryEventTypes();

private:
    IdAllocator& m_idAllocator;
};
}  // namespace reliability_calculator::fake_generators
