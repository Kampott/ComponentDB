#include "ObjectTypeGenerator.hpp"

#include <optional>
#include <stdexcept>

namespace reliability_calculator::fake_generators {
ObjectTypeGenerator::ObjectTypeGenerator(std::mt19937& rng, IdAllocator& idAllocator)
    : m_rng(rng)
    , m_idAllocator(idAllocator) {}

int ObjectTypeGenerator::createTypeTree(GeneratedData& data, const TypeTreeHyperParams& params) {
    if (params.depth == 0U) {
        throw std::invalid_argument("TypeTreeHyperParams.depth must be >= 1");
    }
    if (params.maxChildrenPerType < params.minChildrenPerType) {
        throw std::invalid_argument("Invalid TypeTreeHyperParams children range");
    }

    const int rootTypeId = m_idAllocator.nextTypeId();
    data.objectTypes.push_back({rootTypeId, "Type_" + std::to_string(rootTypeId), std::nullopt, rootTypeId});
    data.rootTypeIds.push_back(rootTypeId);

    std::vector<int> currentLevel{rootTypeId};
    for (std::uint32_t depth = 1U; depth < params.depth; ++depth) {
        std::vector<int> nextLevel;
        for (int parentTypeId : currentLevel) {
            const std::uint32_t childCount = randomUint(params.minChildrenPerType, params.maxChildrenPerType);
            for (std::uint32_t index = 0U; index < childCount; ++index) {
                const int childTypeId = m_idAllocator.nextTypeId();
                data.objectTypes.push_back(
                    {childTypeId, "Type_" + std::to_string(childTypeId), parentTypeId, rootTypeId});
                nextLevel.push_back(childTypeId);
            }
        }
        currentLevel = nextLevel;
    }

    return rootTypeId;
}

std::uint32_t ObjectTypeGenerator::randomUint(std::uint32_t low, std::uint32_t high) {
    if (low > high) {
        throw std::invalid_argument("randomUint low must be <= high");
    }
    std::uniform_int_distribution<std::uint32_t> distribution(low, high);
    return distribution(m_rng);
}
}  // namespace reliability_calculator::fake_generators
