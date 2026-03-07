file(GLOB_RECURSE SOURCE_FILES CONFIGURE_DEPENDS *.cpp *.hpp)

add_library(fake_generators STATIC ${SOURCE_FILES})
target_include_directories(fake_generators PUBLIC ${PROJECT_SOURCE_DIR}/source)
