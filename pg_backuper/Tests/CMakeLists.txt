cmake_minimum_required(VERSION 3.22)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

project(pg_backuper_tests)

find_package(GTest CONFIG REQUIRED)

add_executable(local_file_storage_tests
        LocalFileStorageTests.cpp
)

target_link_libraries(local_file_storage_tests PRIVATE
        backup
        GTest::gtest_main
)

add_executable(sqlite_backup_data_store_tests
        SqliteBackupDataStoreTests.cpp
)

target_link_libraries(sqlite_backup_data_store_tests PRIVATE
        backup
        GTest::gtest_main
)

add_executable(full_physical_backup_tests
    FullPhysicalBackupTests.cpp
)

target_link_libraries(full_physical_backup_tests PRIVATE
    backup
    GTest::gtest_main
)

add_executable(active_backup_manager_tests
    ActiveBackupManagerTests.cpp
)

target_link_libraries(active_backup_manager_tests PRIVATE
    backup
    GTest::gtest_main
)

add_executable(backup_grpc_service_tests
    BackupGrpcServiceTests.cpp
)

target_link_libraries(backup_grpc_service_tests PRIVATE
    grpc_backup_service
    GTest::gtest_main
)

add_executable(schedule_manager_tests
    ScheduleManagerTests.cpp
)

target_link_libraries(schedule_manager_tests PRIVATE
    backup
    GTest::gtest_main
)

include(GoogleTest)
gtest_discover_tests(local_file_storage_tests)
gtest_discover_tests(sqlite_backup_data_store_tests)
gtest_discover_tests(full_physical_backup_tests)
gtest_discover_tests(active_backup_manager_tests)
gtest_discover_tests(backup_grpc_service_tests)
gtest_discover_tests(schedule_manager_tests)
