#pragma once

#include <concepts>
#include <cstddef>
#include <string_view>

namespace Reflect {
// Концепт для узла дерева данных.
// Описывает только структурную навигацию без знания о конкретном формате.
// Скалярное преобразование (as<T>()) - неформальное требование, проверяется
// в точке инстанцирования from_node.
template <typename Node>
concept NodeLike = requires(const Node& node, std::string_view key, std::size_t index) {
    { static_cast<bool>(node) } -> std::convertible_to<bool>;
    { node.isMap() } -> std::convertible_to<bool>;
    { node.isSequence() } -> std::convertible_to<bool>;
    { node.size() } -> std::convertible_to<std::size_t>;
    { node[key] } -> std::same_as<Node>;
    { node[index] } -> std::same_as<Node>;
    { node.keys() };
};
}  // namespace Reflect
