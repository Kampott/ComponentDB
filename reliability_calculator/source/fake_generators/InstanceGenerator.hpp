#pragma once

#include <cstdint>
#include <vector>

#include "FakeDataTypes.hpp"
#include "IdAllocator.hpp"

namespace reliability_calculator::fake_generators {
class InstanceGenerator {
public:
    explicit InstanceGenerator(IdAllocator& idAllocator);

    std::vector<int> createInstanceTreesFromObjectRoot(GeneratedData& data, int rootObjectId,
                                                       const InstanceTreeHyperParams& params);

private:
    static bool hasObject(const GeneratedData& data, int objectId);

    IdAllocator& m_idAllocator;
};
}  // namespace reliability_calculator::fake_generators
