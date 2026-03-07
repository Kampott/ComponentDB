#pragma once
#include <chrono>
#include <string>

namespace reliability_calculator::schemas {
struct Event {
    int id;
    int typeId;
    std::chrono::system_clock::time_point time;
    std::string info;
    int instanceId;
};

struct EventType {
    int id;
    std::string name;
};

struct EventTypeObjectType {
    int eventTypeId;
    int objectTypeId;
};

struct ReplacementEvent {
    int id;
    int eventId;
    int newInstanceId;
};
}  // namespace reliability_calculator::schemas
