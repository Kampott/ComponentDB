#include "InstanceGenerator.hpp"

#include <algorithm>
#include <stdexcept>
#include <unordered_map>

namespace reliability_calculator::fake_generators {
InstanceGenerator::InstanceGenerator(IdAllocator& idAllocator) : m_idAllocator(idAllocator) {}

std::vector<int> InstanceGenerator::createInstanceTreesFromObjectRoot(GeneratedData& data, int rootObjectId,
                                                                      const InstanceTreeHyperParams& params) {
    if (!hasObject(data, rootObjectId)) {
        throw std::invalid_argument("Unknown rootObjectId in createInstanceTreesFromObjectRoot");
    }
    if (params.treesPerObjectRoot == 0U) {
        throw std::invalid_argument("InstanceTreeHyperParams.treesPerObjectRoot must be >= 1");
    }

    std::unordered_map<int, std::vector<int> > objectChildren;
    for (const auto& object : data.objects) {
        if (object.rootId != rootObjectId || !object.parentId.has_value()) {
            continue;
        }
        objectChildren[*object.parentId].push_back(object.id);
    }

    std::vector<int> createdRootIds;
    createdRootIds.reserve(static_cast<std::size_t>(params.treesPerObjectRoot));

    for (std::uint32_t treeNumber = 0U; treeNumber < params.treesPerObjectRoot; ++treeNumber) {
        (void)treeNumber;
        const int rootInstanceId = m_idAllocator.nextInstanceId();
        data.instances.push_back({rootInstanceId, "Instance_root_" + std::to_string(rootInstanceId), rootObjectId,
                                  std::nullopt, true, rootInstanceId});
        data.rootInstanceIds.push_back(rootInstanceId);
        createdRootIds.push_back(rootInstanceId);

        std::unordered_map<int, int> objectToInstance;
        objectToInstance[rootObjectId] = rootInstanceId;

        std::vector<int> objectQueue{rootObjectId};
        for (std::size_t i = 0; i < objectQueue.size(); ++i) {
            const int currentObjectId = objectQueue[i];
            const int parentInstanceId = objectToInstance[currentObjectId];

            auto childrenIt = objectChildren.find(currentObjectId);
            if (childrenIt == objectChildren.end()) {
                continue;
            }

            for (int childObjectId : childrenIt->second) {
                const int instanceId = m_idAllocator.nextInstanceId();
                data.instances.push_back({instanceId, "Instance_" + std::to_string(instanceId), childObjectId,
                                          parentInstanceId, true, rootInstanceId});
                objectToInstance[childObjectId] = instanceId;
                objectQueue.push_back(childObjectId);
            }
        }
    }

    return createdRootIds;
}
bool InstanceGenerator::hasObject(const GeneratedData& data, int objectId) {
    return std::any_of(data.objects.begin(), data.objects.end(),
                       [objectId](const schemas::Object& object) { return object.id == objectId; });
}
}  // namespace reliability_calculator::fake_generators
