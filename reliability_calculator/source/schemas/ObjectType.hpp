#pragma once
#include <optional>
#include <string>

namespace reliability_calculator::schemas {
struct ObjectType {
    int id;
    std::string name;
    std::optional<int> parentId;
    int rootId;
};
}  // namespace reliability_calculator::schemas
