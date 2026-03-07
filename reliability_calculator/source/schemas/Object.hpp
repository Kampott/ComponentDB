#pragma once
#include <optional>
#include <string>

namespace reliability_calculator::schemas {
struct Object {
    int id;
    std::string name;
    int typeId;
    std::optional<int> parentId;
    int rootId;
};
}  // namespace reliability_calculator::schemas
