#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <string>
#include <ctime>

#include "fake_generators/FakeDatasetBuilder.hpp"
#include "reliability/ReliabilityCalculator.hpp"

int main() {
    constexpr std::uint32_t seed = 123;
    const auto now = std::chrono::system_clock::now();

    const reliability_calculator::fake_generators::FakeDataHyperParams params{
        .typeRootCount = 1,
        .typeTree =
            {
                .depth = 3,
                .minChildrenPerType = 1,
                .maxChildrenPerType = 2,
            },
        .objectTree =
            {
                .minObjectsPerChildType = 1,
                .maxObjectsPerChildType = 3,
            },
        .instanceTree =
            {
                .treesPerObjectRoot = 20,
            },
        .eventGeneration =
            {
                .startTime = now - std::chrono::hours(24 * 365),
                .window = std::chrono::hours(24 * 365),
                .baseFailureRatePerDay = 0.0001,
                .depthFailureRateFactor = 1.2,
                .preventiveRateFactor = 0.5,
                .inspectionRatePerDay = 0.01,
                .maintenanceRatePerDay = 0.005,
            },
    };

    const auto toLocalTimeString = [](const std::chrono::system_clock::time_point timePoint) {
        const std::time_t rawTime = std::chrono::system_clock::to_time_t(timePoint);
        const std::tm timeInfo = *std::localtime(&rawTime);
        std::ostringstream buffer;
        buffer << std::put_time(&timeInfo, "%Y-%m-%d %H:%M:%S");
        return buffer.str();
    };

    std::cout << "Configured hyperparameters\n";
    std::cout << "seed: " << seed << '\n';
    std::cout << "typeRootCount: " << params.typeRootCount << '\n';
    std::cout << "typeTree.depth: " << params.typeTree.depth << '\n';
    std::cout << "typeTree.minChildrenPerType: " << params.typeTree.minChildrenPerType << '\n';
    std::cout << "typeTree.maxChildrenPerType: " << params.typeTree.maxChildrenPerType << '\n';
    std::cout << "objectTree.minObjectsPerChildType: " << params.objectTree.minObjectsPerChildType << '\n';
    std::cout << "objectTree.maxObjectsPerChildType: " << params.objectTree.maxObjectsPerChildType << '\n';
    std::cout << "instanceTree.treesPerObjectRoot: " << params.instanceTree.treesPerObjectRoot << '\n';
    std::cout << "eventGeneration.startTime: " << toLocalTimeString(params.eventGeneration.startTime) << '\n';
    std::cout << "eventGeneration.windowHours: " << params.eventGeneration.window.count() << '\n';
    std::cout << "eventGeneration.baseFailureRatePerDay: " << params.eventGeneration.baseFailureRatePerDay << '\n';
    std::cout << "eventGeneration.depthFailureRateFactor: " << params.eventGeneration.depthFailureRateFactor << '\n';
    std::cout << "eventGeneration.preventiveRateFactor: " << params.eventGeneration.preventiveRateFactor << '\n';
    std::cout << "eventGeneration.inspectionRatePerDay: " << params.eventGeneration.inspectionRatePerDay << '\n';
    std::cout << "eventGeneration.maintenanceRatePerDay: " << params.eventGeneration.maintenanceRatePerDay << "\n\n";

    reliability_calculator::fake_generators::FakeDatasetBuilder builder(seed);
    const auto& data = builder.buildDataset(params);
    const auto inactiveInstances = std::count_if(data.instances.begin(), data.instances.end(),
                                                 [](const auto& instance) { return !instance.isActive; });

    std::cout << "Generated in-memory fake dataset\n";
    std::cout << "ObjectType count: " << data.objectTypes.size() << '\n';
    std::cout << "Object count: " << data.objects.size() << '\n';
    std::cout << "Instance count: " << data.instances.size() << '\n';
    std::cout << "EventType count: " << data.eventTypes.size() << '\n';
    std::cout << "EventType-ObjectType links: " << data.eventTypeObjectTypes.size() << '\n';
    std::cout << "Event count: " << data.events.size() << '\n';
    std::cout << "ReplacementEvent count: " << data.replacementEvents.size() << '\n';
    std::cout << "Inactive instance count: " << inactiveInstances << '\n';

    if (!data.rootObjectIds.empty()) {
        const int rootObjectId = data.rootObjectIds.front();
        const auto reliabilityResult =
            reliability_calculator::reliability::ReliabilityCalculator::calculateForRootObject(
                data, rootObjectId, params.eventGeneration.startTime,
                params.eventGeneration.startTime + params.eventGeneration.window);

        std::cout << "\nReliability for root object " << rootObjectId << '\n';
        std::cout << "Tree lambda (1/day): " << std::fixed << std::setprecision(6) << reliabilityResult.treeLambdaPerDay
                  << '\n';
        if (std::isfinite(reliabilityResult.treeMttfDays)) {
            std::cout << "Tree MTTF (days): " << reliabilityResult.treeMttfDays << '\n';
        } else {
            std::cout << "Tree MTTF (days): inf\n";
        }

        const std::string csvPath = "reliability_report.csv";
        std::ofstream csvFile(csvPath);
        if (csvFile.is_open()) {
            csvFile << "object_id,type_id,failures,operating_days,lambda_per_day,mttf_days\n";
        }

        for (const auto& component : reliabilityResult.components) {
            if (csvFile.is_open()) {
                csvFile << component.objectId << ',' << component.typeId << ',' << component.failureCount << ','
                        << std::fixed << std::setprecision(6) << component.operatingDays << ','
                        << component.lambdaPerDay << ',';
                if (std::isfinite(component.mttfDays)) {
                    csvFile << component.mttfDays;
                } else {
                    csvFile << "inf";
                }
                csvFile << '\n';
            }
        }

        if (csvFile.is_open()) {
            csvFile.close();
            std::cout << "\nCSV saved to: " << csvPath << '\n';
        } else {
            std::cout << "\nFailed to open CSV file for writing: " << csvPath << '\n';
        }
    }

    return 0;
}
