#pragma once

#include <cstdint>
#include <random>
#include <vector>

#include "FakeDataTypes.hpp"
#include "IdAllocator.hpp"

namespace reliability_calculator::fake_generators {
class ObjectTypeGenerator {
public:
    ObjectTypeGenerator(std::mt19937& rng, IdAllocator& idAllocator);

    int createTypeTree(GeneratedData& data, const TypeTreeHyperParams& params);

private:
    std::uint32_t randomUint(std::uint32_t low, std::uint32_t high);

    std::mt19937& m_rng;
    IdAllocator& m_idAllocator;
};
}  // namespace reliability_calculator::fake_generators
