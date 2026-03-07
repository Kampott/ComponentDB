#pragma once
#include <optional>
#include <string>

namespace reliability_calculator::schemas {
struct Property {
    int id;
    int propertyId;
    std::string value;
    int objectId;
};

struct PropertyAdd {
    int propertyId;
    std::string value;
    int objectId;
};

struct PropertyUpdate {
    std::optional<std::string> value;
};
}  // namespace reliability_calculator::schemas
