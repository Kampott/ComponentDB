#pragma once

#include <yaml-cpp/yaml.h>

#include <expected>
#include <filesystem>
#include <format>
#include <string>
#include <string_view>
#include <vector>

#include "ConfigParser.h"
#include "Reflect/Reflect.h"

namespace config {
class YamlNode {
public:
    explicit YamlNode(const YAML::Node& node) : m_node{node} {}

    explicit operator bool() const noexcept { return m_node.IsDefined() && !m_node.IsNull(); }
    bool isMap() const noexcept { return m_node.IsMap(); }
    bool isSequence() const noexcept { return m_node.IsSequence(); }
    std::size_t size() const { return m_node.size(); }

    YamlNode operator[](std::string_view key) const { return YamlNode{m_node[std::string{key}]}; }
    YamlNode operator[](std::size_t idx) const { return YamlNode{m_node[idx]}; }

    std::vector<std::string> keys() const {
        std::vector<std::string> result;
        result.reserve(m_node.size());
        for (const auto& pair : m_node) {
            result.push_back(pair.first.as<std::string>());
        }
        return result;
    }

    template <typename T>
    T as() const {
        return m_node.as<T>();
    }

private:
    YAML::Node m_node;
};

static_assert(Reflect::NodeLike<YamlNode>);

template <Reflect::Reflectable Config>
class YamlConfigParser : public ConfigParser<Config> {
public:
    explicit YamlConfigParser(std::filesystem::path path) : m_path{std::move(path)} {}

    std::expected<Config, std::string> parse() override {
        try {
            return Reflect::fromNode<Config>(YamlNode{YAML::LoadFile(m_path.string())});
        } catch (const YAML::BadFile& e) {
            return std::unexpected(std::format("Could not open '{}': {}", m_path.string(), e.what()));
        } catch (const YAML::ParserException& e) {
            return std::unexpected(std::format("YAML syntax error in '{}': {}", m_path.string(), e.what()));
        } catch (const YAML::Exception& e) {
            return std::unexpected(std::format("YAML error in '{}': {}", m_path.string(), e.what()));
        }
    }

private:
    std::filesystem::path m_path;
};
}  // namespace config
