#pragma once

#include <optional>
#include <string>

namespace reliability_calculator::schemas {
struct ObjectInstance {
    int id;
    std::string name;
    int objectId;
    std::optional<int> parentId;
    bool isActive;
    int rootId;
};
}  // namespace reliability_calculator::schemas
