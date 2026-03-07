#pragma once

#include <chrono>
#include <cstdint>
#include <limits>
#include <string>
#include <vector>

#include "fake_generators/FakeDataTypes.hpp"

namespace reliability_calculator::reliability {

struct ComponentReliability {
    int objectId;
    int typeId;
    std::string objectName;
    std::uint64_t failureCount;
    double operatingDays;
    double lambdaPerDay;
    double mttfDays;
};

struct RootReliabilityResult {
    int rootObjectId;
    std::chrono::system_clock::time_point analysisStart;
    std::chrono::system_clock::time_point analysisEnd;
    std::vector<ComponentReliability> components;
    double treeLambdaPerDay;
    double treeMttfDays;
};

class ReliabilityCalculator {
public:
    static RootReliabilityResult calculateForRootObject(const fake_generators::GeneratedData& data, int rootObjectId,
                                                        std::chrono::system_clock::time_point analysisStart,
                                                        std::chrono::system_clock::time_point analysisEnd);
};

}  // namespace reliability_calculator::reliability
