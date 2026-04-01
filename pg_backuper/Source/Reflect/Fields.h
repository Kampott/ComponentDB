#pragma once

#include <string_view>

namespace Reflect {

// Дескриптор поля: имя в конфиге + указатель на член структуры
template <typename Struct, typename FieldType>
struct Field {
    std::string_view name;
    FieldType Struct::* ptr;
};

template <typename Struct, typename FieldType>
constexpr auto field(std::string_view name, FieldType Struct::* ptr) -> Field<Struct, FieldType> {
    return {name, ptr};
}

// Концепт: тип рефлективен, если у него есть статический метод fields()
// возвращающий std::tuple<Field<...>, ...>
template <typename T>
concept Reflectable = requires { T::fields(); };

}  // namespace Reflect
