#pragma once

#include <concepts>
#include <expected>
#include <format>
#include <map>
#include <optional>
#include <string>
#include <type_traits>
#include <vector>

#include "Fields.h"
#include "Node.h"

namespace Reflect {

template <typename T>
struct IsStringMap : std::false_type {};

template <typename Value>
struct IsStringMap<std::map<std::string, Value>> : std::true_type {
    using value_type = Value;
};

template <typename T>
struct IsVector : std::false_type {};

template <typename V>
struct IsVector<std::vector<V>> : std::true_type {
    using value_type = V;
};

// Рекурсивно парсит узел N в тип T.
// Порядок dispatch:
//   1. Reflectable<T> итерируем по T::fields()
//   2. std::map<std::string,V> итерируем ключи через node.keys()
//   3. std::vector<V> итерируем по индексу
//   4. Всё остальное делегируем node.as<T>() (реализует обёртка)
template <typename DestType, NodeLike Node>
auto fromNode(const Node& node) -> std::expected<DestType, std::string> {
    if constexpr (Reflectable<DestType>) {
        if (!node || !node.isMap()) {
            return std::unexpected{"Expected a mapping"};
        }

        DestType result{};
        std::optional<std::string> error;

        std::apply(
            [&](auto&&... fields) {
                (
                    [&] {
                        if (error) {
                            return;
                        }

                        using FieldType = std::remove_cvref_t<decltype(result.*(fields.ptr))>;
                        const auto key = std::string{fields.name};
                        const auto child = node[fields.name];

                        if (!child) {
                            error = std::format("Missing required field '{}'", key);
                            return;
                        }

                        auto value = fromNode<FieldType>(child);
                        if (value) {
                            result.*(fields.ptr) = std::move(*value);
                        } else {
                            error = std::format("In field '{}': {}", key, value.error());
                        }
                    }(),
                    ...);
            },
            DestType::fields());

        if (error) return std::unexpected{std::move(*error)};
        return result;

    } else if constexpr (IsStringMap<DestType>::value) {
        using V = typename IsStringMap<DestType>::value_type;

        if (!node || !node.isMap()) {
            return std::unexpected{"Expected a mapping for std::map"};
        }

        DestType result;
        for (const auto& key : node.keys()) {
            auto val = fromNode<V>(node[std::string_view{key}]);
            if (!val) return std::unexpected(std::format("In map entry '{}': {}", key, val.error()));
            result[key] = std::move(*val);
        }
        return result;

    } else if constexpr (IsVector<DestType>::value) {
        using V = typename IsVector<DestType>::value_type;

        if (!node || !node.isSequence()) {
            return std::unexpected("Expected a sequence for std::vector");
        }

        DestType result;
        result.reserve(node.size());
        for (std::size_t i = 0; i < node.size(); ++i) {
            auto val = fromNode<V>(node[i]);
            if (!val) return std::unexpected(std::format("In sequence[{}]: {}", i, val.error()));
            result.push_back(std::move(*val));
        }
        return result;

    } else {
        // Делегируем конкретной обёртке: YamlNode::as<T>, JsonNode::as<T>, ...
        try {
            return node.template as<DestType>();
        } catch (const std::exception& e) {
            return std::unexpected(std::format("Scalar parse error: {}", e.what()));
        }
    }
}

// Рекурсивно преобразует значение T в строку, используя fields() для обхода.
// Порядок dispatch зеркален fromNode:
//   1. Reflectable<T> обходим T::fields()
//   2. std::map<std::string,V> перечисляем пары ключ/значение
//   3. std::vector<V> перечисляем элементы
//   4. std::string оборачиваем в кавычки
//   5. Всё остальное std::format("{}", value)
template <typename T>
std::string toString(const T& value, std::size_t depth = 0) {
    const auto indent = std::string(depth * 2, ' ');
    const auto childIndent = std::string((depth + 1) * 2, ' ');

    if constexpr (Reflectable<T>) {
        std::string result = "{\n";
        std::apply(
            [&](auto&&... fields) {
                (
                    [&] {
                        using FieldType = std::remove_cvref_t<decltype(value.*(fields.ptr))>;
                        result += std::format("{}{}: {}\n", childIndent, fields.name,
                                              toString(value.*(fields.ptr), depth + 1));
                    }(),
                    ...);
            },
            T::fields());
        result += indent + "}";
        return result;

    } else if constexpr (IsStringMap<T>::value) {
        std::string result = "{\n";
        for (const auto& [key, val] : value) {
            result += std::format("{}{}: {}\n", childIndent, key, toString(val, depth + 1));
        }
        result += indent + "}";
        return result;

    } else if constexpr (IsVector<T>::value) {
        std::string result = "[\n";
        for (const auto& item : value) {
            result += std::format("{}{}\n", childIndent, toString(item, depth + 1));
        }
        result += indent + "]";
        return result;

    } else if constexpr (std::same_as<T, std::string>) {
        return std::format("\"{}\"", value);

    } else {
        return std::format("{}", value);
    }
}

}  // namespace Reflect
