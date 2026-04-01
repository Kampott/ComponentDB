cmake_minimum_required(VERSION 3.22)

project(reliability_calculator
        VERSION 0.1.0
        DESCRIPTION "Сервис для расчета надежности"
        LANGUAGES CXX
)


set(CMAKE_CXX_STANDARD 20)

add_subdirectory(source/fake_generators)
add_subdirectory(source/main)
