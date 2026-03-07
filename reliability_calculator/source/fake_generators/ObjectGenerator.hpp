#pragma once

#include <cstdint>
#include <random>
#include <vector>

#include "FakeDataTypes.hpp"
#include "IdAllocator.hpp"

namespace reliability_calculator::fake_generators {
class ObjectGenerator {
public:
    ObjectGenerator(std::mt19937& rng, IdAllocator& idAllocator);

    int createObjectTreeFromTypeRoot(GeneratedData& data, int rootTypeId, const ObjectTreeHyperParams& params);

private:
    void buildObjectsForType(GeneratedData& data, int currentTypeId, const std::vector<int>& parentObjectIds,
                             int rootObjectId, const ObjectTreeHyperParams& params);

    std::uint32_t randomUint(std::uint32_t low, std::uint32_t high);

    static bool hasType(const GeneratedData& data, int typeId);

    std::mt19937& m_rng;
    IdAllocator& m_idAllocator;
};
}  // namespace reliability_calculator::fake_generators
