# ConfigParser

## Source

- `Source/Config/Parsers/ConfigParser.h`

## Role

`config::ConfigParser<Config>` задает абстрактный интерфейс для любого парсера конфигурации.

## Responsibility

- вернуть либо полностью заполненный конфиг, либо текст ошибки

## Main API

- `parse() -> std::expected<Config, std::string>`

## Notes

- Это template interface с ограничением `Reflect::Reflectable`.
- Текущая реализация в проекте только одна: `YamlConfigParser<Config>`.
