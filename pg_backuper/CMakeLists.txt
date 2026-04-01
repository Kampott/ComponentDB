cmake_minimum_required(VERSION 3.22)

project(
    pg_backuper
    VERSION 0.1.0
    DESCRIPTION "Сервис для проведения и организации бэкапов базы данных postgres"
)

enable_testing()

find_package(yaml-cpp REQUIRED)

add_subdirectory(Source/Reflect)
add_subdirectory(Source/Backup)
add_subdirectory(Source/Main)
add_subdirectory(Source/Config)
add_subdirectory(Source/Grpc)
add_subdirectory(Tests)
