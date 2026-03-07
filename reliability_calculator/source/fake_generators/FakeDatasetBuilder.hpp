#pragma once

#include <cstdint>
#include <random>
#include <vector>

#include "EventGenerator.hpp"
#include "EventTypeGenerator.hpp"
#include "FakeDataTypes.hpp"
#include "IdAllocator.hpp"
#include "InstanceGenerator.hpp"
#include "ObjectGenerator.hpp"
#include "ObjectTypeGenerator.hpp"

namespace reliability_calculator::fake_generators {
class FakeDatasetBuilder {
public:
    explicit FakeDatasetBuilder(std::uint32_t seed);

    void clear();

    const GeneratedData& data() const;

    int createTypeTree(const TypeTreeHyperParams& params);

    int createObjectTreeFromTypeRoot(int rootTypeId, const ObjectTreeHyperParams& params);

    std::vector<int> createInstanceTreesFromObjectRoot(int rootObjectId, const InstanceTreeHyperParams& params);

    void createEventsForAllInstances(const EventGenerationHyperParams& params);

    const GeneratedData& buildDataset(const FakeDataHyperParams& params);

    static const std::vector<MandatoryEventTypeSpec>& mandatoryEventTypes();

private:
    std::uint32_t m_seed;
    GeneratedData m_data;
    std::mt19937 m_rng;
    IdAllocator m_idAllocator;
    EventTypeGenerator m_eventTypeGenerator;
    ObjectTypeGenerator m_objectTypeGenerator;
    ObjectGenerator m_objectGenerator;
    InstanceGenerator m_instanceGenerator;
    EventGenerator m_eventGenerator;
};
}  // namespace reliability_calculator::fake_generators
