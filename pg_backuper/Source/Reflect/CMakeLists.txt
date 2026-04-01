cmake_minimum_required(VERSION 3.22)
project(reflect)

add_library(reflect INTERFACE)
target_include_directories(reflect INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/..)
