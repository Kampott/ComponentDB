#pragma once

#include <chrono>
#include <cstdint>
#include <string>
#include <vector>

#include "schemas/Event.hpp"
#include "schemas/Object.hpp"
#include "schemas/ObjectInstance.hpp"
#include "schemas/ObjectType.hpp"

namespace reliability_calculator::fake_generators {
struct MandatoryEventTypeSpec {
    std::string name;
    bool isReplacement;
    bool countsAsFailure;
};

struct EventTypeMeta {
    int eventTypeId;
    bool isReplacement;
    bool countsAsFailure;
};

struct TypeTreeHyperParams {
    /// Количество уровней дерева типов включая корень должно быть >= 1
    std::uint32_t depth;
    /// Минимальное число дочерних типов для каждого нелистового узла должно быть <= maxChildrenPerType
    std::uint32_t minChildrenPerType;
    /// Максимальное число дочерних типов для каждого нелистового узла должно быть >= minChildrenPerType
    std::uint32_t maxChildrenPerType;
};

struct ObjectTreeHyperParams {
    /// Минимальное число объектов каждого дочернего типа под каждым родительским объектом должно быть <=
    /// maxObjectsPerChildType
    std::uint32_t minObjectsPerChildType;
    /// Максимальное число объектов каждого дочернего типа под каждым родительским объектом должно быть >=
    /// minObjectsPerChildType
    std::uint32_t maxObjectsPerChildType;
};

struct InstanceTreeHyperParams {
    /// Количество полных деревьев экземпляров для каждого корневого дерева объектов должно быть >= 1
    std::uint32_t treesPerObjectRoot;
};

struct EventGenerationHyperParams {
    /// Временная метка начала окна генерации синтетических событий включительно
    std::chrono::system_clock::time_point startTime;
    /// Длительность окна генерации событий должна быть > 0
    std::chrono::hours window;
    /// Базовая пуассоновская интенсивность событий отказной замены на день для глубины 0
    double baseFailureRatePerDay;
    /// Мультипликативный коэффициент интенсивности отказов на каждый уровень глубины
    double depthFailureRateFactor;
    /// Отношение среднего числа профилактических замен к среднему числу отказных замен
    double preventiveRateFactor;
    /// Пуассоновская интенсивность событий инспекции на день для одного экземпляра
    double inspectionRatePerDay;
    /// Пуассоновская интенсивность событий обслуживания на день для одного экземпляра
    double maintenanceRatePerDay;
};

struct FakeDataHyperParams {
    /// Число независимых корневых деревьев типов для генерации должно быть >= 1
    std::uint32_t typeRootCount;
    /// Гиперпараметры генерации дерева типов объектов
    TypeTreeHyperParams typeTree;
    /// Гиперпараметры генерации дерева объектов из дерева типов
    ObjectTreeHyperParams objectTree;
    /// Гиперпараметры генерации деревьев экземпляров
    InstanceTreeHyperParams instanceTree;
    /// Гиперпараметры генерации потока событий
    EventGenerationHyperParams eventGeneration;
};

struct GeneratedData {
    std::vector<schemas::ObjectType> objectTypes;
    std::vector<schemas::Object> objects;
    std::vector<schemas::ObjectInstance> instances;

    std::vector<schemas::EventType> eventTypes;
    std::vector<EventTypeMeta> eventTypeMeta;
    std::vector<schemas::EventTypeObjectType> eventTypeObjectTypes;

    std::vector<schemas::Event> events;
    std::vector<schemas::ReplacementEvent> replacementEvents;

    std::vector<int> rootTypeIds;
    std::vector<int> rootObjectIds;
    std::vector<int> rootInstanceIds;
};
}  // namespace reliability_calculator::fake_generators
