#pragma once

#include <cstdint>
#include <map>
#include <string>

#include "Reflect/Fields.h"

namespace config {
struct GrpcSettings {
    std::string host;
    std::uint16_t port;

    static consteval auto fields() {
        return std::tuple{
            Reflect::field("host", &GrpcSettings::host),
            Reflect::field("port", &GrpcSettings::port),
        };
    }
};

struct DatabaseSettings {
    std::string schema;
    std::string user;
    std::string password;
    std::string host;
    std::uint16_t port;

    static consteval auto fields() {
        return std::tuple{
            Reflect::field("schema", &DatabaseSettings::schema),     Reflect::field("user", &DatabaseSettings::user),
            Reflect::field("password", &DatabaseSettings::password), Reflect::field("host", &DatabaseSettings::host),
            Reflect::field("port", &DatabaseSettings::port),
        };
    }
};

struct BackupRuntimeSettings {
    std::string sqlitePath{"data/backups.sqlite"};
    std::string storageRoot{"data/storage"};
    std::string pgBasebackupPath{"pg_basebackup"};

    static consteval auto fields() {
        return std::tuple{
            Reflect::field("sqlitePath", &BackupRuntimeSettings::sqlitePath),
            Reflect::field("storageRoot", &BackupRuntimeSettings::storageRoot),
            Reflect::field("pgBasebackupPath", &BackupRuntimeSettings::pgBasebackupPath),
        };
    }
};

struct Config {
    GrpcSettings grpc;
    BackupRuntimeSettings backup;
    std::map<std::string, DatabaseSettings> databases;

    static consteval auto fields() {
        return std::tuple{
            Reflect::field("grpc", &Config::grpc),
            Reflect::field("backup", &Config::backup),
            Reflect::field("databases", &Config::databases),
        };
    }
};
}  // namespace config
