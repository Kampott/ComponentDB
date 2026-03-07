#pragma once
#include <optional>
#include <string>

namespace reliability_calculator::schemas {
struct InstanceProperty {
    int id;
    std::string value;
    int instanceId;
};
}  // namespace reliability_calculator::schemas
