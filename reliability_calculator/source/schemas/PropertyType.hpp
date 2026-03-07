#pragma once
#include <optional>
#include <string>

namespace reliability_calculator::schemas {
struct PropertyType {
    int id;
    int typeId;
    bool isStatic;
    std::string name;
};

struct PropertyTypeAdd {
    int typeId;
    bool isStatic;
    std::string name;
};

struct PropertyTypeUpdate {
    std::optional<bool> isStatic;
    std::optional<std::string> name;
};
}  // namespace reliability_calculator::schemas
