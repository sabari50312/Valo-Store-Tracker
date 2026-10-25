# Android build environment: Node 24 and JDK 17, matching the release workflow.
# Only the SDK's command-line tools are baked in; the SDK itself (platforms,
# build tools, NDK) lives in the valstore-sdk volume, which Gradle fills on the
# first build.
FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-17-jdk-headless unzip curl rsync ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV ANDROID_HOME=/sdk \
    CMDLINE_TOOLS=/opt/cmdline-tools/latest/bin \
    CI=1

RUN mkdir -p /opt/cmdline-tools \
 && curl -fsSL -o /tmp/tools.zip https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip \
 && unzip -q /tmp/tools.zip -d /opt/cmdline-tools \
 && mv /opt/cmdline-tools/cmdline-tools /opt/cmdline-tools/latest \
 && rm /tmp/tools.zip

COPY build.sh /build.sh
ENTRYPOINT ["bash", "/build.sh"]
