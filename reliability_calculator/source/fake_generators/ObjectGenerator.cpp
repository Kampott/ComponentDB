#include "ObjectGenerator.hpp"

#include <algorithm>
#include <optional>
#include <stdexcept>

namespace reliability_calculator::fake_generators {
ObjectGenerator::ObjectGenerator(std::mt19937& rng, IdAllocator& idAllocator)
    : m_rng(rng)
    , m_idAllocator(idAllocator) {}

int ObjectGenerator::createObjectTreeFromTypeRoot(GeneratedData& data, int rootTypeId,
                                                  const ObjectTreeHyperParams& params) {
    if (!hasType(data, rootTypeId)) {
        throw std::invalid_argument("Unknown rootTypeId in createObjectTreeFromTypeRoot");
    }
    if (params.maxObjectsPerChildType < params.minObjectsPerChildType) {
        throw std::invalid_argument("Invalid ObjectTreeHyperParams object range");
    }

    const int rootObjectId = m_idAllocator.nextObjectId();
    data.objects.push_back(
        {rootObjectId, "Object_" + std::to_string(rootObjectId), rootTypeId, std::nullopt, rootObjectId});
    data.rootObjectIds.push_back(rootObjectId);

    buildObjectsForType(data, rootTypeId, {rootObjectId}, rootObjectId, params);
    return rootObjectId;
}

void ObjectGenerator::buildObjectsForType(GeneratedData& data, int currentTypeId,
                                          const std::vector<int>& parentObjectIds, int rootObjectId,
                                          const ObjectTreeHyperParams& params) {
    std::vector<int> childTypeIds;
    childTypeIds.reserve(8);
    for (const auto& type : data.objectTypes) {
        if (type.parentId.has_value() && *type.parentId == currentTypeId) {
            childTypeIds.push_back(type.id);
        }
    }

    for (int childTypeId : childTypeIds) {
        std::vector<int> createdObjectsForChildType;
        for (int parentObjectId : parentObjectIds) {
            const std::uint32_t objectCount = randomUint(params.minObjectsPerChildType, params.maxObjectsPerChildType);
            for (std::uint32_t objectIndex = 0U; objectIndex < objectCount; ++objectIndex) {
                const int objectId = m_idAllocator.nextObjectId();
                data.objects.push_back(
                    {objectId, "Object_" + std::to_string(objectId), childTypeId, parentObjectId, rootObjectId});
                createdObjectsForChildType.push_back(objectId);
            }
        }

        if (!createdObjectsForChildType.empty()) {
            buildObjectsForType(data, childTypeId, createdObjectsForChildType, rootObjectId, params);
        }
    }
}

std::uint32_t ObjectGenerator::randomUint(std::uint32_t low, std::uint32_t high) {
    if (low > high) {
        throw std::invalid_argument("randomUint low must be <= high");
    }
    std::uniform_int_distribution<std::uint32_t> distribution(low, high);
    return distribution(m_rng);
}

bool ObjectGenerator::hasType(const GeneratedData& data, int typeId) {
    return std::any_of(data.objectTypes.begin(), data.objectTypes.end(),
                       [typeId](const schemas::ObjectType& type) { return type.id == typeId; });
}
}  // namespace reliability_calculator::fake_generators
