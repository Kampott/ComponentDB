cmake_minimum_required(VERSION 3.22)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

project(pg_backuper)

file(GLOB_RECURSE SOURCE_FILES CONFIGURE_DEPENDS *.cpp *.h *.hpp)

add_executable(${PROJECT_NAME} ${SOURCE_FILES})

target_link_libraries(${PROJECT_NAME} PRIVATE config)
target_link_libraries(${PROJECT_NAME} PRIVATE grpc_backup_service)
