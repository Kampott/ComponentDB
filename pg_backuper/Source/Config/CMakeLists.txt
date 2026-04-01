cmake_minimum_required(VERSION 3.22)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

project(config)

file(GLOB_RECURSE SOURCE_FILES CONFIGURE_DEPENDS *.cpp *.h *.hpp)

add_library(${PROJECT_NAME} ${SOURCE_FILES})

find_package(yaml-cpp REQUIRED)

target_link_libraries(${PROJECT_NAME} PUBLIC
        reflect
        yaml-cpp::yaml-cpp
)

target_include_directories(${PROJECT_NAME} PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
