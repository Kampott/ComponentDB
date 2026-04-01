FROM ubuntu:24.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    git \
    ninja-build \
    pkg-config \
    unzip \
    zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt

RUN git clone https://github.com/microsoft/vcpkg.git /opt/vcpkg \
    && /opt/vcpkg/bootstrap-vcpkg.sh -disableMetrics

ENV VCPKG_ROOT=/opt/vcpkg

WORKDIR /src

COPY vcpkg.json vcpkg-configuration.json CMakeLists.txt CMakePresets.json ./
COPY Source ./Source
COPY protos ./protos
COPY config.example.yaml ./config.example.yaml
COPY generate_proto_files.sh ./generate_proto_files.sh

RUN cmake --preset release \
    && cmake --build --preset build-release


FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libgcc-s1 \
    libstdc++6 \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /src/build/release/Source/Main/pg_backuper /app/pg_backuper
COPY --from=builder /src/config.example.yaml /app/config.yaml

CMD ["/app/pg_backuper", "/app/config.yaml"]
