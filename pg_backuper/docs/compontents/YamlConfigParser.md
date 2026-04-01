# YamlConfigParser

## Source

- `Source/Config/Parsers/YamlConfigParser.h`

## Role

`config::YamlConfigParser<Config>` читает YAML-файл и превращает его в strongly-typed `config::Config`.

## Responsibility

- загрузить YAML из файла
- передать корневой `YamlNode` в `Reflect::fromNode<Config>()`
- превратить ошибки yaml-cpp в текстовые ошибки сервиса

## Main API

- constructor: `YamlConfigParser(std::filesystem::path path)`
- `parse()`

## Error handling

Класс отдельно обрабатывает:

- `YAML::BadFile`
- `YAML::ParserException`
- общий `YAML::Exception`

## Notes

- Парсер не делает частичную загрузку.
- Если хотя бы одно поле структуры отсутствует или не парсится, возвращается `unexpected(error)`.
