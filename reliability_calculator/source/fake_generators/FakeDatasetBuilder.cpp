#include "FakeDatasetBuilder.hpp"

#include <stdexcept>

namespace reliability_calculator::fake_generators {
FakeDatasetBuilder::FakeDatasetBuilder(std::uint32_t seed)
    : m_seed(seed)
    , m_rng(seed)
    , m_eventTypeGenerator(m_idAllocator)
    , m_objectTypeGenerator(m_rng, m_idAllocator)
    , m_objectGenerator(m_rng, m_idAllocator)
    , m_instanceGenerator(m_idAllocator)
    , m_eventGenerator(m_rng, m_idAllocator) {}

void FakeDatasetBuilder::clear() {
    m_data = GeneratedData{};
    m_idAllocator.reset();
}

const GeneratedData& FakeDatasetBuilder::data() const { return m_data; }

int FakeDatasetBuilder::createTypeTree(const TypeTreeHyperParams& params) {
    const int rootTypeId = m_objectTypeGenerator.createTypeTree(m_data, params);
    m_eventTypeGenerator.ensureMandatoryEventTypes(m_data);
    return rootTypeId;
}

int FakeDatasetBuilder::createObjectTreeFromTypeRoot(int rootTypeId, const ObjectTreeHyperParams& params) {
    return m_objectGenerator.createObjectTreeFromTypeRoot(m_data, rootTypeId, params);
}

std::vector<int> FakeDatasetBuilder::createInstanceTreesFromObjectRoot(int rootObjectId,
                                                                       const InstanceTreeHyperParams& params) {
    return m_instanceGenerator.createInstanceTreesFromObjectRoot(m_data, rootObjectId, params);
}

void FakeDatasetBuilder::createEventsForAllInstances(const EventGenerationHyperParams& params) {
    m_eventGenerator.createEventsForAllInstances(m_data, params);
}

const GeneratedData& FakeDatasetBuilder::buildDataset(const FakeDataHyperParams& params) {
    clear();
    m_rng.seed(m_seed);

    if (params.typeRootCount == 0U) {
        throw std::invalid_argument("FakeDataHyperParams.typeRootCount must be >= 1");
    }

    for (std::uint32_t typeTreeIndex = 0U; typeTreeIndex < params.typeRootCount; ++typeTreeIndex) {
        (void)typeTreeIndex;
        const int rootTypeId = createTypeTree(params.typeTree);
        const int rootObjectId = createObjectTreeFromTypeRoot(rootTypeId, params.objectTree);
        createInstanceTreesFromObjectRoot(rootObjectId, params.instanceTree);
    }

    createEventsForAllInstances(params.eventGeneration);
    return m_data;
}

const std::vector<MandatoryEventTypeSpec>& FakeDatasetBuilder::mandatoryEventTypes() {
    return EventTypeGenerator::mandatoryEventTypes();
}
}  // namespace reliability_calculator::fake_generators
