#pragma once
#include <expected>
#include <string>

#include "Reflect/Fields.h"

namespace config {
template <Reflect::Reflectable Config>
class ConfigParser {
public:
    virtual ~ConfigParser() = default;

    virtual std::expected<Config, std::string> parse() = 0;
};
}  // namespace config
