#pragma once

#include <random>
#include <string>

#include "FakeDataTypes.hpp"
#include "IdAllocator.hpp"

namespace reliability_calculator::fake_generators {
class EventGenerator {
public:
    EventGenerator(std::mt19937& rng, IdAllocator& idAllocator);

    void createEventsForAllInstances(GeneratedData& data, const EventGenerationHyperParams& params);

private:
    static double windowDays(const EventGenerationHyperParams& params);

    int eventTypeIdByName(const GeneratedData& data, const std::string& name) const;

    std::mt19937& m_rng;
    IdAllocator& m_idAllocator;
};
}  // namespace reliability_calculator::fake_generators
