# YamlNode

## Source

- `Source/Config/Parsers/YamlConfigParser.h`

## Role

`config::YamlNode` является адаптером над `YAML::Node`, который приводит yaml-cpp к интерфейсу `Reflect::NodeLike`.

## Responsibility

- скрыть детали `yaml-cpp`
- дать единый набор операций для рефлексивного парсера:
  - `bool`
  - `isMap()`
  - `isSequence()`
  - `size()`
  - `operator[](key/index)`
  - `keys()`
  - `as<T>()`

## Why it exists

`Reflect::fromNode()` не знает ничего про YAML. Ему нужен только абстрактный `NodeLike` интерфейс. `YamlNode` и является таким bridge object.
